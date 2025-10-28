import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Profile");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ✅ Detect screen resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Get Supabase user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    getUser();
  }, []);

  // ✅ Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // ✅ Content per tab
  const renderContent = () => {
    switch (activeTab) {
      case "Profile":
        return (
          <div style={styles.panel}>
            <h2>👤 Profile Settings</h2>
            <hr />
            <label>Name:</label>
            <input style={styles.input} type="text" placeholder="Your name" />
            <label>Email:</label>
            <input
              style={styles.input}
              type="email"
              value={user?.email || ""}
              readOnly
            />
            <label>Role:</label>
            <select style={styles.input}>
              <option>Employee</option>
              <option>HR</option>
              <option>Admin</option>
            </select>
            <button style={styles.button}>Save Changes</button>
          </div>
        );

      case "Organization":
        return (
          <div style={styles.panel}>
            <h2>🏢 Organization Settings</h2>
            <hr />
            <label>Company Name:</label>
            <input style={styles.input} type="text" placeholder="Company name" />
            <label>Timezone:</label>
            <select style={styles.input}>
              <option>GMT+8 (Philippines)</option>
              <option>GMT+9 (Japan)</option>
              <option>GMT+0 (London)</option>
            </select>
            <button style={styles.button}>Save Changes</button>
          </div>
        );

      case "Payroll":
        return (
          <div style={styles.panel}>
            <h2>💸 Payroll & Finance</h2>
            <hr />
            <label>Default Rate:</label>
            <input style={styles.input} type="number" placeholder="e.g., 100" />
            <label>Overtime Rate:</label>
            <input style={styles.input} type="number" placeholder="e.g., 150" />
            <label>Currency:</label>
            <select style={styles.input}>
              <option>PHP</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
            <button style={styles.button}>Save Changes</button>
          </div>
        );

      case "Notifications":
        return (
          <div style={styles.panel}>
            <h2>🔔 Notifications</h2>
            <hr />
            <label>
              <input type="checkbox" /> Email me when a ticket is created
            </label>
            <label>
              <input type="checkbox" /> Alert me when payroll is approved
            </label>
            <label>
              <input type="checkbox" /> Julia sends overdue reminders
            </label>
            <button style={styles.button}>Save Changes</button>
          </div>
        );

      case "Appearance":
        return (
          <div style={styles.panel}>
            <h2>🎨 Appearance</h2>
            <hr />
            <label>Accent Color:</label>
            <input style={{ ...styles.input, height: "35px" }} type="color" />
            <label>Layout:</label>
            <select style={styles.input}>
              <option>Compact</option>
              <option>Comfortable</option>
            </select>
            <button style={styles.button}>Save Changes</button>
          </div>
        );

      default:
        return <div style={styles.panel}>Select a setting from the sidebar.</div>;
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.logo}>Aetherboard</h1>
        <div>
          <button style={styles.navButton} onClick={() => navigate("/dashboard")}>
            Dashboard
          </button>
          <button style={styles.navButton} onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={styles.container}>
        {/* Sidebar or Dropdown */}
        {isMobile ? (
          <div style={styles.mobileMenu}>
            <label>⚙️ Select Setting:</label>
            <select
              style={{ ...styles.input, width: "100%" }}
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              <option>Profile</option>
              <option>Organization</option>
              <option>Payroll</option>
              <option>Notifications</option>
              <option>Appearance</option>
            </select>
          </div>
        ) : (
          <div style={styles.sidebar}>
            <h3 style={{ marginBottom: 20 }}>⚙️ Settings</h3>
            {["Profile", "Organization", "Payroll", "Notifications", "Appearance"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    ...styles.sidebarBtn,
                    backgroundColor: activeTab === tab ? "#007bff" : "#f5f5f5",
                    color: activeTab === tab ? "white" : "black",
                  }}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        )}

        {/* Content */}
        <div style={styles.main}>{renderContent()}</div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f9fafb",
  },
  header: {
    background: "#007bff",
    color: "white",
    padding: "15px 25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  logo: { margin: 0, fontSize: "22px", letterSpacing: "1px" },
  navButton: {
    marginLeft: "10px",
    background: "white",
    color: "#007bff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    height: "calc(100vh - 60px)",
  },
  sidebar: {
    width: "230px",
    background: "#f5f5f5",
    padding: "20px",
    borderRight: "1px solid #ccc",
    display: "flex",
    flexDirection: "column",
  },
  sidebarBtn: {
    padding: "10px 15px",
    marginBottom: "10px",
    border: "none",
    borderRadius: "6px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "15px",
    transition: "0.2s",
  },
  mobileMenu: {
    display: "flex",
    flexDirection: "column",
    padding: "15px",
    background: "#f5f5f5",
    borderBottom: "1px solid #ccc",
  },
  main: {
    flex: 1,
    padding: "30px",
    overflowY: "auto",
    background: "white",
  },
  panel: {
    maxWidth: "500px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  input: {
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    marginBottom: "10px",
  },
  button: {
    background: "#007bff",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
};
