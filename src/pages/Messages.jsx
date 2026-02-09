// MessagesPage.jsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function MessagesPage() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [roomId, setRoomId] = useState("HR");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const rooms = [
    { id: "HR", name: "HR Room" },
    { id: "IT", name: "IT Room" },
    { id: "Finance", name: "Finance Room" },
    { id: "Dev", name: "Dev Room" },
  ];

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) return;
      setUser(data.session.user);
      const storedNick = localStorage.getItem("nickname");
      if (storedNick) setNickname(storedNick);
      const pic = localStorage.getItem(`profile_pic_${data.session.user.id}`);
      if (pic) setProfilePic(pic);
    })();
  }, []);

  /* ---------------- LOAD + REALTIME ---------------- */
  useEffect(() => {
    if (!user) return;

    loadMessages();

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`messages-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const ev = payload.eventType || payload.event;
          const m = payload.new ?? payload.old;
          if (!m) return;
          if (ev === "INSERT") setMessages((prev) => [...prev, m]);
          if (ev === "UPDATE") setMessages((prev) => prev.map((msg) => (msg.id === m.id ? m : msg)));
          if (ev === "DELETE") setMessages((prev) => prev.filter((msg) => msg.id !== m.id));
          scrollDown();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => supabase.removeChannel(channel);
  }, [roomId, user]);

  async function loadMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    scrollDown();
  }

  function scrollDown() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  /* ---------------- SEND ---------------- */
  async function sendMessage() {
    if (!text.trim()) return;
    await supabase.from("messages").insert({
      room_id: roomId,
      sender_id: user.id,
      sender_name: nickname || user.email.split("@")[0],
      sender_profile_pic: profilePic,
      content: text.trim(),
    });
    setText("");
    scrollDown();
  }

  async function saveEdit(id) {
    const trimmed = editingText.trim();
    if (!trimmed) return setEditingId(null);
    const newContent = `${trimmed} (edited)`;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: newContent } : m)));
    setEditingId(null);
    await supabase.from("messages").update({ content: newContent }).eq("id", id);
  }

  function handleProfilePic(file) {
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setProfilePic(dataUrl);
      localStorage.setItem(`profile_pic_${user.id}`, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- UI ---------------- */
  return (
   <div style={styles.page}>
    <div style={styles.chatShell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Rooms</h2>
        {rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => setRoomId(r.id)}
            style={{ ...styles.roomBtn, background: r.id === roomId ? "#eef2ff" : "#fff", borderColor: r.id === roomId ? "#c7d2fe" : "#e5e7eb" }}
          >
            {r.name}
          </button>
        ))}
        <div style={{ marginTop: "auto" }}>
          <div style={{ marginBottom: 8 }}>Profile:</div>
          <input type="file" accept="image/*" onChange={(e) => handleProfilePic(e.target.files?.[0])} />
        </div>
      </aside>

      {/* Chat Panel */}
      <section style={styles.chatPanel}>
        <header style={styles.header}>
          <h2 style={{ margin: 0 }}>{rooms.find((r) => r.id === roomId)?.name}</h2>
        </header>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} style={{ ...styles.bubble, alignSelf: mine ? "flex-end" : "flex-start", background: mine ? "#4f46e5" : "#fff", color: mine ? "#fff" : "#111" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <img src={m.sender_profile_pic || "https://via.placeholder.com/28"} alt="avatar" style={{ width: 28, height: 28, borderRadius: 14 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>{m.sender_name}</span>
                </div>
                {editingId === m.id ? (
                  <>
                    <input style={styles.editInput} value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                    <button onClick={() => saveEdit(m.id)} style={styles.saveButton}>Save</button>
                  </>
                ) : (
                  <div>{m.content}</div>
                )}
                {mine && editingId !== m.id && <button onClick={() => { setEditingId(m.id); setEditingText(m.content.replace(/\s*\(edited\)$/, "")); }} style={styles.editButton}>Edit</button>}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <footer style={styles.inputBar}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            style={styles.input}
          />
          <button onClick={sendMessage} style={styles.sendBtn}>Send</button>
        </footer>
      </section>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  page: {
    height: "100vh",
    background: "#f1f5f9",
    fontFamily: "Inter, system-ui, sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
  },

  chatShell: {
    display: "flex",
    width: "100%",
    maxWidth: 1400,
    background: "#ffffff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },

  /* Sidebar */
  sidebar: {
    width: 240,
    background: "#f8fafc",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #e5e7eb",
  },
  sidebarTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: "#475569",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  roomBtn: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid transparent",
    marginBottom: 6,
    cursor: "pointer",
    textAlign: "left",
    fontSize: 14,
    background: "transparent",
  },

  /* Chat panel */
  chatPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#f8fafc",
  },

  header: {
    padding: "14px 20px",
    borderBottom: "1px solid #e5e7eb",
    background: "#ffffff",
    fontWeight: 600,
  },

  /* Messages */
  messages: {
    flex: 1,
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  bubble: {
    padding: "10px 14px",
    borderRadius: 10,
    maxWidth: "65%",
    fontSize: 14,
    lineHeight: 1.4,
    position: "relative",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },

  editButton: {
    position: "absolute",
    bottom: -16,
    right: 4,
    fontSize: 11,
    color: "#64748b",
    background: "none",
    border: "none",
    cursor: "pointer",
  },

  editInput: {
    width: "100%",
    padding: 8,
    borderRadius: 6,
    border: "1px solid #cbd5f5",
    marginTop: 6,
  },

  saveButton: {
    marginTop: 6,
    padding: "6px 10px",
    borderRadius: 6,
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
  },

  /* Composer */
  inputBar: {
    padding: 16,
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    gap: 10,
  },

  input: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 999,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
  },

  sendBtn: {
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 500,
  },
};
