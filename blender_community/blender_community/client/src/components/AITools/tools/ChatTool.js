 
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Send } from "lucide-react";
import { speakText } from "../../../utils/speakText";
import "./css/ChatTool.css";
import { startVoiceToText } from "../../../utils/voiceToText";
import { Mic } from "lucide-react"; // or any icon

const OpenAIAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAPI, setSelectedAPI] = useState("groq"); // 🔘 Default API
  const bottomRef = useRef();
  const [listening, setListening] = useState(false);

  const handleVoiceInput = () => {
    setListening(true);

    const recognition = startVoiceToText(
      (spokenText) => {
        setInput(spokenText); // Fills input field with spoken text
        setListening(false);
      },
      (err) => {
        console.error("Voice Error:", err);
        setListening(false);
      }
    );

    if (!recognition) {
      setListening(false);
    }
  };

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMsg = { role: "user", content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setLoading(true);

    try {
      let reply;

      if (selectedAPI === "groq") {
        const res = await axios.post("http://localhost:5000/api/groq/chat", {
          model: "llama3-70b-8192",
          messages: [...messages, newMsg]
        });
        reply = res.data.choices[0].message;
      } else if (selectedAPI === "openrouter") {
        const res = await axios.post("http://localhost:5000/api/openrouter/chat", {
          prompt: input,
          model: "mistralai/mixtral-8x7b-instruct"
        });
        reply = { role: "assistant", content: res.data.reply || "No response" };
      }

      setMessages(prev => [...prev, reply]);
      speakText(reply.content || reply);
    } catch (err) {
      console.error("❌ Chat API error:", err.message);
    } finally {
      setLoading(false);
    }
  };





  return (
    <div className="chat-container">
      <h2 className="chat-title">🎨 AI Assistant for Artists</h2>

      {/* 🔘 API Selection */}
      <div className="api-selector">
        <label htmlFor="api">Choose API:</label>
        <select id="api" value={selectedAPI} onChange={(e) => setSelectedAPI(e.target.value)}>
          <option value="groq">Groq (LLaMA 3)</option>
          <option value="openrouter">OpenRouter (Mixtral)</option>
        </select>
      </div>

      {/* 🧠 Chat Display */}
      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <p className="chat-loading">Thinking...</p>}
        <div ref={bottomRef}></div>
      </div>

      {/* 💬 Input Area */}
      <div className="chat-input-area">
        <input
          type="text"
          placeholder="Ask about Blender tools, assets, lighting..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleVoiceInput}
          className={`mic-button ${listening ? "listening" : ""}`}
          title="Speak now"
        >
          <Mic size={18} color={listening ? "red" : "black"} />
        </button>


        <button onClick={handleSend}><Send size={18} /></button>
      </div>
    </div>
  );
};

export default OpenAIAssistant;
