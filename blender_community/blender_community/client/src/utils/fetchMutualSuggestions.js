// utils/fetchMutualSuggestions.js
import axios from "axios";

const LOCAL_MUTUAL_TIMESTAMP_KEY = "lastMutualFetch";

// ✅ Check if mutuals should be re-fetched (based on local timestamp)
const shouldFetchMutuals = () => {
  const lastFetch = localStorage.getItem(LOCAL_MUTUAL_TIMESTAMP_KEY);
  if (!lastFetch) return true;

  const twelveHours = 12 * 60 * 60 * 1000;
  const diff = Date.now() - new Date(lastFetch).getTime();
  return diff > twelveHours;
};

// ✅ Update local timestamp
const setMutualFetchTimestamp = () => {
  localStorage.setItem(LOCAL_MUTUAL_TIMESTAMP_KEY, new Date().toISOString());
};

// ✅ Call this function after login or reload
export const fetchMutualSuggestions = async (userId) => {
  if (!userId) return;

  if (!shouldFetchMutuals()) {
    console.log("✅ Mutual suggestions are up-to-date (within 12h)");
    return;
  }

  try {
    const res = await axios.get(`http://localhost:5000/api/mutual/suggestions/${userId}`);
    localStorage.setItem("mutualSuggestions", JSON.stringify(res.data));
    setMutualFetchTimestamp(); // ✅ only if request succeeds
  } catch (err) {
    console.error("❌ Failed to fetch mutual suggestions:", err.message);
  }
};
