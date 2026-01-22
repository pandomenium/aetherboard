import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../css/Documents.css";

export default function Documents() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  // Load user
  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return navigate("/login");
      setUser(session.user);
      fetchDocuments(session.user.id);
    };

    loadSession();
  }, []);

  // Load documents from Supabase
  const fetchDocuments = async (userId) => {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    setDocuments(data || []);
  };

  // Create new document
  const createDocument = async () => {
    const { data, error } = await supabase
      .from("documents")
      .insert([
        {
          title: "Untitled Document",
          content: "",
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (!error && data) navigate(`/document-editor/${data.id}`);
  };

  return (
    <div className="documents-page">
      <header className="documents-header">
        <h1>Your Documents</h1>
        <button className="new-doc-btn" onClick={createDocument}>
          + New Document
        </button>
      </header>

      {documents.length === 0 ? (
        <p className="empty-text">
          No documents yet. Click <strong>New Document</strong> to create one.
        </p>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              to={`/document-editor/${doc.id}`}
              className="doc-card"
            >
              <h3>{doc.title}</h3>
              <p className="date">
                Updated: {new Date(doc.updated_at).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
