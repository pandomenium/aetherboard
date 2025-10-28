import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function PayrollPage() {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    loadPayroll();
  }, []);

  const loadPayroll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payroll_records")
      .select(
        `
        id,
        user_id,
        profiles:profiles(full_name),
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
      `
      )
      .order("cutoff_end", { ascending: false });

    if (error) {
      console.error("Error loading payroll:", error);
    } else {
      setPayrollRecords(data);
      setFilteredRecords(data);
    }

    setLoading(false);
  };

  // Filter by status
  useEffect(() => {
    if (filterStatus === "All") {
      setFilteredRecords(payrollRecords);
    } else {
      setFilteredRecords(
        payrollRecords.filter((p) => p.status === filterStatus)
      );
    }
  }, [filterStatus, payrollRecords]);

  const markAsPaid = async (id) => {
    const { error } = await supabase
      .from("payroll_records")
      .update({ status: "Paid" })
      .eq("id", id);

    if (error) {
      alert("Error updating status: " + error.message);
      return;
    }

    setPayrollRecords((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "Paid" } : p))
    );
  };

  const generatePayroll = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const confirmGenerate = window.confirm(
      `Are you sure you want to generate payroll for ${startDate} to ${endDate}?`
    );

    if (!confirmGenerate) return;

    setGenerating(true);

    const { error } = await supabase.rpc("generate_payroll_records", {
      start_date: startDate,
      end_date: endDate,
    });

    if (error) {
      alert("Error generating payroll: " + error.message);
      console.error(error);
    } else {
      alert("✅ Payroll successfully generated!");
      await loadPayroll();
    }

    setGenerating(false);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (filteredRecords.length === 0) {
      alert("No records to export.");
      return;
    }

    const exportData = filteredRecords.map((p) => ({
      Employee: p.profiles?.full_name || "Unknown",
      "Cutoff Start": p.cutoff_start,
      "Cutoff End": p.cutoff_end,
      "Total Hours": p.total_hours,
      "Overtime Hours": p.overtime_hours,
      "Regular Pay": p.regular_pay,
      "Overtime Pay": p.overtime_pay,
      Deductions: p.deductions,
      "Net Pay": p.net_pay,
      Status: p.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");

    const fileName = `Payroll_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (filteredRecords.length === 0) {
      alert("No records to export.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Payroll Report", 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      22
    );

    const tableData = filteredRecords.map((p) => [
      p.profiles?.full_name || "Unknown",
      `${p.cutoff_start} → ${p.cutoff_end}`,
      p.total_hours.toFixed(2),
      p.overtime_hours.toFixed(2),
      `₱${p.regular_pay.toFixed(2)}`,
      `₱${p.overtime_pay.toFixed(2)}`,
      `₱${p.deductions?.toFixed(2) || 0}`,
      `₱${p.net_pay.toFixed(2)}`,
      p.status,
    ]);

    doc.autoTable({
      head: [
        [
          "Employee",
          "Cutoff Period",
          "Total Hours",
          "OT Hours",
          "Regular Pay",
          "OT Pay",
          "Deductions",
          "Net Pay",
          "Status",
        ],
      ],
      body: tableData,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [40, 167, 69] },
      styles: { fontSize: 9 },
    });

    doc.save(`Payroll_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return <p>Loading payroll records...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>👩‍💼 HR/Admin Payroll Records</h2>
      <p>Manage, filter, generate, and export payroll data.</p>

      {/* Generate Payroll */}
      <div
        style={{
          marginTop: "1.5rem",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: "10px",
          background: "#fafafa",
        }}
      >
        <h3>🧮 Generate Payroll</h3>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <label>Start Date: </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label>End Date: </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={generatePayroll}
            disabled={generating}
            style={{
              padding: "8px 14px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {generating ? "Generating..." : "Generate Payroll"}
          </button>
        </div>
      </div>

      {/* Filter & Export */}
      <div
        style={{
          marginTop: "2rem",
          marginBottom: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h3>📊 Payroll Records</h3>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div>
            <label>Status: </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "6px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <button
            onClick={exportToExcel}
            style={btnGreen}
          >
            📁 Export Excel
          </button>
          <button
            onClick={exportToPDF}
            style={btnRed}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      {filteredRecords.length === 0 ? (
        <p>No payroll records found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={th}>Employee</th>
              <th style={th}>Cutoff</th>
              <th style={th}>Hours</th>
              <th style={th}>OT</th>
              <th style={th}>Regular Pay</th>
              <th style={th}>OT Pay</th>
              <th style={th}>Deductions</th>
              <th style={th}>Net Pay</th>
              <th style={th}>Status</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.profiles?.full_name || "Unknown"}</td>
                <td style={td}>
                  {p.cutoff_start} → {p.cutoff_end}
                </td>
                <td style={td}>{p.total_hours.toFixed(2)}</td>
                <td style={td}>{p.overtime_hours.toFixed(2)}</td>
                <td style={td}>₱{p.regular_pay.toFixed(2)}</td>
                <td style={td}>₱{p.overtime_pay.toFixed(2)}</td>
                <td style={td}>₱{p.deductions?.toFixed(2) || 0}</td>
                <td style={td}>₱{p.net_pay.toFixed(2)}</td>
                <td style={td}>
                  <span
                    style={{
                      color: p.status === "Paid" ? "green" : "orange",
                      fontWeight: "bold",
                    }}
                  >
                    {p.status}
                  </span>
                </td>
                <td style={td}>
                  {p.status === "Pending" && (
                    <button
                      onClick={() => markAsPaid(p.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Mark as Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #ddd",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};

const btnGreen = {
  padding: "8px 14px",
  backgroundColor: "#28a745",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const btnRed = {
  padding: "8px 14px",
  backgroundColor: "#dc3545",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};
