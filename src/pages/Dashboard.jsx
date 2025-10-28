import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { Moon, Sun, LogOut, Plus } from "lucide-react";
import "../css/Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [boards, setBoards] = useState([]);
  const [newBoard, setNewBoard] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // === Fetch user session + role ===
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
        fetchRole(session.user.id);
      }
    };
    getUser();
  }, [navigate]);

  // === Fetch user role ===
  const fetchRole = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!error && data) setRole(data.role);
  };

  // === Fetch boards ===
  useEffect(() => {
    const fetchBoards = async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (!error) setBoards(data || []);
    };
    if (user) fetchBoards();
  }, [user]);

  // === Create board ===
  const createBoard = async () => {
    if (!newBoard.trim()) return;
    const { data, error } = await supabase
      .from("boards")
      .insert([{ title: newBoard, user_id: user?.id }])
      .select();
    if (!error) {
      setBoards([data[0], ...boards]);
      setNewBoard("");
      setShowModal(false);
    }
  };

  // === Logout ===
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // === Dark Mode ===
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark");
  };

  // === Sidebar nav ===
  const navItems = [
    { icon: "🕒", name: "Timesheet", path: "/timesheet" },
    ...(role === "manager"
      ? [{ icon: "📋", name: "Timesheet Review", path: "/manager-timesheet" }]
      : []),
    { icon: "🐛", name: "IT Tickets", path: "/tickets" },
    { icon: "💬", name: "Messages", path: "/messages" },
    { icon: "💰", name: "Payroll", path: "/payroll" },
    ...(role === "HR" || role === "admin"
      ? [{ icon: "🧾", name: "Payroll Review", path: "/payroll-review" }]
      : []),
    { icon: "📊", name: "Analytics", path: "/analytics" },
    { icon: "⚙️", name: "Settings", path: "/settings" },
  ];

  return (
    <div className="dashboard">
      {/* ===== Sidebar ===== */}
      <aside className={`sidebar ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <div>
          <div
            className="logo"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            {sidebarOpen && <h1>AetherBoard</h1>}
            <span className="toggle-icon">{sidebarOpen ? "⏴" : "⏵"}</span>
          </div>

          <nav>
            {navItems.map((item) => (
              <div className="nav-item" key={item.name}>
                <Link to={item.path}>
                  <span className="nav-icon">{item.icon}</span>
                  <span
                    className={`nav-text ${sidebarOpen ? "show" : "hide"}`}
                  >
                    {item.name}
                  </span>
                </Link>
                {!sidebarOpen && (
                  <span className="tooltip">{item.name}</span>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button onClick={toggleDarkMode} className="mode-btn">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {sidebarOpen && (darkMode ? "Light Mode" : "Dark Mode")}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} /> {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* ===== Main ===== */}
      <main className="main">
        <header className="main-header">
          <div>
            <h2>Dashboard</h2>
            <p>
              Welcome back, <strong>{user?.email}</strong>{" "}
              <em>({role || "Loading..."})</em>
            </p>
          </div>

          {user && (
            <div className="header-actions">
              <button onClick={() => setShowModal(true)} className="new-board">
                <Plus size={18} /> New Board
              </button>
              <div className="user-icon">
                {user.email.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </header>

        <section className="boards">
          <h3>Your Boards</h3>
          {boards.length > 0 ? (
            <div className="board-grid">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  to={`/board/${board.id}`}
                  className="board-card"
                >
                  <h4>{board.title}</h4>
                  <p>Click to open board</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="no-boards">
              No boards yet. Click <strong>New Board</strong> to create one.
            </p>
          )}
        </section>
      </main>

      {/* ===== Modal ===== */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Board</h3>
            <input
              type="text"
              value={newBoard}
              onChange={(e) => setNewBoard(e.target.value)}
              placeholder="Enter board title..."
            />
            <div className="modal-actions">
              <button
                onClick={() => setShowModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button onClick={createBoard} className="create-btn">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

