import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import JuliaInsights from "../components/JuliaInsights";

export default function Analytics() {
  const today = new Date();
  const defaultMonth = today.toISOString().slice(0, 7); // "YYYY-MM"
  
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedRange, setSelectedRange] = useState("This Month");
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const [newSale, setNewSale] = useState({ product: "", total_amount: "", sale_date: "" });
  const [newExpense, setNewExpense] = useState({ amount: "", expense_date: "", category: "", department: "Sales" });
  const formatCurrency = (value) => {
    const number = value.replace(/[^\d]/g, "");
    if (!number) return "";
    return new Intl.NumberFormat("en-PH").format(number);
  };
  // ------------------------------
  // Fetch sales
  // ------------------------------
  const fetchSales = async () => {
    let query = supabase.from("sales").select("*");
    if (selectedDepartment !== "All") query = query.eq("department", selectedDepartment);
    const { data, error } = await query;
    if (error) console.error(error);
    setSalesData(data || []);
  };

  // ------------------------------
  // Fetch expenses
  // ------------------------------
  const fetchExpenses = async () => {
    const { data, error } = await supabase.from("expenses").select("*");
    if (error) console.error(error);
    setExpensesData(data || []);
  };

  useEffect(() => {
    fetchSales();
    fetchExpenses();

    const salesChannel = supabase
      .channel("sales_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, fetchSales)
      .subscribe();

    const expensesChannel = supabase
      .channel("expenses_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, fetchExpenses)
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, [selectedDepartment]);

  // ------------------------------
  // Add Sale
  // ------------------------------
  const handleAddSale = async () => {
    // Basic validation
    if (!newSale.product || !newSale.total_amount || !newSale.sale_date) {
      return alert("Please fill all fields.");
    }

    if (Number(newSale.total_amount) <= 0) {
      return alert("Amount must be greater than 0.");
    }

    // Check for existing sale (same product, date, department)
    const { data: existing, error: checkError } = await supabase
      .from("sales")
      .select("id")
      .eq("product", newSale.product)
      .eq("sale_date", newSale.sale_date)
      .eq("department", "Sales");

    if (checkError) {
      return alert(checkError.message);
    }

    if (existing && existing.length > 0) {
      return alert("This product already exists for this date.");
    }

    // Insert new sale
    const { error } = await supabase.from("sales").insert([{
      product: newSale.product,
      total_amount: Number(newSale.total_amount.replace(/,/g, "")),
      sale_date: newSale.sale_date,
      department: "Sales",
    }]);

    if (error) {
      return alert(error.message);
    }

    setNewSale({ product: "", total_amount: "", sale_date: "" });
    setShowSaleForm(false);
    fetchSales();
  };

  // ------------------------------
  // Add Expense
  // ------------------------------
  const handleAddExpense = async () => {
    const amount = Number(newExpense.amount);

    if (!newExpense.category || !newExpense.expense_date)
      return alert("All fields are required.");

    if (!amount || amount <= 0)
      return alert("Amount must be greater than 0.");

    // 🔥 Prevent duplicate category except "Other Expenses"
    if (newExpense.category !== "Other Expenses") {
      const { data: existing } = await supabase
        .from("expenses")
        .select("id")
        .eq("category", newExpense.category)
        .eq("expense_date", newExpense.expense_date)
        .eq("department", "Sales");

      if (existing && existing.length > 0) {
        return alert("This category already exists for this date.");
      }
    }

    const { error } = await supabase.from("expenses").insert([{
      amount: Number(newExpense.amount.replace(/,/g, "")),
      expense_date: newExpense.expense_date,
      category: newExpense.category,
      department: "Sales",
    }]);

    if (error) return alert(error.message);

    setNewExpense({
      amount: "",
      expense_date: "",
      category: "Lugaw Expenses",
      department: "Sales",
    });

    setShowExpenseForm(false);
    fetchExpenses();
  };

  // ------------------------------
  // Chart Data Prep
  // ------------------------------
  const salesPerPeriod = (() => {
    const data = [];
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0);
    const today = new Date();

    if (selectedRange === "This Week") {
      // start from Monday
      const referenceDate = today.getMonth() === monthIndex ? today : endOfMonth;
      const weekStart = new Date(referenceDate);
      weekStart.setDate(referenceDate.getDate() - ((referenceDate.getDay() + 6) % 7)); // Monday as start

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        if (d.getMonth() === monthIndex) {
          const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
          const daySales = salesData
            .filter(s => new Date(s.sale_date).toDateString() === d.toDateString())
            .reduce((sum, s) => sum + s.total_amount, 0);
          data.push({ name: dayLabel, total: daySales });
        }
      }
    } else if (selectedRange === "This Month") {
      let weekNum = 1;
      let weekStart = new Date(startOfMonth);

      while (weekStart <= endOfMonth) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(Math.min(weekStart.getDate() + 6, endOfMonth.getDate())); // cap at month end

        const weekSales = salesData
          .filter(s => {
            const d = new Date(s.sale_date);
            return d >= weekStart && d <= weekEnd;
          })
          .reduce((sum, s) => sum + s.total_amount, 0);

        data.push({ name: `Week ${weekNum}`, total: weekSales });
        weekNum++;

        weekStart.setDate(weekEnd.getDate() + 1); // next week starts after current week
      }
    } else if (selectedRange === "This Year") {
      for (let m = 0; m < 12; m++) {
        const monthSales = salesData
          .filter(s => new Date(s.sale_date).getMonth() === m)
          .reduce((sum, s) => sum + s.total_amount, 0);
        data.push({ name: new Date(0, m).toLocaleString("en-US", { month: "long" }), total: monthSales });
      }
    }

    return data;
  })();

  // Top-Selling Products
  const revenuePerProduct = salesData.reduce((acc, cur) => {
    const existing = acc.find(a => a.name === cur.product);
    if (existing) existing.value += cur.total_amount;
    else acc.push({ name: cur.product, value: cur.total_amount });
    return acc;
  }, []);
  const topSellingProducts = [...revenuePerProduct].sort((a, b) => b.value - a.value);

  // Profit / Revenue / Expenses combined
  const profitData = (() => {
    if (selectedRange === "This Year") {
      return [...Array(12)].map((_, i) => {
        const monthName = new Date(0, i).toLocaleString("en-US", { month: "long" });
        const revenue = salesData.filter(s => new Date(s.sale_date).getMonth() === i)
          .reduce((sum, s) => sum + s.total_amount, 0);
        const expense = expensesData.filter(e => new Date(e.expense_date).getMonth() === i)
          .reduce((sum, e) => sum + e.amount, 0);
        return { name: monthName, revenue, expense, profit: revenue - expense };
      });
    }
    const monthIndex = Number(selectedMonth.split("-")[1]) - 1;
    const monthName = new Date(0, monthIndex).toLocaleString("en-US", { month: "long" });
    const revenue = salesData.filter(s => new Date(s.sale_date).getMonth() === monthIndex)
      .reduce((sum, s) => sum + s.total_amount, 0);
    const expense = expensesData.filter(e => new Date(e.expense_date).getMonth() === monthIndex)
      .reduce((sum, e) => sum + e.amount, 0);
    return [{ name: monthName, revenue, expense, profit: revenue - expense }];
  })();

  // Sales vs Target
  const totalSalesForMonth = salesData.filter(s => new Date(s.sale_date).getMonth() === Number(selectedMonth.split("-")[1]) - 1)
    .reduce((sum, s) => sum + s.total_amount, 0);
  const monthlyTarget = 80000;
  const salesVsTarget = [
    { name: "Target", value: monthlyTarget },
    { name: "Actual Sales", value: totalSalesForMonth },
  ];

  return (
    <div style={{ padding: 20, background: "#f7f8fa" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28 }}>BestChoice Analytics</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}>
            <option>All</option>
            <option>Sales</option>
          </select>
          <select value={selectedRange} onChange={e => setSelectedRange(e.target.value)}>
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {[...Array(12)].map((_, i) => {
              const year = new Date().getFullYear();
              const monthNumber = (i + 1).toString().padStart(2, "0");
              return (
                <option key={i} value={`${year}-${monthNumber}`}>
                  {new Date(0, i).toLocaleString("en-US", { month: "long" })}
                </option>
              );
            })}
          </select>
          <button onClick={() => setShowSaleForm(true)} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: "bold", cursor: "pointer" }}>+ Add Sale</button>
          <button onClick={() => setShowExpenseForm(true)} style={{ background: "#f59e0b", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: "bold", cursor: "pointer" }}>+ Add Expense</button>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ChartCard title={`Sales (${selectedRange})`}>
          <LineChart width={400} height={220} data={salesPerPeriod}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#4caf50" strokeWidth={3} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Profit / Revenue / Expenses">
          <BarChart width={400} height={220} data={profitData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="profit" fill="#16a34a" />
            <Bar dataKey="revenue" fill="#2563eb" />
            <Bar dataKey="expense" fill="#f59e0b" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Sales vs Target">
          <BarChart width={400} height={220} data={salesVsTarget}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#f59e0b" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Top-Selling Products (Percentage)">
          <PieChart width={400} height={220}>
            <Pie data={topSellingProducts.map(p => ({ name: p.name, value: p.value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={entry => `${entry.name}: ${((entry.value / topSellingProducts.reduce((sum, t) => sum + t.value, 0)) * 100).toFixed(1)}%`}>
              {topSellingProducts.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={["#10b981", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6"][index % 5]} />
              ))}
            </Pie>
            <Tooltip formatter={value => `${((value / topSellingProducts.reduce((sum, t) => sum + t.value, 0)) * 100).toFixed(1)}%`} />
            <Legend />
          </PieChart>
        </ChartCard>
      </div>

      {/* Julia Insights */}
      <div style={{ marginTop: 30 }}>
        <JuliaInsights selectedMonth={selectedMonth} />
      </div>

      {/* Add Sale Modal */}
      {showSaleForm && (
        <Modal
          title="Add Sale"
          onClose={() => setShowSaleForm(false)}
          onSave={handleAddSale}
        >
          <select
            value={newSale.product}
            onChange={(e) =>
              setNewSale({ ...newSale, product: e.target.value })
            }
            style={inputStyle}
          >
            <option value="">Select Product</option>
            <option value="Lugaw">Lugaw</option>
            <option value="Calamarites">Calamarites</option>
            <option value="Drinks">Drinks</option>
          </select>

          <input
            autoFocus
            type="text"
            placeholder="₱ 0.00"
            value={newSale.total_amount}
            onChange={(e) =>
              setNewSale({
                ...newSale,
                total_amount: formatCurrency(e.target.value),
              })
            }
            style={{
              ...inputStyle,
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 18,
            }}
          />

          <input
            type="date"
            value={newSale.sale_date}
            onChange={(e) =>
              setNewSale({ ...newSale, sale_date: e.target.value })
            }
            style={inputStyle}
          />
        </Modal>
      )}
      
      {/* Add Expense Modal */}
      {showExpenseForm && (
        <Modal
          title="Add Expense"
          onClose={() => setShowExpenseForm(false)}
          onSave={handleAddExpense}
        > 
          <select
            value={newExpense.category}
            onChange={(e) =>
              setNewExpense({ ...newExpense, category: e.target.value })
            }
            style={inputStyle}
          >
            <option value="">Select Expenses</option>
            <option value="Lugaw Expenses">Lugaw Expenses</option>
            <option value="Calamarites Expenses">Calamarites Expenses</option>
            <option value="Salary">Salary</option>
            <option value="Rent">Rent</option>
            <option value="Electricity">Electricity</option>
            <option value="Water">Water</option>
            <option value="Other Expenses">Other Expenses</option>
          </select>

          <input
            autoFocus
            type="text"
            placeholder="₱ 0.00"
            value={newExpense.amount}
            onChange={(e) =>
              setNewExpense({
                ...newExpense,
                amount: formatCurrency(e.target.value),
              })
            }
            style={{
              ...inputStyle,
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 18,
            }}
          />

          <input
            type="date"
            value={newExpense.expense_date}
            onChange={(e) =>
              setNewExpense({ ...newExpense, expense_date: e.target.value })
            }
            style={inputStyle}
          />
        </Modal>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 15, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose, onSave }) {
  const modalRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          padding: 28,
          borderRadius: 16,
          width: 360,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          transform: visible ? "translateY(0px)" : "translateY(-20px)",
          opacity: visible ? 1 : 0,
          transition: "all 0.25s ease",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
      >
        <h3 style={{ textAlign: "center", marginBottom: 5 }}>
          {title}
        </h3>

        {children}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          <button
            onClick={onClose}
            style={cancelBtnStyle}
            onMouseOver={(e) => (e.target.style.opacity = 0.85)}
            onMouseOut={(e) => (e.target.style.opacity = 1)}
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            style={saveBtnStyle}
            onMouseOver={(e) => (e.target.style.opacity = 0.85)}
            onMouseOut={(e) => (e.target.style.opacity = 1)}
          >
            Save
          </button>
          
        </div>
      </div>
    </div>
  );
}

const saveBtnStyle = {
  background: "linear-gradient(135deg, #16a34a, #22c55e)",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  transition: "all 0.2s",
};

const cancelBtnStyle = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  transition: "all 0.2s",
};

const inputStyle = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  outline: "none",
  fontSize: 14,
  transition: "all 0.2s",
};