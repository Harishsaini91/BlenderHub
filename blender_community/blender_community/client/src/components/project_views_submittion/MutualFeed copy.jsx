//................. ✅ FULLY FIXED MutualFeed.jsx – Safe Carousel, No Crashes, Perfect UI
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "assets/styles/components/mutual_feed.css";

const MutualFeed = () => {
  const [feed, setFeed] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [bigPreview, setBigPreview] = useState(null);
  const viewTimers = useRef({});

  const storedUser = JSON.parse(
    localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
  );
  const userId = storedUser._id;

  const fetchFeed = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/mutual/projects?userId=${userId}`
      );
      setFeed(res.data || []);
      setActiveIndex(0);
      setMediaIndex(0);
    } catch (err) {
      console.error("Failed to load feed", err);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Auto-view tracking
  useEffect(() => {
    const timer = setTimeout(() => {
      const postId = feed[activeIndex]?._id;
      if (postId && !viewTimers.current[postId]) {
        axios.post(`http://localhost:5000/api/projects/view/${postId}`);
        viewTimers.current[postId] = true;
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeIndex, feed]);

  // 🛡 SAFE CURRENT POST
  const currentPost = feed[activeIndex] || null;

  if (!currentPost) {
    return <div className="mutual-feed"><p>Loading mutual projects...</p></div>;
  }

  // 🛡 SAFE MEDIA LIST
  const mediaList = currentPost.media || [];
  const totalMedia = mediaList.length;

  // 🛡 If NO media
  if (totalMedia === 0) {
    return (
      <div className="mutual-feed">
        <div className="project-view">
          <div className="post-user">
            <img src={currentPost.ownerImage || "/default-avatar.png"} width={40} />
            <span>{currentPost.ownerName}</span>
          </div>

          <h3>{currentPost.title}</h3>
          <p>{currentPost.description}</p>

          <div className="no-media-box">No media available</div>

          <div className="actions">
            <button
              onClick={() =>
                axios
                  .post(`http://localhost:5000/api/projects/like/${currentPost._id}`)
                  .then(fetchFeed)
              }
            >
              ❤️ {currentPost.likes?.length || 0}
            </button>

            <button onClick={() => {
              setMediaIndex(0);
              setActiveIndex((prev) => (prev + 1) % feed.length);
            }}>
              ➡ Next Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🛡 SAFE INDEX
  const safeIndex = mediaIndex >= totalMedia ? 0 : mediaIndex;

  // 🛡 SAFE selectedMedia
  const selectedMedia = mediaList[safeIndex];
  if (!selectedMedia) return null;

  // SAFE NEXT + PREV
  const nextMedia = () => {
    setMediaIndex((prev) => (prev + 1) % totalMedia);
  };

  const prevMedia = () => {
    setMediaIndex((prev) => (prev === 0 ? totalMedia - 1 : prev - 1));
  };

  const nextPost = () => {
    setMediaIndex(0);
    setActiveIndex((prev) => (prev + 1) % feed.length);
  };

  return (
    <div className="mutual-feed">
      <div className="project-view">

        {/* User Info */}
        <div
          className="post-user"
          onClick={() => (window.location.href = `/user/${currentPost.ownerId}`)}
        >
          <img src={currentPost.ownerImage || "/default-avatar.png"} width={40} />
          <span>{currentPost.ownerName}</span>
        </div>

        {/* Title + Description */}
        <h3>{currentPost.title}</h3>
        <p>{currentPost.description}</p>

        {/* Carousel */}
        <div className="carousel">
          {/* MAIN IMAGE BOX */}
          <div
            className="carousel-display"
            onClick={() => setBigPreview(selectedMedia)}
          >
            {selectedMedia.type === "image" ? (
              <img src={selectedMedia.url} alt="media" />
            ) : (
              <video src={selectedMedia.url} controls />
            )}
          </div>

          {/* CONTROLS BELOW */}
          <div className="carousel-controls">
            <button onClick={prevMedia}>⬅ Prev</button>

            <span className="carousel-counter">
              {safeIndex + 1} / {totalMedia}
            </span>

            <button onClick={nextMedia}>Next ➡</button>
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          <button
            onClick={() =>
              axios
                .post(`http://localhost:5000/api/projects/like/${currentPost._id}`)
                .then(fetchFeed)
            }
          >
            ❤️ {currentPost.likes?.length || 0}
          </button>

          <button onClick={nextPost}>➡ Next Project</button>

          <button
            onClick={() =>
              navigator.share
                ? navigator.share({ title: currentPost.title })
                : alert("Copy link manually")
            }
          >
            🔗 Share
          </button>
        </div>

        {/* Comments */}
        <div className="comments">
          <h4>Comments</h4>
          {currentPost.comments?.map((c, i) => (
            <p key={i}>
              <strong>{c.user}</strong>: {c.text}
            </p>
          ))}

          <input
            type="text"
            placeholder="Add a comment..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                axios
                  .post(
                    `http://localhost:5000/api/projects/comment/${currentPost._id}`,
                    { comment: e.target.value }
                  )
                  .then(fetchFeed);
              }
            }}
          />
        </div>

        {/* BIG Preview */}
        {bigPreview && (
          <div className="big-preview" onClick={() => setBigPreview(null)}>
            {bigPreview.type === "image" ? (
              <img src={bigPreview.url} />
            ) : (
              <video src={bigPreview.url} controls />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MutualFeed;
