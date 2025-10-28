import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function MessagesPage() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [activeRoom, setActiveRoom] = useState("HR");
  const [showNicknamePopup, setShowNicknamePopup] = useState(false);
  const messagesEndRef = useRef(null);

  // ✅ Load user and nickname from localStorage
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };
    getUser();

    const storedName = localStorage.getItem("nickname");
    if (storedName) {
      setNickname(storedName);
    } else {
      setShowNicknamePopup(true);
    }
  }, []);

  // ✅ Load and subscribe to messages for the active room
  useEffect(() => {
    if (!activeRoom) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", activeRoom)
        .order("created_at", { ascending: true });

      if (!error && data) setMessages(data);
    };

    loadMessages();

    const channel = supabase
      .channel(`room_${activeRoom}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages((prev) => [...prev, payload.new]);
        } else if (payload.eventType === "DELETE") {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        } else if (payload.eventType === "UPDATE") {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg))
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Send new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !nickname) return;
    await supabase.from("messages").insert([
      {
        sender_id: user?.id,
        sender_name: nickname,
        room_id: activeRoom,
        content: newMessage,
      },
    ]);
    setNewMessage("");
  };

  // ✅ Delete message
  const deleteMessage = async (id) => {
    await supabase.from("messages").delete().eq("id", id);
  };

  // ✅ Edit message
  const startEditing = (msg) => {
    setEditingId(msg.id);
    setEditingText(msg.content);
  };

  const saveEdit = async (id) => {
    await supabase.from("messages").update({ content: editingText + " (edited)" }).eq("id", id);
    setEditingId(null);
    setEditingText("");
  };

  // ✅ Save nickname and (optionally) update past messages
  const saveNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;

    localStorage.setItem("nickname", trimmed);
    setNickname(trimmed);
    setShowNicknamePopup(false);

    // Optional: update all past messages for this user
    if (user?.id) {
      await supabase.from("messages").update({ sender_name: trimmed }).eq("sender_id", user.id);
    }
  };

  const rooms = [
    { id: "HR", name: "HR Room" },
    { id: "IT", name: "IT Room" },
    { id: "Finance", name: "Finance Room" },
  ];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Messages</h2>
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => setActiveRoom(room.id)}
            style={{
              ...styles.roomButton,
              backgroundColor: activeRoom === room.id ? "#4f46e5" : "#f3f4f6",
              color: activeRoom === room.id ? "#fff" : "#333",
            }}
          >
            {room.name}
          </button>
        ))}
        <button
          onClick={() => setShowNicknamePopup(true)}
          style={styles.nicknameButton}
        >
          Change Nickname
        </button>
      </div>

      {/* Chat Section */}
      <div style={styles.chatSection}>
        <h2 style={styles.roomTitle}>{rooms.find((r) => r.id === activeRoom)?.name}</h2>
        <div style={styles.messagesContainer}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageBubble,
                alignSelf: msg.sender_id === user?.id ? "flex-end" : "flex-start",
                backgroundColor: msg.sender_id === user?.id ? "#4f46e5" : "#e5e7eb",
                color: msg.sender_id === user?.id ? "#fff" : "#111",
              }}
            >
              <strong>{msg.sender_name}</strong>
              {editingId === msg.id ? (
                <div>
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    style={styles.editInput}
                  />
                  <button onClick={() => saveEdit(msg.id)} style={styles.saveButton}>
                    Save
                  </button>
                </div>
              ) : (
                <p style={styles.messageText}>{msg.content}</p>
              )}
              {msg.sender_id === user?.id && editingId !== msg.id && (
                <div style={styles.actions}>
                  <button onClick={() => startEditing(msg)} style={styles.actionBtn}>
                    ✎
                  </button>
                  <button onClick={() => deleteMessage(msg.id)} style={styles.actionBtn}>
                    🗑
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Section */}
        <div style={styles.inputContainer}>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={styles.input}
          />
          <button onClick={sendMessage} style={styles.sendButton}>
            Send
          </button>
        </div>
      </div>

      {/* Nickname Popup */}
      {showNicknamePopup && (
        <div style={styles.overlay}>
          <div style={styles.popup}>
            <h3 style={{ marginBottom: "10px" }}>Set your nickname</h3>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter nickname"
              style={styles.popupInput}
            />
            <button onClick={saveNickname} style={styles.popupButton}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Inline styles (no Tailwind)
const styles = {
  container: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#f9fafb",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    width: "220px",
    backgroundColor: "#ffffff",
    borderRight: "1px solid #ddd",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sidebarTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#4f46e5",
  },
  roomButton: {
    border: "none",
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left",
    fontWeight: "500",
  },
  nicknameButton: {
    marginTop: "auto",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  chatSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "20px",
  },
  roomTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "10px",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#f3f4f6",
    borderRadius: "10px",
  },
  messageBubble: {
    padding: "10px 14px",
    borderRadius: "10px",
    maxWidth: "70%",
    wordWrap: "break-word",
    position: "relative",
  },
  messageText: {
    marginTop: "4px",
    whiteSpace: "pre-wrap",
  },
  actions: {
    position: "absolute",
    top: "5px",
    right: "8px",
    display: "flex",
    gap: "5px",
  },
  actionBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#fff",
    fontSize: "14px",
  },
  editInput: {
    width: "100%",
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    marginTop: "6px",
  },
  saveButton: {
    marginTop: "4px",
    padding: "5px 10px",
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  inputContainer: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  sendButton: {
    padding: "10px 15px",
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  popup: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "10px",
    width: "300px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  popupInput: {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    marginBottom: "10px",
  },
  popupButton: {
    backgroundColor: "#4f46e5",
    color: "#fff",
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
