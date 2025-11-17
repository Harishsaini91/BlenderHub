// MutualFeed.jsx — Fully Fixed + Full-Mode + Safe + Infinite Scroll
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "assets/styles/components/mutual_feed.css";

const PAGE_SIZE = 20;

const MutualFeed = () => {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || sessionStorage.getItem("user") || "{}"
  );
  const userId = storedUser._id;

  const [pages, setPages] = useState([]); // [[20 posts], [20 posts], ...]
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [mediaIndexMap, setMediaIndexMap] = useState({});
  const [bigPreview, setBigPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fullMode, setFullMode] = useState(false); // <--- NEW

  const loadedIdsRef = useRef(new Set());
  const viewTimers = useRef({});
  const containerRef = useRef(null);

  // ---------------------------
  // Fetch Page Helper
  // ---------------------------
  const fetchPage = async (limit = PAGE_SIZE) => {
    if (!userId) return [];

    setLoading(true);

    try {
      const excludeArray = Array.from(loadedIdsRef.current);
      const excludeParam = excludeArray.length ? excludeArray.join(",") : "";

      const url =
        `/api/mutual/projects?userId=${userId}&limit=${limit}` +
        (excludeParam ? `&exclude=${encodeURIComponent(excludeParam)}` : "");

      const res = await axios.get(url);
      const data = res.data || {};

      // FULL MODE (when backend says total < 50)
      if (data.mode === "FULL") {
        setFullMode(true);

        setPages([data.items]);
        setCurrentPageIdx(0);

        const indexObj = {};
        data.items.forEach((p) => (indexObj[p._id] = 0));

        loadedIdsRef.current = new Set(data.items.map((i) => i._id));
        setMediaIndexMap(indexObj);

        setLoading(false);
        return data.items;
      }

      // PAGED MODE
      const items = data.items || [];
      setLoading(false);
      return items;
    } catch (e) {
      console.error("Feed fetch error:", e);
      setLoading(false);
      return [];
    }
  };

  // ---------------------------
  // Load first page
  // ---------------------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      const items = await fetchPage();

      if (!mounted) return;
      if (!items) return;

      items.forEach((it) => loadedIdsRef.current.add(it._id));
      setPages([items]);

      const idxMap = {};
      items.forEach((i) => (idxMap[i._id] = 0));
      setMediaIndexMap(idxMap);
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // ---------------------------
  // Load NEXT PAGE
  // ---------------------------
  const loadNextPage = async () => {
    if (fullMode) return; // no paging in full-mode

    // use cached page if available
    if (currentPageIdx + 1 < pages.length) {
      setCurrentPageIdx((p) => p + 1);
      return;
    }

    // fetch new page
    const items = await fetchPage();
    if (items.length === 0) return;

    items.forEach((it) => loadedIdsRef.current.add(it._id));

    setPages((prev) => [...prev, items]);
    setCurrentPageIdx((p) => p + 1);

    setMediaIndexMap((prev) => {
      const c = { ...prev };
      items.forEach((i) => (c[i._id] = 0));
      return c;
    });
  };

  // ---------------------------
  // Load PREVIOUS PAGE
  // ---------------------------
  const loadPrevPage = () => {
    if (currentPageIdx === 0) return;
    setCurrentPageIdx((p) => p - 1);
  };

  // ---------------------------
  // Scroll Handler
  // ---------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const top = el.scrollTop;
      const height = el.scrollHeight;
      const view = el.clientHeight;

      // Bottom
      if (top + view >= height - 200) {
        loadNextPage();
      }

      // Top
      if (top < 200) {
        loadPrevPage();
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [pages, currentPageIdx, fullMode]);

  // ---------------------------
  // Safe Visibility View Tracking
  // ---------------------------
  useEffect(() => {
    const checkVisibility = () => {
      const list = pages[currentPageIdx] || [];

      list.forEach((post) => {
        const node = document.getElementById(`post-${post._id}`);
        if (!node) return;

        const rect = node.getBoundingClientRect();
        const vh = window.innerHeight;

        // Middle of element
        const mid = rect.top + rect.height / 2;

        if (mid >= 0 && mid <= vh) {
          if (!viewTimers.current[post._id]) {
            viewTimers.current[post._id] = setTimeout(() => {
              axios.post(`/api/projects/view/${post._id}`);
              viewTimers.current[post._id] = true;
            }, 5000);
          }
        } else {
          if (viewTimers.current[post._id] && typeof viewTimers.current[post._id] !== "boolean") {
            clearTimeout(viewTimers.current[post._id]);
            viewTimers.current[post._id] = null;
          }
        }
      });
    };

    const timer = setInterval(checkVisibility, 500);
    return () => clearInterval(timer);
  }, [pages, currentPageIdx]);

  // ---------------------------
  // Carousel per post
  // ---------------------------
  const nextMedia = (postId, total) => {
    setMediaIndexMap((prev) => ({
      ...prev,
      [postId]: ((prev[postId] || 0) + 1) % total,
    }));
  };

  const prevMedia = (postId, total) => {
    setMediaIndexMap((prev) => ({
      ...prev,
      [postId]: prev[postId] === 0 ? total - 1 : prev[postId] - 1,
    }));
  };

  // ---------------------------
  // Render Page
  // ---------------------------
  const currentPage = pages[currentPageIdx] || [];

  return (
    <div
      ref={containerRef}
      className="mutual-feed"
      style={{ height: "80vh", overflowY: "auto", padding: "12px" }}
    >
      {/* Loading */}
      {loading && currentPage.length === 0 && (
        <p style={{ textAlign: "center" }}>Loading...</p>
      )}

      {/* No Posts */}
      {!loading && currentPage.length === 0 && (
        <p style={{ textAlign: "center" }}>No mutual posts found.</p>
      )}

      {/* Render Posts */}
      {currentPage.length > 0 &&
        currentPage.map((post) => {
          const mediaList = Array.isArray(post.media) ? post.media : [];
          const total = mediaList.length;

          const index = mediaIndexMap[post._id] || 0;
          const safe = index >= total ? 0 : index;
          const media = mediaList[safe];

          return (
            <div
              key={post._id}
              id={`post-${post._id}`}
              className="project-view"
              style={{ marginBottom: "28px" }}
            >
              {/* User */}
              <div
                className="post-user"
                onClick={() => (window.location.href = `/user/${post.ownerId}`)}
              >
                <img src={post.ownerImage} width={40} />
                <span>{post.ownerName}</span>
              </div>

              <h3>{post.title}</h3>
              <p>{post.description}</p>

              {/* Media */}
              {total === 0 ? (
                <div className="no-media-box">No media</div>
              ) : (
                <div className="carousel">
                  <div
                    className="carousel-display"
                    onClick={() => setBigPreview(media)}
                  >
                    {media.type === "image" ? (
                      <img src={media.url} />
                    ) : (
                      <video src={media.url} controls />
                    )}
                  </div>

                  <div className="carousel-controls">
                    <button onClick={() => prevMedia(post._id, total)}>
                      ⬅ Prev
                    </button>
                    <span>
                      {safe + 1} / {total}
                    </span>
                    <button onClick={() => nextMedia(post._id, total)}>
                      Next ➡
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="actions">
                <button
                  onClick={() =>
                    axios
                      .post(`/api/projects/like/${post._id}`)
                      .then(() => {})
                  }
                >
                  ❤️ {post.likes?.length || 0}
                </button>

                <button onClick={() => loadNextPage()}>➡ Next</button>

                <button
                  onClick={() =>
                    navigator.share
                      ? navigator.share({ title: post.title })
                      : alert("Copy link manually")
                  }
                >
                  🔗 Share
                </button>
              </div>
            </div>
          );
        })}

      {/* Big Preview */}
      {bigPreview && (
        <div
          className="big-preview"
          onClick={() => setBigPreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(0,0,0,0.8)",
            zIndex: 9999,
          }}
        >
          {bigPreview.type === "image" ? (
            <img
              src={bigPreview.url}
              style={{ maxWidth: "95%", maxHeight: "95%" }}
            />
          ) : (
            <video
              src={bigPreview.url}
              controls
              style={{ maxWidth: "95%", maxHeight: "95%" }}
            />
          )}
        </div>
      )}

      {loading && <p style={{ textAlign: "center" }}>Loading more...</p>}
    </div>
  );
};

export default MutualFeed;
