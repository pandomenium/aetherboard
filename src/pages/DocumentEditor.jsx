import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../css/DocumentEditor.css";

export default function DocumentEditor() {
  const { id } = useParams(); // document id if editing existing
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("Untitled Document");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // ===== Load user =====
  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return navigate("/login");
      setUser(session.user);
    };
    load();
  }, []);

  // ===== Load existing document =====
  useEffect(() => {
    if (!id) return; // new document
    const loadDoc = async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setTitle(data.title);
        setContent(data.content || "");
        document.querySelector(".editor-area").innerHTML = data.content || "";
      }
    };
    loadDoc();
  }, [id]);

  // ===== Formatting buttons =====
  const format = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  // ===== Manual save =====
  const saveDocument = async () => {
    if (!user) return;

    setSaving(true);

    if (!id) {
      // Create new document
      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            title,
            content,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (!error) navigate(`/document-editor/${data.id}`);
    } else {
      // Update existing
      await supabase
        .from("documents")
        .update({
          title,
          content,
          updated_at: new Date(),
        })
        .eq("id", id);
    }

    setTimeout(() => setSaving(false), 600);
  };

  // ===== Auto-save every 3 seconds =====
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) saveDocument();
    }, 3000);
    return () => clearInterval(interval);
  });

  return (
    <div className="doc-editor-container">
      {/* ===== Top Bar ===== */}
      <header className="doc-header">
        <input
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <button className="save-btn" onClick={saveDocument}>
          {saving ? "Saving..." : "Save"}
        </button>
      </header>

      {/* ===== Toolbar ===== */}
      <div className="toolbar">
        <button onClick={() => format("bold")}><b>B</b></button>
        <button onClick={() => format("italic")}><i>I</i></button>
        <button onClick={() => format("underline")}><u>U</u></button>

        <span className="divider"></span>

        <select
          onChange={(e) => format("formatBlock", e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>
            Text Style
          </option>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <span className="divider"></span>

        <button onClick={() => format("insertUnorderedList")}>• List</button>
        <button onClick={() => format("insertOrderedList")}>1. List</button>
      </div>

      {/* ===== Editable Area ===== */}
      <div
        className="editor-area"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setContent(e.target.innerHTML)}
      ></div>
    </div>
  );
}
