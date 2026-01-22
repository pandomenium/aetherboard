import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PayrollReview() {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cutoffType, setCutoffType] = useState("first"); // first | second
  const [payrollExists, setPayrollExists] = useState(false);

  /* ===============================
     FETCH PAYROLL BASED ON DAILY ENTRIES
  =============================== */
  const fetchRecords = async () => {
  setLoading(true);

  try {
    const [year, m] = month.split("-").map(Number);
    const lastDay = new Date(year, m, 0).getDate();

    const cutoff_start =
      cutoffType === "first"
        ? `${year}-${String(m).padStart(2, "0")}-01`
        : `${year}-${String(m).padStart(2, "0")}-16`;

    const cutoff_end =
      cutoffType === "first"
        ? `${year}-${String(m).padStart(2, "0")}-15`
        : `${year}-${String(m).padStart(2, "0")}-${lastDay}`;

    const { data, error } = await supabase
      .from("payroll_records")
      .select(`
        id,
        user_id,
        total_hours,
        overtime_hours,
        regular_pay,
        overtime_pay,
        total_pay,
        status,
        profiles (
          id,
          full_name,
          hourly_rate
        )
      `)
      .eq("cutoff_start", cutoff_start)
      .eq("cutoff_end", cutoff_end)
      .order("total_pay", { ascending: false });

    if (error) throw error;

    const rows = (data || []).map((r) => ({
      user_id: r.user_id,
      full_name: r.profiles?.full_name || "Unknown",
      hourly_rate: r.profiles?.hourly_rate || 0,
      total_hours: Number(r.total_hours || 0),
      overtime_hours: Number(r.overtime_hours || 0),
      total_pay: Number(r.total_pay || 0),
      status: r.status || "Pending",
    }));

    setRecords(rows);
    setFiltered(rows);
  } catch (err) {
    console.error("Error loading payroll:", err);
    setRecords([]);
    setFiltered([]);
  }

  setLoading(false);
};

const checkPayrollExists = async () => {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();

  const cutoff_start =
    cutoffType === "first"
      ? `${year}-${String(m).padStart(2, "0")}-01`
      : `${year}-${String(m).padStart(2, "0")}-16`;

  const cutoff_end =
    cutoffType === "first"
      ? `${year}-${String(m).padStart(2, "0")}-15`
      : `${year}-${String(m).padStart(2, "0")}-${lastDay}`;

  const { data, error } = await supabase
    .from("payroll_records")
    .select("id")
    .eq("cutoff_start", cutoff_start)
    .eq("cutoff_end", cutoff_end)
    .limit(1);

  if (!error && data.length > 0) {
    setPayrollExists(true);
  } else {
    setPayrollExists(false);
  }
};

  /* ===============================
     GENERATE PAYROLL
  =============================== */
  const generatePayroll = async () => {
    const [year, m] = month.split("-").map(Number);
    const lastDay = new Date(year, m, 0).getDate();

    const cutoff_start =
      cutoffType === "first"
        ? `${year}-${String(m).padStart(2, "0")}-01`
        : `${year}-${String(m).padStart(2, "0")}-16`;

    const cutoff_end =
      cutoffType === "first"
        ? `${year}-${String(m).padStart(2, "0")}-15`
        : `${year}-${String(m).padStart(2, "0")}-${lastDay}`;

    if (!confirm(`Generate payroll for ${cutoff_start} → ${cutoff_end}?`)) return;

    setGenerating(true);

    try {
      const { error } = await supabase.rpc("generate_payroll", {
        p_cutoff_start: cutoff_start,
        p_cutoff_end: cutoff_end,
      });

    if (error) {
      if (error.message.includes("unique_user_cutoff")) {
        alert("⚠️ Payroll for this cutoff already exists.\n\nYou cannot generate it twice.");
      } else {
        alert("⚠️ Payroll generation failed: " + error.message);
      }
      console.error(error);
    } else {
        alert("✅ Payroll successfully generated!");
        await fetchRecords(); // reload from payroll_records
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error: " + err.message);
    }

    setGenerating(false);
  };


  /* ===============================
     FILTERING
  =============================== */
  useEffect(() => {
    let data = [...records];

    if (statusFilter !== "All") {
      data = data.filter((r) => r.status === statusFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter((r) =>
        r.full_name.toLowerCase().includes(term)
      );
    }

    setFiltered(data);
  }, [records, statusFilter, search]);

  /* ===============================
     MARK AS PAID
  =============================== */
  const markAsPaid = async (user_id) => {
    if (!confirm("Mark this payroll as Paid? This cannot be undone.")) return;

    const [year, m] = month.split("-").map(Number);
    const lastDay = new Date(year, m, 0).getDate();

    const cutoff_start =
      cutoffType === "first"
        ? `${year}-${String(m).padStart(2, "0")}-01`
        : `${year}-${String(m).padStart(2, "0")}-16`;

    const cutoff_end =
      cutoffType === "first"
        ? `${year}-${String(m).padStart(2, "0")}-15`
        : `${year}-${String(m).padStart(2, "0")}-${lastDay}`;

    const { error } = await supabase
      .from("payroll_records")
      .update({ status: "Paid", paid_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .eq("cutoff_start", cutoff_start)
      .eq("cutoff_end", cutoff_end);

    if (error) {
      alert("Failed to mark payroll as paid.");
      console.error(error);
    } else {
      await fetchRecords();   // reload from DB
    }
  };

  useEffect(() => {
    fetchRecords();
    checkPayrollExists();
  }, [month, cutoffType]);

  if (loading) return <p>Loading payroll...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🧾 Payroll Review (Daily Entries)</h2>

      {/* Generate & Filter */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select value={cutoffType} onChange={(e) => setCutoffType(e.target.value)}>
          <option value="first">1–15</option>
          <option value="second">16–End</option>
        </select>
        <button
          onClick={generatePayroll}
          disabled={generating || payrollExists}
          style={{
            background: payrollExists ? "#9ca3af" : "#4f46e5",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            cursor: payrollExists ? "not-allowed" : "pointer",
            border: "none"
          }}
        >
          {payrollExists ? "Payroll Already Generated" : generating ? "Generating..." : "Generate Payroll"}
        </button>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
        <input placeholder="Search employee" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={th}>Employee</th>
            <th style={th}>Hours</th>
            <th style={th}>OT</th>
            <th style={th}>Total Pay</th>
            <th style={th}>Status</th>
            <th style={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "1rem" }}>No payroll records</td>
            </tr>
          ) : (
            filtered.map((r) => (
              <tr key={r.user_id}>
                <td style={td}>{r.full_name}</td>
                <td style={td}>{r.total_hours.toFixed(2)}</td>
                <td style={td}>{r.overtime_hours.toFixed(2)}</td>
                <td style={td}>₱{r.total_pay.toFixed(2)}</td>
                <td style={td}>
                  <strong style={{ color: r.status === "Paid" ? "green" : "orange" }}>{r.status}</strong>
                </td>
                <td style={td}>
                  {r.status !== "Paid" && (
                    <button onClick={() => markAsPaid(r.user_id)}>Mark Paid</button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* Styles */
const th = { padding: "8px", textAlign: "left" };
const td = { padding: "8px", borderBottom: "1px solid #eee" };
