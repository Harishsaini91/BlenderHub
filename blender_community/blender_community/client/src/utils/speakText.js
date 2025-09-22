export const speakText = (text) => {
  if (!window.speechSynthesis) {
    console.warn("❌ SpeechSynthesis not supported in this browser.");
    return;
  }

  // Stop any currently speaking text
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel(); // 🔇 Stop current speech
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  speechSynthesis.speak(utterance);
};
