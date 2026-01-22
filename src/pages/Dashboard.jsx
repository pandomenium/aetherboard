import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Bell } from "lucide-react";
import "../css/Dashboard.css";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [boards, setBoards] = useState([]);
  const [newBoard, setNewBoard] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();
  const accountRef = useRef(null);
  const notifRef = useRef(null);

  /* ================= AUTH ================= */
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return navigate("/login");
      setUser(data.session.user);
      fetchRole(data.session.user.id);
    };
    loadUser();
  }, [navigate]);

  const fetchRole = async (id) => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    if (data) setRole(data.role);
  };

  /* ================= BOARDS ================= */
  useEffect(() => {
    if (!user) return;
    supabase
      .from("boards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setBoards(data || []));
  }, [user]);

  const createBoard = async () => {
    if (!newBoard.trim()) return;
    const { data } = await supabase
      .from("boards")
      .insert([{ title: newBoard, user_id: user.id }])
      .select();

    setBoards([data[0], ...boards]);
    setNewBoard("");
    setShowModal(false);
  };

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const close = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* ================= NAV ================= */
  const navItems = [
    ...(role === "admin"
      ? [
        { icon: "📋", name: "Timesheet Review", path: "/manager-timesheet" },
        { icon: "🧾", name: "Payroll Review", path: "/payroll-review" },
        { icon: "🎯", name: "SmartFilter HR", path: "/smartfilter" },
        ]
      : []),
    { icon: "🕒", name: "Timesheet", path: "/timesheet" },
    { icon: "💰", name: "Payroll", path: "/payroll" },
    { icon: "🐛", name: "IT Tickets", path: "/tickets" },
    { icon: "💬", name: "Messages", path: "/messages" },
    { icon: "📄", name: "Documents", path: "/documents" },
    { icon: "📊", name: "Analytics", path: "/analytics" },
    { icon: "⚙️", name: "Settings", path: "/settings" },
  ];

  /* ================= DARK MODE ================= */
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" || false
  );

  // Apply saved mode on load
  useEffect(() => {
    if (darkMode) document.body.classList.add("dark");
  }, [darkMode]);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.body.classList.remove("dark");
    } else {
      document.body.classList.add("dark");
    }
    setDarkMode(!darkMode);
    localStorage.setItem("darkMode", !darkMode);
  };


  return (
    <div className="dashboard">
      {/* ================= SIDEBAR ================= */}
      <aside className={`sidebar ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <div>
          <div className="logo" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen && <h1>AetherBoard</h1>}
            <span className="toggle-icon">{sidebarOpen ? "⏴" : "⏵"}</span>
          </div>

          <nav>
            {navItems.map((item) => (
              <div className="nav-item" key={item.name}>
                <Link to={item.path}>
                  <span className="nav-icon">{item.icon}</span>
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
                {!sidebarOpen && <span className="tooltip">{item.name}</span>}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="main">
        <header className="main-header">
          <div>
            <h2>Dashboard</h2>
            <p>
              Welcome back, <strong>{user?.email}</strong>{" "}
              <em>({role || "Loading"})</em>
            </p>
          </div>

          <div className="header-actions">
            {/* ===== New Board Button (Already Exists) ===== */}
            <button
              className="new-board primary"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} />
              <span>New Board</span>
            </button>

            {/* ===== Notifications ===== */}
            <div className="notif-wrapper" ref={notifRef}>
              <div
                className="notif-icon"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                <span className="notif-dot" />
              </div>

              {showNotifications && (
                <div className="notif-menu">
                  <h4>Notifications</h4>
                  <div className="notif-item">📌 New board created</div>
                  <div className="notif-item">🕒 Timesheet pending approval</div>
                  <div className="notif-item">🎯 SmartFilter HR updated</div>
                </div>
              )}
            </div>

            {/* ===== Avatar / Account Menu ===== */}
            <div className="avatar-wrapper" ref={accountRef}>
              <div
                className="user-icon"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
              >
                {user?.email?.[0]?.toUpperCase()}
              </div>

              {showAccountMenu && (
                <div className="account-menu">
                  {/* User Info */}
                  <div className="profile-user">
                    <div>
                      <p className="profile-name">{user?.email}</p>
                    </div>
                  </div>

                  <div className="menu-divider" />

                  <Link to="/settings" className="menu-item">
                    👤 Profile Settings
                  </Link>
                  <Link to="/roadmap" className="menu-item">
                    🛣️ Product Roadmap
                  </Link>
                  <Link to="/support" className="menu-item">
                    🆘 Support
                  </Link>

                  {/* Dark Mode Toggle */}
                  <button className="menu-item" onClick={toggleDarkMode}>
                    {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
                  </button>

                  <div className="menu-divider" />

                  <button className="menu-item logout" onClick={handleLogout}>
                    🚪 Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="boards">
          <h3>Your Boards</h3>
          <div className="board-grid">
            {boards.map((board) => (
              <Link key={board.id} to={`/board/${board.id}`} className="board-card">
                <h4>{board.title}</h4>
                <p>Click to open board</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Board</h3>
            <input
              value={newBoard}
              onChange={(e) => setNewBoard(e.target.value)}
              placeholder="Enter board title..."
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="create-btn" onClick={createBoard}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
