import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function Analytics() {
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedRange, setSelectedRange] = useState("This Month");

  // Sample Data (you’ll later replace with Supabase data)
  const taskData = [
    { name: "Week 1", completed: 40 },
    { name: "Week 2", completed: 55 },
    { name: "Week 3", completed: 75 },
    { name: "Week 4", completed: 90 },
  ];

  const ticketData = [
    { name: "Mon", hours: 3 },
    { name: "Tue", hours: 2 },
    { name: "Wed", hours: 4 },
    { name: "Thu", hours: 5 },
    { name: "Fri", hours: 3 },
  ];

  const payrollData = [
    { month: "Jan", cost: 950000 },
    { month: "Feb", cost: 1100000 },
    { month: "Mar", cost: 1200000 },
    { month: "Apr", cost: 1250000 },
  ];

  const overtimeData = [
    { name: "Normal Hours", value: 80 },
    { name: "Overtime", value: 20 },
  ];

  const pieColors = ["#4caf50", "#ff9800"];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Aetherboard Analytics</h1>

        <div style={styles.filters}>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            style={styles.select}
          >
            <option>All Departments</option>
            <option>HR</option>
            <option>Finance</option>
            <option>IT</option>
            <option>R&D</option>
          </select>

          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            style={styles.select}
          >
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
        </div>
      </header>

      {/* Metric Cards */}
      <section style={styles.cards}>
        {[
          { title: "Total Tasks", value: "248" },
          { title: "Open Tickets", value: "37" },
          { title: "Payroll Cost", value: "₱1.2M" },
          { title: "Avg. Overtime", value: "3.4 hrs" },
        ].map((card, index) => (
          <div key={index} style={styles.card}>
            <h3 style={styles.cardTitle}>{card.title}</h3>
            <p style={styles.cardValue}>{card.value}</p>
          </div>
        ))}
      </section>

      {/* Charts */}
      <section style={styles.charts}>
        {/* Task Completion Rate */}
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Task Completion Rate</h3>
          <LineChart width={400} height={200} data={taskData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#4caf50"
              strokeWidth={3}
            />
          </LineChart>
        </div>

        {/* Ticket Resolution Time */}
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Ticket Resolution Time</h3>
          <BarChart width={400} height={200} data={ticketData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill="#2196f3" radius={[5, 5, 0, 0]} />
          </BarChart>
        </div>

        {/* Payroll Trends */}
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Payroll Trends</h3>
          <AreaChart width={400} height={200} data={payrollData}>
            <defs>
              <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff9800" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ff9800" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#ff9800"
              fillOpacity={1}
              fill="url(#colorPayroll)"
            />
          </AreaChart>
        </div>

        {/* Overtime Analysis */}
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Overtime Analysis</h3>
          <PieChart width={400} height={200}>
            <Pie
              data={overtimeData}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
              label
            >
              {overtimeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </div>
      </section>

      {/* Julia Insights */}
      <aside style={styles.juliaPanel}>
        <h3 style={styles.juliaTitle}>Julia Insights</h3>
        <p style={styles.juliaText}>
          Based on current data, Finance payroll costs have increased by 12% this month.
          HR overtime remains stable. IT ticket backlog is growing — 18 unresolved tickets detected.
        </p>
      </aside>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    background: "#f7f8fa",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: { fontSize: "28px", color: "#333" },
  filters: { display: "flex", gap: "10px" },
  select: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "15px",
    marginBottom: "30px",
  },
  card: {
    background: "#fff",
    borderRadius: "10px",
    padding: "15px",
    textAlign: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  cardTitle: { fontSize: "16px", color: "#666" },
  cardValue: { fontSize: "24px", fontWeight: "bold", color: "#222" },
  charts: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
  },
  chartBox: {
    background: "#fff",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  chartTitle: { marginBottom: "10px", color: "#333" },
  juliaPanel: {
    marginTop: "30px",
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  juliaTitle: { fontSize: "18px", marginBottom: "10px", color: "#333" },
  juliaText: { color: "#555", lineHeight: "1.5" },
};
