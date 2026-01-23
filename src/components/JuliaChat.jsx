import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { startOfWeek, subWeeks, addDays, format } from "date-fns";

export default function JuliaChat() {
  const [messages, setMessages] = useState([
    {
      sender: "Julia",
      text: "Hi there! I’m Julia 👋 How can I assist you today?",
      options: [
        { label: "🕒 Auto-submit Timesheet", action: "submit" },
        { label: "🌴 Fill All as VL (8 hrs/day)", action: "fillvl" },
        { label: "🗑 Undo Last Action", action: "undo" },
        { label: "✅ Approve Timesheet", action: "approve" },
        { label: "💬 Remind Employee", action: "remind" },
        { label: "🔁 Check Overdue Tickets", action: "overdue" },
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const pendingRef = useRef(null);
  const chatRef = useRef(null);

  // Speech helper
  const speak = (text) => {
    if ("speechSynthesis" in window) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 1;
      utter.pitch = 1.1;
      utter.volume = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Get logged-in user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => listener?.subscription.unsubscribe();
  }, []);

  // Get profile (full_name, role)
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const isAdmin = profile?.role === "admin";

  const pushMessage = (msg, speakIt = false) => {
    setMessages((prev) => [...prev, msg]);
    if (speakIt && msg.sender === "Julia") speak(msg.text);
  };

  const handleOptionClick = async (opt) => {
    pushMessage({ sender: "You", text: opt.label });
    const act = opt.action;

    if (act === "cancel" || act === "no") {
      pushMessage({ sender: "Julia", text: "👌 Okay, cancelled." });
      showCommandMenu();
      return;
    }

    if (act === "submit") {
      pendingRef.current = { action: "submit" };
      pushMessage(makeConfirmation("submit", "Do you want to auto-submit your timesheet?", [
        { label: "Yes (This Week)", action: "submit_this" },
        { label: "Yes (Previous Week)", action: "submit_previous" },
        { label: "No", action: "cancel" },
      ]));
      return;
    }

    if (act === "fillvl") {
      pendingRef.current = { action: "fillvl" };
      pushMessage(makeConfirmation("fillvl", "Fill all days as VL with 8 hours each — which week?", [
        { label: "Yes (This Week)", action: "fillvl_this" },
        { label: "Yes (Previous Week)", action: "fillvl_previous" },
        { label: "No", action: "cancel" },
      ]));
      return;
    }

    if (act === "undo") {
      pushMessage(makeConfirmation("undo", "Undo the last action?", [
        { label: "Yes", action: "undo_confirm" },
        { label: "No", action: "cancel" },
      ]));
      return;
    }

    if (act === "approve") {
      pushMessage(makeConfirmation("approve", "Approve pending timesheets now?", [
        { label: "Yes", action: "approve_confirm" },
        { label: "No", action: "cancel" },
      ]));
      return;
    }

    if (act === "remind") {
      pushMessage(makeConfirmation("remind", "Remind an employee about their task?", [
        { label: "Yes", action: "remind_confirm" },
        { label: "No", action: "cancel" },
      ]));
      return;
    }

    if (act === "overdue") {
      pushMessage({ sender: "Julia", text: "🔁 Checking overdue tickets... (simulated)" });
      pushMessage({ sender: "Julia", text: "You have 2 overdue tickets this week." });
      return;
    }

    // Confirmation actions
    if (act === "submit_this") { await executeSubmit("current"); return; }
    if (act === "submit_previous") { await executeSubmit("previous"); return; }
    if (act === "fillvl_this") { await executeFillVL("current"); return; }
    if (act === "fillvl_previous") { await executeFillVL("previous"); return; }
    if (act === "undo_confirm") { await executeUndo(); return; }
    if (act === "approve_confirm") { await approveTimesheets(); return; }
    if (act === "remind_confirm") { pushMessage({ sender: "Julia", text: "📩 Reminder sent (simulated)." }); return; }
  };

  const makeConfirmation = (key, text, options) => ({ sender: "Julia", text, options, meta: { confirmFor: key } });
  const showCommandMenu = () => pushMessage({
    sender: "Julia",
    text: "What would you like me to do next?",
    options: [
      { label: "🕒 Auto-submit Timesheet", action: "submit" },
      { label: "🌴 Fill All as VL (8 hrs/day)", action: "fillvl" },
      { label: "🗑 Undo Last Action", action: "undo" },
      { label: "✅ Approve Timesheet", action: "approve" },
      { label: "💬 Remind Employee", action: "remind" },
      { label: "🔁 Check Overdue Tickets", action: "overdue" },
    ]
  });

  const getWeekDates = (whichWeek = "current") => {
    let base = startOfWeek(new Date(), { weekStartsOn: 1 });
    if (whichWeek === "previous") base = subWeeks(base, 1);
    const dates = [];
    for (let i = 0; i < 7; i++) dates.push(format(addDays(base, i), "yyyy-MM-dd"));
    return dates;
  };

  const executeSubmit = async (whichWeek) => {
    if (!user) return pushMessage({ sender: "Julia", text: "⚠️ You must be signed in." });
    const dates = getWeekDates(whichWeek);
    const { error } = await supabase.from("timesheets")
      .update({ status: "submitted", submitted_at: new Date() })
      .eq("user_id", user.id)
      .in("date", dates);
    if (error) pushMessage({ sender: "Julia", text: "⚠️ Submit failed." });
    else {
      setLastAction({ type: "submit", dates });
      pushMessage({ sender: "Julia", text: `🧾 Timesheet auto-submitted for ${whichWeek} week ✅`, options: [{ label: "↩️ Undo", action: "undo_confirm" }] });
    }
  };

  const executeFillVL = async (whichWeek) => {
    if (!user) return pushMessage({ sender: "Julia", text: "⚠️ You must be signed in." });
    const dates = getWeekDates(whichWeek);
    const rows = dates.map(d => ({
      user_id: user.id,
      date: d,
      total_hours: 8,
      status: "draft",
      task_name: "Vacation Leave",
      created_at: new Date(),
    }));
    const { error } = await supabase.from("timesheets").insert(rows, { returning: "minimal" });
    if (error) pushMessage({ sender: "Julia", text: "⚠️ Could not create VL entries." });
    else {
      setLastAction({ type: "fillvl", dates });
      pushMessage({ sender: "Julia", text: `🌴 Filled ${dates.length} day(s) as VL for ${whichWeek} week ✅`, options: [{ label: "↩️ Undo", action: "undo_confirm" }] });
    }
  };

  const executeUndo = async () => {
    if (!lastAction || !user) return pushMessage({ sender: "Julia", text: "⚠️ No recent action to undo." });
    if (lastAction.type === "fillvl") {
      await supabase.from("timesheets").delete().eq("user_id", user.id).in("date", lastAction.dates).eq("task_name", "Vacation Leave");
      pushMessage({ sender: "Julia", text: "↩️ Undid the fill VL action." });
    } else if (lastAction.type === "submit") {
      await supabase.from("timesheets").update({ status: "draft", submitted_at: null }).eq("user_id", user.id).in("date", lastAction.dates);
      pushMessage({ sender: "Julia", text: "↩️ Reverted submitted timesheets back to draft." });
    }
    setLastAction(null);
  };

  const approveTimesheets = async () => {
    if (!user || !isAdmin) return pushMessage({ sender: "Julia", text: "⚠️ Only admin can approve timesheets." });

    const { data: pending } = await supabase.from("timesheets").select("*").eq("status", "submitted");
    if (!pending?.length) return pushMessage({ sender: "Julia", text: "⚠️ No timesheets to approve." });

    await supabase.from("timesheets").update({ status: "approved", approved_at: new Date() }).in("id", pending.map(t => t.id));
    pushMessage({ sender: "Julia", text: `✅ Approved ${pending.length} timesheet(s).` });

    // Notify employees
    for (const ts of pending) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", ts.user_id).single();
      await supabase.from("notifications").insert({ user_id: ts.user_id, message: `✅ Your timesheet for ${ts.date} has been approved by admin.` });
    }
  };

  // Real-time notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("julia_notifications_channel");

    // Admin: notify on new submissions
    if (isAdmin) {
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "timesheets" }, async (payload) => {
        const ts = payload.new;
        if (ts.user_id !== user.id) {
          setIsOpen(true);
          setHasNewMessage(true);

          const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", ts.user_id).single();
          const fullName = prof?.full_name || "An employee";

          pushMessage({ sender: "Julia", text: `📝 ${fullName} submitted a timesheet for ${ts.date}.` }, true);
        }
      });
    }

    // Employee: notify on approvals
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
      const note = payload.new;
      if (note.user_id === user.id) {
        setIsOpen(true);
        setHasNewMessage(true);
        pushMessage({ sender: "Julia", text: note.message }, true);
      }
    });

    channel.subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, isAdmin]);

  const handleSend = () => {
    if (!input.trim()) return;
    pushMessage({ sender: "You", text: input });
    const text = input.toLowerCase();
    setInput("");

    setTimeout(() => {
      if (text.includes("help")) pushMessage({ sender: "Julia", text: "Sure! You can ask me about tickets, timesheets, or IT issues." }, true);
      else pushMessage({ sender: "Julia", text: "I'm here! Ask me anything about Aetherboard." });
    }, 300);
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
      {!isOpen && <button onClick={() => { setIsOpen(true); setHasNewMessage(false); }} style={{ width: 60, height: 60, borderRadius: "50%", background: "#2563eb", color: "white", border: "none", fontSize: 26, cursor: "pointer", animation: hasNewMessage ? "bounce 1s infinite" : "none" }}>💬</button>}

      {isOpen && (
        <div style={{ width: 320, height: 420, background: "white", borderRadius: 16, boxShadow: "0 4px 18px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "#2563eb", color: "white", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><strong>Julia</strong><div style={{ fontSize: 12, opacity: 0.8 }}>AI Assistant</div></div>
            <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "white", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>

          <div ref={chatRef} style={{ flex: 1, background: "#f9fafb", padding: 10, overflowY: "auto" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.sender === "You" ? "flex-end" : "flex-start", marginBottom: 6 }}>
                <div style={{ background: msg.sender === "You" ? "#2563eb" : "#e5e7eb", color: msg.sender === "You" ? "white" : "#111827", padding: "8px 12px", borderRadius: 12, maxWidth: "75%", fontSize: 14 }}>
                  {msg.text}
                  {msg.options && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                      {msg.options.map((opt, idx) => <button key={idx} onClick={() => handleOptionClick(opt)} style={{ padding: "4px 8px", borderRadius: 12, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 12 }}>{opt.label}</button>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #ddd", padding: 8, display: "flex", gap: 6 }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Type a message..." style={{ flex: 1, border: "1px solid #ccc", borderRadius: 8, padding: "6px 10px", fontSize: 14 }} />
            <button onClick={handleSend} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Send</button>
          </div>
        </div>
      )}

      <style>{`@keyframes bounce {0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}`}</style>
    </div>
  );
}
