import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PayrollPage() {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [cutoffType, setCutoffType] = useState("first"); // first = 1-15, second = 16-end
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    loadPayroll();
  }, []);

  /* =============================
     LOAD PAYROLL RECORDS
  ============================= */
  const loadPayroll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payroll_records")
      .select(`
        id,
        user_id,
        profiles:profiles(full_name, hourly_rate),
        cutoff_start,
        cutoff_end,
        total_hours,
        overtime_hours,
        regular_pay,
        overtime_pay,
        total_pay,
        deductions,
        net_pay,
        status
      `)
      .order("cutoff_end", { ascending: false });

    if (error) {
      console.error("Error loading payroll:", error);
      setPayrollRecords([]);
      setFilteredRecords([]);
    } else {
      setPayrollRecords(data || []);
      setFilteredRecords(data || []);
    }

    setLoading(false);
  };

  /* =============================
     FILTER BY MONTH, CUTOFF & STATUS
  ============================= */
  useEffect(() => {
    let data = [...payrollRecords];

    if (month) {
      const [year, m] = month.split("-");
      const lastDay = new Date(year, m, 0).getDate();
      const cutoff_start =
        cutoffType === "first" ? `${year}-${m}-01` : `${year}-${m}-16`;
      const cutoff_end =
        cutoffType === "first" ? `${year}-${m}-15` : `${year}-${m}-${lastDay}`;

      data = data.filter(
        (p) =>
          p.cutoff_start >= cutoff_start &&
          p.cutoff_end <= cutoff_end
      );
    }

    if (filterStatus !== "All") data = data.filter((p) => p.status === filterStatus);

    setFilteredRecords(data);
  }, [month, cutoffType, filterStatus, payrollRecords]);

  /* =============================
     EXPORT PDF: Payslip per employee per cutoff
  ============================= */
  const exportPayslipPDF = async () => {
    if (!filteredRecords.length) return alert("No records to export.");

    const doc = new jsPDF({ orientation: "portrait" });

    for (let i = 0; i < filteredRecords.length; i++) {
      const p = filteredRecords[i];

      // Header
      doc.setFontSize(14);
      doc.text("Payslip", 14, 15);
      doc.setFontSize(11);
      doc.text(`Employee: ${p.profiles?.full_name || "Unknown"}`, 14, 25);
      doc.text(`Cutoff Period: ${p.cutoff_start} → ${p.cutoff_end}`, 14, 32);
      doc.text(`Status: ${p.status}`, 14, 39);
      doc.text(`Total Hours: ${p.total_hours.toFixed(2)}`, 14, 46);
      doc.text(`Overtime Hours: ${p.overtime_hours.toFixed(2)}`, 14, 53);
      doc.text(`Net Pay: ₱${p.net_pay.toFixed(2)}`, 14, 60);

      // Fetch timesheet_entries for this employee in the cutoff
      const { data: entries } = await supabase
        .from("timesheet_entries")
        .select(`work_date, task, hours`)
        .eq("user_id", p.user_id)
        .gte("work_date", p.cutoff_start)
        .lte("work_date", p.cutoff_end)
        .order("work_date", { ascending: true });

      const tableBody = (entries || []).map((e) => [
        e.work_date,
        e.task,
        e.hours.toFixed(2),
        Math.max(e.hours - 8, 0).toFixed(2),
      ]);

      // Daily entries table
      autoTable(doc, {
        head: [["Date", "Task", "Hours", "OT Hours"]],
        body: tableBody,
        startY: 70,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [40, 167, 69] },
      });

      if (i < filteredRecords.length - 1) doc.addPage(); // page break for next employee
    }

    doc.save(`Payslip_${month}_${cutoffType}.pdf`);
  };

  if (loading) return <p>Loading payroll records...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📄 Employee Payslips</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div>
          <label>Month: </label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>

        <div>
          <label>Cutoff: </label>
          <select value={cutoffType} onChange={(e) => setCutoffType(e.target.value)}>
            <option value="first">1–15</option>
            <option value="second">16–End</option>
          </select>
        </div>

        <div>
          <label>Status: </label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <button onClick={exportPayslipPDF} style={btnRed}>📄 Export PDF</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={th}>Employee</th>
              <th style={th}>Cutoff</th>
              <th style={th}>Hours</th>
              <th style={th}>OT</th>
              <th style={th}>Net Pay</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.profiles?.full_name || "Unknown"}</td>
                <td style={td}>{p.cutoff_start} → {p.cutoff_end}</td>
                <td style={td}>{p.total_hours.toFixed(2)}</td>
                <td style={td}>{p.overtime_hours.toFixed(2)}</td>
                <td style={td}>₱{p.net_pay.toFixed(2)}</td>
                <td style={td}><b>{p.status}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Styles */
const th = { textAlign: "left", padding: "10px", borderBottom: "1px solid #ddd" };
const td = { padding: "10px", borderBottom: "1px solid #eee" };
const btnRed = { padding: "8px 14px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" };
