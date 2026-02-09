import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const monthName = (dateString) => {
  const date = new Date(dateString + "-01");
  return date.toLocaleString("default", { month: "long" });
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

  return (revenue / daysPassed) * daysInMonth -
         (expense / daysPassed) * daysInMonth;
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
    ).toISOString().slice(0, 10);

    const prevMonthDate = new Date(selectedMonth + "-01");
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);

    const prevStart = prevMonthDate.toISOString().slice(0,7)+"-01";
    const prevEnd = new Date(
      prevMonthDate.getFullYear(),
      prevMonthDate.getMonth()+1,
      0
    ).toISOString().slice(0,10);

    const { data: sales=[] } = await supabase
      .from("sales")
      .select("product,total_amount,sale_date")
      .gte("sale_date", startDate)
      .lte("sale_date", endDate);

    const { data: prevSales=[] } = await supabase
      .from("sales")
      .select("total_amount,sale_date")
      .gte("sale_date", prevStart)
      .lte("sale_date", prevEnd);

    const { data: expenses=[] } = await supabase
      .from("expenses")
      .select("amount,category,department,expense_date")
      .eq("department","Sales")
      .gte("expense_date",startDate)
      .lte("expense_date",endDate);

    const { data: prevExpenses=[] } = await supabase
      .from("expenses")
      .select("amount,category,department,expense_date")
      .eq("department","Sales")
      .gte("expense_date",prevStart)
      .lte("expense_date",prevEnd);

    if(!sales.length && !expenses.length){
      setInsights([{text:`❌ No data for ${monthName(selectedMonth)}`}]);
      return;
    }

    const totalRevenue = sales.reduce(
      (sum,s)=>sum+Number(s.total_amount||0),0
    );

    const totalExpenses = expenses.reduce(
      (sum,e)=>sum+Number(e.amount||0),0
    );

    const prevRevenue = prevSales.reduce(
      (sum,s)=>sum+Number(s.total_amount||0),0
    );

    const profit = totalRevenue-totalExpenses;

    const predictedProfit = predictMonthlyProfit(
      sales,expenses,selectedMonth
    );

    const msgs=[];

    msgs.push({text:`💰 Revenue: ₱${totalRevenue.toLocaleString()}`});
    msgs.push({text:`💸 Expenses: ₱${totalExpenses.toLocaleString()}`});
    msgs.push({text:`📈 Net Profit: ₱${profit.toLocaleString()}`});
    msgs.push({
      text:`🔮 Predicted Profit: ₱${predictedProfit.toLocaleString(undefined,{maximumFractionDigits:0})}`
    });

    // 📉 Revenue comparison
    if(prevRevenue>0){
      const change=((totalRevenue-prevRevenue)/prevRevenue)*100;
      if(change>0){
        msgs.push({text:`📈 Revenue increased ${change.toFixed(0)}% vs last month`});
      }else{
        msgs.push({text:`📉 Revenue dropped ${Math.abs(change).toFixed(0)}% vs last month`});
      }
    }

    // 📅 Daily analysis
    const dayMap={};
    sales.forEach(s=>{
      const day=new Date(s.sale_date)
        .toLocaleDateString("default",{weekday:"long"});
      dayMap[day]=(dayMap[day]||0)+Number(s.total_amount||0);
    });

    const sortedDays=Object.entries(dayMap)
      .sort((a,b)=>b[1]-a[1]);

    if(sortedDays.length){
      msgs.push({text:`🔥 Strongest day: ${sortedDays[0][0]}`});
      msgs.push({text:`🐢 Weakest day: ${sortedDays[sortedDays.length-1][0]}`});
    }

    // 📊 Weekend vs Weekday
    let weekend=0,weekday=0;
    sales.forEach(s=>{
      const d=new Date(s.sale_date).getDay();
      if(d===0||d===6) weekend+=Number(s.total_amount||0);
      else weekday+=Number(s.total_amount||0);
    });

    if(weekend>weekday){
      msgs.push({text:`📅 Weekends perform stronger — consider promos`});
    }

    // 🧠 Expense anomaly
    const catMap={}, prevCatMap={};

    expenses.forEach(e=>{
      catMap[e.category]=(catMap[e.category]||0)+Number(e.amount||0);
    });

    prevExpenses.forEach(e=>{
      prevCatMap[e.category]=(prevCatMap[e.category]||0)+Number(e.amount||0);
    });

    Object.keys(catMap).forEach(cat=>{
      const current=catMap[cat];
      const previous=prevCatMap[cat]||0;
      if(previous>0){
        const inc=((current-previous)/previous)*100;
        if(inc>30){
          msgs.push({text:`⚠️ ${cat} expenses increased ${inc.toFixed(0)}%`});
        }
      }
    });

    const ratio=totalExpenses/(totalRevenue||1);
    if(ratio>0.7){
      msgs.push({text:`🚨 Expenses exceed 70% of revenue`});
    }

    setInsights(msgs);
  };

  return(
    <aside style={styles.container}>
      <h3 style={styles.title}>Julia Insights</h3>
      {insights.map((i,idx)=>(
        <p key={idx} style={styles.text}>{i.text}</p>
      ))}
    </aside>
  );
}

const styles={
  container:{
    background:"#fff",
    padding:20,
    borderRadius:12,
    boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
    marginTop:30,
  },
  title:{fontSize:18,marginBottom:10,color:"#333"},
  text:{fontSize:14,marginBottom:6,color:"#555"},
};
