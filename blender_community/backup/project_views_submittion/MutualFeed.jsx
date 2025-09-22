// File: project_views_submittion/MutualFeed.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./css/mutual_feed.css";




const MutualFeed = () => {
  const [feed, setFeed] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const viewTimers = useRef({});

  const fetchFeed = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/mutual/projects");
      setFeed(res.data || []);
    } catch (err) {
      console.error("Failed to load feed", err);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const postId = feed[activeIndex]?._id;
      if (postId && !viewTimers.current[postId]) {
        axios.post(`http://localhost:5000/api/projects/view/${postId}`);
        viewTimers.current[postId] = true;
      }
    }, 5000); // 5s view threshold

    return () => clearTimeout(timer);
  }, [activeIndex, feed]);

  const handleLike = async (projectId) => {
    try {
      await axios.post(`http://localhost:5000/api/projects/like/${projectId}`);
      fetchFeed();
    } catch (err) {
      console.error("Like failed", err);
    }
  };

  const handleComment = async (projectId, comment) => {
    if (!comment) return;
    try {
      await axios.post(`http://localhost:5000/api/projects/comment/${projectId}`, {
        comment,
      });
      fetchFeed();
    } catch (err) {
      console.error("Comment failed", err);
    }
  };

  const handleNextMedia = () => {
    const project = feed[activeIndex];
    if (!project) return;
    const total = project.media.length;
    setMediaIndex((prev) => (prev + 1) % total);
  };

  const handleNextPost = () => {
    setMediaIndex(0);
    setActiveIndex((prev) => (prev + 1) % feed.length);
  };

  const currentPost = feed[activeIndex];

  return (
    <div className="mutual-feed">
      {!currentPost ? (
        <p>Loading mutual projects...</p>
      ) : (
        <div className="project-view">
          {/* Top profile section */}
          <div className="post-user" onClick={() => window.location.href = `/user/${currentPost.ownerId}`}>
            <img src={currentPost.ownerImage || "/default-avatar.png"} alt="" width={40} />
            <span>{currentPost.ownerName}</span>
          </div>

          {/* Project Content */}
          <h3>{currentPost.title}</h3>
          <p>{currentPost.description}</p>

          {/* Media Carousel */}
          <div className="media-carousel">
            {currentPost.media[mediaIndex].type === "image" ? (
              <img src={currentPost.media[mediaIndex].url} alt="" width={300} />
            ) : (
              <video src={currentPost.media[mediaIndex].url} width={300} controls />
            )}
            <button onClick={handleNextMedia}>▶️ Next Media</button>
          </div>

          {/* Actions */}
          <div className="actions">
            <button onClick={() => handleLike(currentPost._id)}>❤️ {currentPost.likes?.length || 0}</button>
            <button onClick={handleNextPost}>➡️ Next Project</button>
            <button onClick={() => navigator.share ? navigator.share({ title: currentPost.title }) : alert("Copy link manually")}>🔗 Share</button>
          </div>

          {/* Comments Section */}
          <div className="comments">
            <h4>Comments</h4>
            {currentPost.comments?.map((c, i) => (
              <p key={i}><strong>{c.user}</strong>: {c.text}</p>
            ))}
            <input
              type="text"
              placeholder="Add a comment..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleComment(currentPost._id, e.target.value);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MutualFeed;
