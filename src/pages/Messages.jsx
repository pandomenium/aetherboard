// MessagesPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

/*
  Final MVP MessagesPage (single-file)
  - Group chat (room_id sample rooms)
  - Realtime messages (postgres_changes)
  - Broadcast channel for presence / seen / system notifications
  - Local profile pictures (base64 in localStorage)
  - Seen-by (broadcast, local)
  - Message animations (CSS in <style>)
  - Group consecutive messages by sender
  - System messages (nickname changes, join/leave)
  - Inline CSS only
*/

export default function MessagesPage() {
  // user + state
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]); // list of message objects + system messages (type: 'system')
  const [newMessage, setNewMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [profilePicDataUrl, setProfilePicDataUrl] = useState(null);
  const [activeRoom, setActiveRoom] = useState("HR");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({}); // { userId: true }
  const [seenByMap, setSeenByMap] = useState({}); // { messageId: Set(userId) }
  const [deletingIds, setDeletingIds] = useState(new Set()); // animate deletes
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const roomChannelRef = useRef(null);

  // sample rooms (using UUIDs would be fine; we use simple IDs consistent with your DB)
  const rooms = [
    { id: "HR", name: "HR Room" },
    { id: "IT", name: "IT Room" },
    { id: "Finance", name: "Finance Room" },
  ];

  // style injection for animations
  const InlineStyles = (
    <style>{`
      @keyframes msgEnter { from { opacity: 0; transform: translateY(6px) scale(.995);} to { opacity: 1; transform: translateY(0) scale(1);} }
      @keyframes msgExit { from { opacity: 1; transform: scale(1);} to { opacity: 0; transform: scale(.98);} }
      .msg-enter { animation: msgEnter .18s ease both; }
      .msg-exit { animation: msgExit .18s ease both; }
      .fade-out { opacity: 0 !important; transform: translateY(6px) scale(.98) !important; transition: opacity .18s, transform .18s; }
      .system-msg { color: #6b7280; font-size: 13px; text-align:center; padding:6px 0; }
      .avatar-presence { width:10px; height:10px; border-radius:50%; border:2px solid white; position: absolute; bottom: -2px; right: -2px; }
    `}</style>
  );

  // load user + nickname + profile pic + open broadcast channel
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      // load nickname & profile pic
      const stored = localStorage.getItem(`nickname`);
      if (stored) setNickname(stored);
      const pic = localStorage.getItem(`profile_pic_${session.user.id}`);
      if (pic) setProfilePicDataUrl(pic);

      // setup broadcast channel for presence/seen/system
      const ch = supabase.channel("app:messages:broadcast");
      ch.on("broadcast", { event: "presence" }, ({ payload }) => {
        // payload: { user_id, online, room_id (optional) }
        setOnlineUsers((prev) => ({ ...prev, [payload.user_id]: payload.online }));
      });
      ch.on("broadcast", { event: "seen" }, ({ payload }) => {
        // payload: { user_id, room_id, messageIds: [] }
        if (payload.room_id !== activeRoom) return;
        setSeenByMap((prev) => {
          const copy = { ...prev };
          (payload.messageIds || []).forEach((mid) => {
            copy[mid] = copy[mid] ? new Set([...copy[mid], payload.user_id]) : new Set([payload.user_id]);
          });
          return copy;
        });
      });
      ch.on("broadcast", { event: "system" }, ({ payload }) => {
        // payload: { room_id, text, ts }
        if (payload.room_id !== activeRoom) return;
        const sys = {
          id: `sys-${Date.now()}-${Math.random()}`,
          type: "system",
          content: payload.text,
          created_at: payload.ts || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, sys]);
      });

      // subscribe (subscribe is synchronous in v2)
      ch.subscribe();
      // announce presence
      ch.send({
        type: "broadcast",
        event: "presence",
        payload: { user_id: session.user.id, online: true },
      });

      channelRef.current = ch;

      // cleanup on unload
      const onUnload = () => {
        try {
          ch.send({
            type: "broadcast",
            event: "presence",
            payload: { user_id: session.user.id, online: false },
          });
          supabase.removeChannel(ch);
        } catch (e) {}
      };
      window.addEventListener("beforeunload", onUnload);
      return () => {
        onUnload();
        window.removeEventListener("beforeunload", onUnload);
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when activeRoom changes: subscribe to messages (postgres) and fetch initial messages;
  // also announce "join" system message and broadcast seen
  useEffect(() => {
    if (!activeRoom || !user) return;

    // fetch existing room messages
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", activeRoom)
        .order("created_at", { ascending: true });
      if (!error && Array.isArray(data)) {
        setMessages(data.map(normalizeMsg));
        // mark them seen locally and broadcast seen event
        const ids = (data || []).map((m) => m.id).filter(Boolean);
        if (ids.length && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "seen",
            payload: { room_id: activeRoom, user_id: user.id, messageIds: ids },
          });
          setSeenByMap((prev) => {
            const copy = { ...prev };
            ids.forEach((id) => {
              copy[id] = copy[id] ? new Set([...copy[id], user.id]) : new Set([user.id]);
            });
            return copy;
          });
        }
      }
    };

    fetchRoom();

    // create room-specific postgres_changes subscription
    // filter by room_id
    const filter = `room_id=eq.${activeRoom}`;
    // clean up previous if existed
    if (roomChannelRef.current) {
      try {
        supabase.removeChannel(roomChannelRef.current);
      } catch {}
    }

    const ch = supabase
      .channel("realtime:messages:" + activeRoom)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter },
        (payload) => {
          const ev = payload.eventType || payload.event;
          // normalize inserted/updated record
          const rec = payload.new ?? payload.old;
          if (!rec) return;
          if (ev === "INSERT") {
            setMessages((prev) => [...prev, normalizeMsg(rec)]);
            // broadcast "seen" for this new message if user is in the room (assume they see it)
            if (channelRef.current) {
              channelRef.current.send({
                type: "broadcast",
                event: "seen",
                payload: { room_id: activeRoom, user_id: user.id, messageIds: [rec.id] },
              });
              setSeenByMap((prev) => {
                const copy = { ...prev };
                copy[rec.id] = copy[rec.id] ? new Set([...copy[rec.id], user.id]) : new Set([user.id]);
                return copy;
              });
            }
          } else if (ev === "UPDATE") {
            setMessages((prev) => prev.map((m) => (m.id === rec.id ? normalizeMsg(rec) : m)));
          } else if (ev === "DELETE") {
            // apply exit animation first
            setDeletingIds((prev) => new Set(prev).add(rec.id));
            // remove after animation (200ms)
            setTimeout(() => {
              setMessages((prev) => prev.filter((m) => m.id !== rec.id));
              setDeletingIds((prev) => {
                const copy = new Set(prev);
                copy.delete(rec.id);
                return copy;
              });
              setSeenByMap((prev) => {
                const copy = { ...prev };
                delete copy[rec.id];
                return copy;
              });
            }, 220);
          }
        }
      )
      .subscribe();

    roomChannelRef.current = ch;

    // announce system: user joined (optional)
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "system",
        payload: { room_id: activeRoom, text: `${nickname || (user && user.email.split("@")[0])} joined the room`, ts: new Date().toISOString() },
      });
    }

    return () => {
      // announce left
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "system",
          payload: { room_id: activeRoom, text: `${nickname || (user && user.email.split("@")[0])} left the room`, ts: new Date().toISOString() },
        });
      }
      try {
        supabase.removeChannel(ch);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, user]);

  // autoscroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // normalize message object (ensures properties exist)
  function normalizeMsg(m) {
    return {
      id: m.id,
      sender_id: m.sender_id,
      sender_name: m.sender_name || (m.sender_email ? m.sender_email.split("@")[0] : "Someone"),
      content: m.content,
      created_at: m.created_at || new Date().toISOString(),
      edited: m.edited || false,
      type: m.type || "message", // allow 'system'
      sender_profile_pic: m.sender_profile_pic || null,
    };
  }

  // send message
  async function sendMessage() {
    if (!newMessage.trim() || !nickname || !user) return;
    const payload = {
      sender_id: user.id,
      sender_name: nickname,
      room_id: activeRoom,
      content: newMessage.trim(),
    };
    setNewMessage("");
    try {
      await supabase.from("messages").insert([payload]);
      // rely on realtime insert to append
    } catch (e) {
      console.error("send error", e);
    }
  }

  // delete (sender only) — emits DELETE on DB; realtime handler will animate/remove
  async function deleteMessage(id) {
    // add to deleting set for immediate animation
    setDeletingIds((prev) => new Set(prev).add(id));
    // wait animation then call delete (but also DB delete triggers removal for others)
    setTimeout(async () => {
      try {
        await supabase.from("messages").delete().eq("id", id);
      } catch (e) {
        console.error("delete error", e);
        // cleanup if failed
        setDeletingIds((prev) => {
          const copy = new Set(prev);
          copy.delete(id);
          return copy;
        });
      }
    }, 180);
  }

  // edit (sender only)
  async function saveEdit(id) {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setEditingId(null);
      setEditingText("");
      return;
    }
    const newContent = `${trimmed} (edited)`;
    // optimistic locally
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: newContent, edited: true } : m)));
    setEditingId(null);
    setEditingText("");
    try {
      await supabase.from("messages").update({ content: newContent, edited: true }).eq("id", id);
    } catch (e) {
      console.error("edit error", e);
    }
  }

  // save profile pic
  function handleProfilePicSelect(file) {
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setProfilePicDataUrl(dataUrl);
      localStorage.setItem(`profile_pic_${user.id}`, dataUrl);
      // optionally update DB for others to see: you could store sender_profile_pic field in messages or profiles table
    };
    reader.readAsDataURL(file);
  }
  function triggerPickFile() {
    fileInputRef.current?.click();
  }
  function removeProfilePic() {
    if (!user) return;
    setProfilePicDataUrl(null);
    localStorage.removeItem(`profile_pic_${user.id}`);
  }

  // save nickname and broadcast system message
  async function saveNickname() {
    const trimmed = nickname.trim();
    if (!trimmed || !user) return;
    localStorage.setItem("nickname", trimmed);
    setShowProfilePopup(false);
    // update past messages optionally
    try {
      await supabase.from("messages").update({ sender_name: trimmed }).eq("sender_id", user.id);
    } catch (e) {
      // ignore
    }
    // send system notification
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "system",
        payload: { room_id: activeRoom, text: `${trimmed} changed nickname`, ts: new Date().toISOString() },
      });
    }
  }

  // when user opens the room, announce seen for all current messages
  useEffect(() => {
    if (!user || !messages.length || !channelRef.current) return;
    const ids = messages.filter((m) => m.type !== "system").map((m) => m.id).filter(Boolean);
    if (ids.length === 0) return;
    channelRef.current.send({
      type: "broadcast",
      event: "seen",
      payload: { room_id: activeRoom, user_id: user.id, messageIds: ids },
    });
    setSeenByMap((prev) => {
      const copy = { ...prev };
      ids.forEach((id) => {
        copy[id] = copy[id] ? new Set([...copy[id], user.id]) : new Set([user.id]);
      });
      return copy;
    });
  }, [messages.length]); // eslint-disable-line

  // helpers: group consecutive messages by same sender (and not system)
  function groupedMessagesList(list) {
    const groups = [];
    let current = null;
    list.forEach((m) => {
      if (m.type === "system") {
        groups.push({ type: "system", content: m.content || m });
        current = null;
        return;
      }
      if (!current || current.sender_id !== m.sender_id) {
        current = { sender_id: m.sender_id, sender_name: m.sender_name, sender_profile_pic: m.sender_profile_pic, items: [m] };
        groups.push(current);
      } else {
        current.items.push(m);
      }
    });
    return groups;
  }

  // small default avatar (SVG data URL)
  const defaultAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='8' r='3.2'/><path d='M21 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2'/></svg>`
  )}`;

  // render small avatar with presence dot
  function Avatar({ src, name, userId }) {
    const online = userId ? !!onlineUsers[userId] : false;
    return (
      <div style={{ position: "relative", width: 36, height: 36, borderRadius: 18, overflow: "hidden", flexShrink: 0 }}>
        <img src={src || defaultAvatar} alt={name || "avatar"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 12,
            height: 12,
            borderRadius: 6,
            border: "2px solid white",
            background: online ? "#22c55e" : "#9ca3af",
          }}
        />
      </div>
    );
  }

  // format seen-by array for UI (map of sets to names)
  function seenByText(messageId) {
    const set = seenByMap[messageId];
    if (!set || set.size === 0) return "";
    // for MVP we only have current user's id -> show "You" and number of others
    const arr = Array.from(set);
    const names = arr.map((id) => (id === user?.id ? "You" : id)); // if you want better names, store mapping of id->name
    return `Seen by ${names.join(", ")}`;
  }

  // render grouped messages
  const groups = groupedMessagesList(messages);

  return (
    <div style={styles.container}>
      {InlineStyles}

      {/* LEFT: rooms + profile */}
      <aside style={styles.sidebar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden" }}>
            <img src={profilePicDataUrl || defaultAvatar} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{nickname || (user ? user.email.split("@")[0] : "You")}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{user ? user.email : "Not signed in"}</div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoom(r.id)}
              style={{
                ...styles.roomBtn,
                background: activeRoom === r.id ? "#eef2ff" : "#fff",
                borderColor: activeRoom === r.id ? "#c7d2fe" : "#eee",
              }}
            >
              {r.name}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
          <button onClick={triggerPickFile} style={styles.smallBtn}>Change Photo</button>
          {profilePicDataUrl && <button onClick={removeProfilePic} style={styles.smallBtnAlt}>Remove</button>}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleProfilePicSelect(e.target.files?.[0])} />
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowProfilePopup(true)} style={styles.primaryBtn}>Edit Profile</button>
        </div>
      </aside>

      {/* RIGHT: chat */}
      <main style={styles.chatArea}>
        {/* header */}
        <div style={styles.chatHeader}>
          <div>
            <h3 style={{ margin: 0 }}>{rooms.find((r) => r.id === activeRoom)?.name}</h3>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{messages.length} messages</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden" }}>
                <img src={profilePicDataUrl || defaultAvatar} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ fontWeight: 700 }}>{nickname || (user ? user.email.split("@")[0] : "You")}</div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={triggerPickFile} style={styles.iconBtn}>Photo</button>
              <button onClick={() => setShowProfilePopup(true)} style={styles.iconBtn}>Edit</button>
            </div>
          </div>
        </div>

        {/* messages list */}
        <div style={styles.messagesList}>
          {groups.map((g, gi) => {
            if (g.type === "system") {
              return <div key={`sys-${gi}`} className="system-msg" style={{ margin: "8px 0" }}>{g.content}</div>;
            }
            const mine = g.sender_id === user?.id;
            const avatarSrc = g.sender_id === user?.id ? profilePicDataUrl || defaultAvatar : g.sender_profile_pic || defaultAvatar;
            return (
              <div key={`grp-${gi}`} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 6, justifyContent: mine ? "flex-end" : "flex-start" }}>
                {!mine && <Avatar src={avatarSrc} name={g.sender_name} userId={g.sender_id} />}
                <div style={{ maxWidth: "72%" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{g.sender_name}</div>
                  {g.items.map((m) => {
                    const isDeleting = deletingIds.has(m.id);
                    return (
                      <div key={m.id} className={isDeleting ? "fade-out" : "msg-enter"} style={{ ...styles.messageBubble, background: m.sender_id === user?.id ? "#4f46e5" : "#fff", color: m.sender_id === user?.id ? "#fff" : "#111", marginBottom: 8 }}>
                        <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <div>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          <div style={{ color: "#6b7280" }}>{seenByText(m.id)}</div>
                        </div>

                        {/* edit/delete actions for owner */}
                        {m.sender_id === user?.id && (
                          <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                            <button onClick={() => { setEditingId(m.id); setEditingText(m.content.replace(/\s*\(edited\)$/, "")); }} style={styles.smallAction}>Edit</button>
                            <button onClick={() => deleteMessage(m.id)} style={styles.smallActionDanger}>Delete</button>
                          </div>
                        )}

                        {/* inline edit */}
                        {editingId === m.id && (
                          <div style={{ marginTop: 8 }}>
                            <input value={editingText} onChange={(e) => setEditingText(e.target.value)} style={styles.editInput} />
                            <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                              <button onClick={() => saveEdit(m.id)} style={styles.saveButton}>Save</button>
                              <button onClick={() => { setEditingId(null); setEditingText(""); }} style={styles.cancelButton}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {mine && <Avatar src={avatarSrc} name={g.sender_name} userId={g.sender_id} />}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* composer */}
        <div style={styles.composer}>
          <input
            placeholder="Write a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            style={styles.input}
          />
          <button onClick={sendMessage} style={styles.sendBtn}>Send</button>
        </div>
      </main>

      {/* profile popup */}
      {showProfilePopup && (
        <div style={styles.overlay}>
          <div style={styles.popup}>
            <h3 style={{ marginBottom: 8 }}>Profile</h3>
            <div style={{ width: 100, height: 100, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
              <img src={profilePicDataUrl || defaultAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <div style={{ width: "100%", marginBottom: 8 }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleProfilePicSelect(e.target.files?.[0])} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={triggerPickFile} style={styles.smallBtn}>Upload Photo</button>
                {profilePicDataUrl && <button onClick={removeProfilePic} style={styles.smallBtnAlt}>Remove</button>}
              </div>
            </div>

            <div style={{ width: "100%", marginTop: 6 }}>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname" style={styles.popupInput} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={saveNickname} style={styles.popupButton}>Save</button>
              <button onClick={() => setShowProfilePopup(false)} style={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Inline styles */
const styles = {
  container: { display: "flex", height: "100vh", background: "#f3f4f6", fontFamily: "Inter, Arial, sans-serif" },
  sidebar: { width: 260, padding: 20, background: "#fff", borderRight: "1px solid #e6e6e6", display: "flex", flexDirection: "column", gap: 12 },
  roomBtn: { border: "1px solid #eee", padding: "10px 12px", borderRadius: 8, background: "#fff", cursor: "pointer", textAlign: "left" },
  primaryBtn: { background: "#4f46e5", color: "#fff", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer" },
  smallBtn: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },
  smallBtnAlt: { padding: "8px 10px", borderRadius: 8, border: "1px solid #f5c6cb", background: "#fff", cursor: "pointer", color: "#b91c1c" },

  chatArea: { flex: 1, display: "flex", flexDirection: "column" },
  chatHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid #e5e7eb", background: "#fff" },
  messagesList: { flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 },
  messageBubble: { padding: 12, borderRadius: 10, boxShadow: "0 1px 2px rgba(2,6,23,0.04)" },

  composer: { padding: 16, borderTop: "1px solid #e6e6e6", display: "flex", gap: 12, background: "#fff" },
  input: { flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd" },
  sendBtn: { padding: "10px 16px", borderRadius: 10, background: "#4f46e5", color: "#fff", border: "none", cursor: "pointer" },

  editInput: { width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" },
  saveButton: { padding: "6px 10px", borderRadius: 6, background: "#4f46e5", color: "#fff", border: "none", cursor: "pointer" },
  cancelButton: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },
  smallAction: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },
  smallActionDanger: { padding: "6px 10px", borderRadius: 6, border: "1px solid #f5c6cb", background: "#fff", color: "#b91c1c", cursor: "pointer" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 },
  popup: { width: 420, background: "#fff", padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center" },
  popupInput: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" },
  popupButton: { padding: "8px 14px", borderRadius: 8, background: "#4f46e5", color: "#fff", border: "none", cursor: "pointer" },

  iconBtn: { padding: "8px 10px", borderRadius: 8, border: "1px solid #eee", background: "#fff", cursor: "pointer" },
};

