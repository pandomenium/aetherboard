import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function JuliaChat() {
  const [messages, setMessages] = useState([
    { sender: "Julia", text: "Hi there! I’m Julia 👋 How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [user, setUser] = useState(null);
  const chatRef = useRef(null);

  // 🔊 Speech helper
  const speak = (text) => {
    if ("speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 1;
      utter.pitch = 1.1;
      utter.volume = 0.9;
      window.speechSynthesis.cancel(); // Stop any previous speech
      window.speechSynthesis.speak(utter);
    }
  };

  // ✅ Get logged-in user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const pushMessage = (msg, speakIt = false) => {
    setMessages((prev) => [...prev, msg]);
    if (speakIt && msg.sender === "Julia") speak(msg.text);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    pushMessage({ sender: "You", text: input });
    const userMsg = input.toLowerCase();
    setInput("");

    setTimeout(() => {
      if (userMsg.includes("help")) {
        pushMessage(
          { sender: "Julia", text: "Sure! You can ask me about tickets, timesheets, or IT issues." },
          true
        );
      } else if (userMsg.includes("ticket")) {
        pushMessage(
          { sender: "Julia", text: "Would you like me to show your open tickets?" },
          false
        );
      } else {
        pushMessage({ sender: "Julia", text: "I'm here! Ask me anything about Aetherboard." }, false);
      }
    }, 500);
  };

  // ✅ Real-time notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("julia_tickets_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const note = payload.new;
          if (note?.user_id === user.id || !note?.user_id) {
            pushMessage({ sender: "Julia", text: `🔔 ${note.message}` }, true);
            setHasNewMessage(true);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_comments" },
        async (payload) => {
          const comment = payload.new;
          if (!comment) return;

          const { data: ticket } = await supabase
            .from("tickets")
            .select("user_id, assignee_id, title")
            .eq("id", comment.ticket_id)
            .single();

          if (
            ticket &&
            comment.user_id !== user.id &&
            (ticket.user_id === user.id || ticket.assignee_id === user.id)
          ) {
            const msg = `💬 New comment on "${ticket.title}": "${comment.comment}"`;
            pushMessage({ sender: "Julia", text: msg }, true);
            setHasNewMessage(true);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  return (
    <>
      {/* Fixed container */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Floating Bubble */}
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setHasNewMessage(false);
            }}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              fontSize: "26px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              transition: "transform 0.2s ease",
              animation: hasNewMessage ? "bounce 1s infinite" : "none",
            }}
          >
            💬
          </button>
        )}

        {/* Chat Window */}
        {isOpen && (
          <div
            style={{
              width: "320px",
              height: "420px",
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 4px 18px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "#2563eb",
                color: "white",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>Julia</strong>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>AI Assistant</div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div
              ref={chatRef}
              style={{
                flex: 1,
                background: "#f9fafb",
                padding: "10px",
                overflowY: "auto",
              }}
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "You" ? "flex-end" : "flex-start",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      background: msg.sender === "You" ? "#2563eb" : "#e5e7eb",
                      color: msg.sender === "You" ? "white" : "#111827",
                      padding: "8px 12px",
                      borderRadius: "12px",
                      maxWidth: "75%",
                      fontSize: "14px",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div
              style={{
                borderTop: "1px solid #ddd",
                padding: "8px",
                display: "flex",
                gap: "6px",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🌀 Keyframes */}
      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}
      </style>
    </>
  );
}
