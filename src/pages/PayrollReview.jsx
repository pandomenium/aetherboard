import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export default function PayrollReview() {
  const [records, setRecords] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [generating, setGenerating] = useState(false)

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from("payroll_records")
      .select(`
        id, user_id, cutoff_start, cutoff_end,
        total_hours, overtime_hours, regular_pay,
        overtime_pay, total_pay, deductions, net_pay,
        status, created_at, profiles ( full_name, email )
      `)
      .order("cutoff_end", { ascending: false })

    if (error) console.error(error)
    else {
      setRecords(data)
      setFiltered(data)
    }
    setLoading(false)
  }

  const generatePayroll = async () => {
    if (!confirm("Generate payroll for the current cutoff?")) return
    setGenerating(true)

    const { error } = await supabase.rpc("generate_monthly_payroll")
    if (error) {
      alert("⚠️ Error generating payroll: " + error.message)
    } else {
      alert("✅ Payroll successfully generated!")
      await fetchRecords()
    }

    setGenerating(false)
  }

  const applyFilters = () => {
    let filteredData = [...records]

    // Filter by status
    if (statusFilter !== "All") {
      filteredData = filteredData.filter((r) => r.status === statusFilter)
    }

    // Filter by search
    if (search.trim()) {
      const term = search.toLowerCase()
      filteredData = filteredData.filter(
        (r) =>
          r.profiles?.full_name?.toLowerCase().includes(term) ||
          r.profiles?.email?.toLowerCase().includes(term)
      )
    }

    // Filter by cutoff date range
    if (dateRange.start && dateRange.end) {
      filteredData = filteredData.filter(
        (r) =>
          r.cutoff_start >= dateRange.start && r.cutoff_end <= dateRange.end
      )
    }

    setFiltered(filteredData)
  }

  const markAsPaid = async (id) => {
    const { error } = await supabase
      .from("payroll_records")
      .update({ status: "Paid" })
      .eq("id", id)

    if (error) alert("Error updating status")
    else {
      alert("✅ Payroll marked as Paid!")
      fetchRecords()
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [statusFilter, search, dateRange, records])

  if (loading) return <p>Loading payroll records...</p>

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
        🧾 Payroll Review (HR/Admin)
      </h2>

      {/* --- Action buttons --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <button
          onClick={generatePayroll}
          disabled={generating}
          style={{
            background: "#2563eb",
            color: "white",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          {generating ? "Generating..." : "⚙️ Generate Payroll"}
        </button>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <label>Status: </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div>
            <label>Search: </label>
            <input
              type="text"
              placeholder="Employee name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label>From: </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
            />
          </div>
          <div>
            <label>To: </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* --- Table --- */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={th}>Employee</th>
            <th style={th}>Cutoff</th>
            <th style={th}>Regular Hours</th>
            <th style={th}>OT Hours</th>
            <th style={th}>Total Pay</th>
            <th style={th}>Status</th>
            <th style={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 ? (
            filtered.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={td}>{r.profiles?.full_name || "N/A"}</td>
                <td style={td}>
                  {r.cutoff_start} → {r.cutoff_end}
                </td>
                <td style={td}>{r.total_hours}</td>
                <td style={td}>{r.overtime_hours}</td>
                <td style={td}>₱{r.total_pay.toFixed(2)}</td>
                <td style={td}>
                  <span
                    style={{
                      color: r.status === "Paid" ? "green" : "orange",
                      fontWeight: "bold",
                    }}
                  >
                    {r.status}
                  </span>
                </td>
                <td style={td}>
                  <button onClick={() => setSelected(r)}>View</button>{" "}
                  {r.status !== "Paid" && (
                    <button onClick={() => markAsPaid(r.id)}>Mark Paid</button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* --- Modal --- */}
      {selected && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>Payroll Details</h3>
            <p><strong>Employee:</strong> {selected.profiles?.full_name}</p>
            <p><strong>Cutoff:</strong> {selected.cutoff_start} → {selected.cutoff_end}</p>
            <p><strong>Regular Hours:</strong> {selected.total_hours}</p>
            <p><strong>Overtime Hours:</strong> {selected.overtime_hours}</p>
            <p><strong>Regular Pay:</strong> ₱{selected.regular_pay}</p>
            <p><strong>Overtime Pay:</strong> ₱{selected.overtime_pay}</p>
            <p><strong>Total Pay:</strong> ₱{selected.total_pay}</p>
            <p><strong>Deductions:</strong> ₱{selected.deductions}</p>
            <p><strong>Net Pay:</strong> ₱{selected.net_pay}</p>
            <p><strong>Status:</strong> {selected.status}</p>
            <button onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { padding: "8px", textAlign: "left" }
const td = { padding: "8px" }

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
}

const modalContent = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  width: "400px",
  maxHeight: "80vh",
  overflowY: "auto",
}
