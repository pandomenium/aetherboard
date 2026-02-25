import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const monthName = (dateString) => {
  const date = new Date(dateString + "-01");
  return date.toLocaleString("default", { month: "long" });
};

// Trend arrow helper
const getTrendMeta = (changePercent) => {
  if (changePercent > 20)
    return { arrow: "⬆️", type: "positive" };
  if (changePercent > 5)
    return { arrow: "↗️", type: "positive" };
  if (changePercent >= -5)
    return { arrow: "➖", type: "neutral" };
  if (changePercent >= -20)
    return { arrow: "↘️", type: "negative" };
  return { arrow: "⬇️", type: "negative" };
};

const predictMonthlyProfit = (sales, expenses, selectedMonth) => {
  const today = new Date();
  const year = today.getFullYear();
  const monthNumber = Number(selectedMonth.split("-")[1]);

  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const daysPassed =
    today.getMonth() + 1 === monthNumber ? today.getDate() : daysInMonth;

  if (!daysPassed) return 0;

  const revenue = sales.reduce((s, d) => s + Number(d.total_amount || 0), 0);
  const expense = expenses.reduce((s, d) => s + Number(d.amount || 0), 0);

  return (
    (revenue / daysPassed) * daysInMonth -
    (expense / daysPassed) * daysInMonth
  );
};

export default function JuliaInsights({ selectedMonth }) {
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    fetchInsights();
  }, [selectedMonth]);

  const fetchInsights = async () => {
    const startDate = `${selectedMonth}-01`;

    const endDate = new Date(
      new Date(selectedMonth + "-01").getFullYear(),
      new Date(selectedMonth + "-01").getMonth() + 1,
      0
    )
      .toISOString()
      .slice(0, 10);

    const prevMonthDate = new Date(selectedMonth + "-01");
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);

    const prevStart = prevMonthDate.toISOString().slice(0, 7) + "-01";
    const prevEnd = new Date(
      prevMonthDate.getFullYear(),
      prevMonthDate.getMonth() + 1,
      0
    )
      .toISOString()
      .slice(0, 10);

    const { data: sales = [] } = await supabase
      .from("sales")
      .select("total_amount,sale_date")
      .gte("sale_date", startDate)
      .lte("sale_date", endDate);

    const { data: prevSales = [] } = await supabase
      .from("sales")
      .select("total_amount,sale_date")
      .gte("sale_date", prevStart)
      .lte("sale_date", prevEnd);

    const { data: expenses = [] } = await supabase
      .from("expenses")
      .select("amount,category,department,expense_date")
      .eq("department", "Sales")
      .gte("expense_date", startDate)
      .lte("expense_date", endDate);

    const { data: prevExpenses = [] } = await supabase
      .from("expenses")
      .select("amount,expense_date")
      .eq("department", "Sales")
      .gte("expense_date", prevStart)
      .lte("expense_date", prevEnd);

    if (!sales.length && !expenses.length) {
      setInsights([
        {
          text: `❌ No data for ${monthName(selectedMonth)}`,
          type: "negative",
        },
      ]);
      return;
    }

    const totalRevenue = sales.reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0
    );

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    const prevRevenue = prevSales.reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0
    );

    const prevExpense = prevExpenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    const profit = totalRevenue - totalExpenses;
    const prevProfit = prevRevenue - prevExpense;

    const predictedProfit = predictMonthlyProfit(
      sales,
      expenses,
      selectedMonth
    );

    const msgs = [];

    // Revenue trend
    if (prevRevenue > 0) {
      const change = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
      const trend = getTrendMeta(change);

      msgs.push({
        text: `${trend.arrow} Revenue ${change >= 0 ? "up" : "down"} ${Math.abs(
          change
        ).toFixed(0)}% vs last month`,
        type: trend.type,
      });
    }

    // Profit trend
    if (prevProfit !== 0) {
      const change = ((profit - prevProfit) / Math.abs(prevProfit)) * 100;
      const trend = getTrendMeta(change);

      msgs.push({
        text: `${trend.arrow} Profit ${change >= 0 ? "up" : "down"} ${Math.abs(
          change
        ).toFixed(0)}% vs last month`,
        type: trend.type,
      });
    }

    // Core Metrics
    msgs.push({
      text: `💰 Revenue: ₱${totalRevenue.toLocaleString()}`,
      type: "positive",
    });

    msgs.push({
      text: `💸 Expenses: ₱${totalExpenses.toLocaleString()}`,
      type: totalExpenses > totalRevenue ? "negative" : "neutral",
    });

    msgs.push({
      text: `📈 Net Profit: ₱${profit.toLocaleString()}`,
      type: profit < 0 ? "negative" : "positive",
    });

    msgs.push({
      text: `🔮 Predicted Profit: ₱${predictedProfit.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`,
      type: predictedProfit < 0 ? "negative" : "positive",
    });

    setInsights(msgs);
  };

  return (
    <aside style={styles.container}>
      <h3 style={styles.title}>Julia Insights</h3>
      {insights.map((i, idx) => (
        <p
          key={idx}
          style={{
            ...styles.text,
            color:
              i.type === "negative"
                ? "#dc2626"
                : i.type === "positive"
                ? "#16a34a"
                : "#555",
            fontWeight: i.type !== "neutral" ? "600" : "400",
          }}
        >
          {i.text}
        </p>
      ))}
    </aside>
  );
}

const styles = {
  container: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    marginTop: 30,
  },
  title: { fontSize: 18, marginBottom: 10, color: "#333" },
  text: { fontSize: 14, marginBottom: 6 },
};