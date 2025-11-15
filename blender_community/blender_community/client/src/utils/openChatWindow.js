// src/utils/openChatWindow.js

let chatTab = null;

export function openChatWindow(selfId, otherId = null) {
  if (!selfId) {
    console.error("Self userId is required.");
    return;
  }

  let url = `/chat?self=${selfId}`;
  if (otherId) url += `&with=${otherId}`;

  // 🔥 IMPORTANT — load React correctly
  const fullUrl = `${window.location.origin}${url}`;

  if (chatTab && !chatTab.closed) {
    chatTab.location.href = fullUrl;
    chatTab.focus();
  } else {
    chatTab = window.open(fullUrl, "_blank");
  }
}
