import React, { useState, useMemo } from "react";
import { Transaction, Product, RecipeItem, Order } from "../../types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CHART_COLORS = ['#8B0000', '#D2691E', '#9932CC', '#00CED1', '#4682B4', '#DC143C', '#00FA9A', '#7B68EE'];

interface DashboardAdminProps {
  transactions: Transaction[];
  products: Product[];
  recipes?: RecipeItem[];
  posOrders?: Order[];
}

export default function DashboardAdmin({ transactions, products, recipes = [], posOrders = [] }: DashboardAdminProps) {
  const [selectedMonth, setSelectedMonth] = useState("Hari Ini");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenseFilter, setExpenseFilter] = useState<string | null>(null);

  const now = new Date();
  const todayStr = now.toDateString();

  // Helper: parse berbagai format tanggal ke objek Date
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    // ISO format
    const iso = new Date(dateStr);
    if (!isNaN(iso.getTime())) return iso;
    // Format id-ID: "13/7/2026" atau "13-7-2026"
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    return null;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = parseDate(t.date);
      if (!txDate) return false;

      if (startDate && endDate) {
        const s = new Date(startDate); s.setHours(0,0,0,0);
        const e = new Date(endDate); e.setHours(23,59,59,999);
        return txDate >= s && txDate <= e;
      }

      if (selectedMonth === "Hari Ini") {
        return txDate.toDateString() === todayStr;
      } else if (selectedMonth === "Kemarin") {
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        return txDate.toDateString() === yesterday.toDateString();
      } else if (selectedMonth === "7 Hari Terakhir") {
        const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7); sevenDaysAgo.setHours(0,0,0,0);
        return txDate >= sevenDaysAgo;
      } else {
        // "Mei 2026", "Juni 2026", dst.
        const monthNames: Record<string, number> = { "Jan":0,"Feb":1,"Mar":2,"Apr":3,"Mei":4,"Jun":5,"Juli":6,"Agt":7,"Sep":8,"Okt":9,"Nov":10,"Des":11 };
        const parts = selectedMonth.split(" ");
        if (parts.length === 2) {
          const m = monthNames[parts[0]];
          const y = Number(parts[1]);
          if (!isNaN(m) && !isNaN(y)) return txDate.getMonth() === m && txDate.getFullYear() === y;
        }
      }
      return true;
    });
  }, [transactions, selectedMonth, startDate, endDate]);

  // Filter posOrders untuk periode yang sama
  const filteredOrders = useMemo(() => {
    return posOrders.filter(o => {
      if (o.status !== 'Selesai') return false;
      const raw = (o as any).created_at || o.time;
      const d = parseDate(raw);
      if (!d) return false;

      if (startDate && endDate) {
        const s = new Date(startDate); s.setHours(0,0,0,0);
        const e = new Date(endDate); e.setHours(23,59,59,999);
        return d >= s && d <= e;
      }
      if (selectedMonth === "Hari Ini") return d.toDateString() === todayStr;
      if (selectedMonth === "Kemarin") {
        const y = new Date(now); y.setDate(now.getDate() - 1);
        return d.toDateString() === y.toDateString();
      }
      if (selectedMonth === "7 Hari Terakhir") {
        const limit = new Date(now); limit.setDate(now.getDate() - 7); limit.setHours(0,0,0,0);
        return d >= limit;
      }
      return true;
    });
  }, [posOrders, selectedMonth, startDate, endDate]);

  // Computed chart data — Best Selling Items dari posOrders nyata
  const bestSellingData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => o.items.forEach(i => {
      map[i.product.name] = (map[i.product.name] || 0) + i.quantity;
    }));
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, value], i) => ({ name, value, color: CHART_COLORS[i] }));
  }, [filteredOrders]);

  // Computed — Orders Type Distribution
  const ordersData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => { map[o.type] = (map[o.type] || 0) + 1; });
    const total = Object.values(map).reduce((a,b) => a+b, 0) || 1;
    return Object.entries(map).map(([name, count], i) => ({ name, value: Math.round((count/total)*100), count, color: CHART_COLORS[i+3] }));
  }, [filteredOrders]);

  // Computed — Category Distribution
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => o.items.forEach(i => {
      const cat = i.product.category || 'Lainnya';
      map[cat] = (map[cat] || 0) + i.quantity;
    }));
    const total = Object.values(map).reduce((a,b) => a+b, 0) || 1;
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name, value], i) => ({ name, value: Math.round((value/total)*100), color: CHART_COLORS[i] }));
  }, [filteredOrders]);

  // Computed — Tenders (payment method)
  const tendersData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => { map[o.payment] = (map[o.payment] || 0) + o.total; });
    const total = Object.values(map).reduce((a,b) => a+b, 0) || 1;
    return Object.entries(map).map(([name, value], i) => ({ name, value: Math.round((value/total)*100), color: CHART_COLORS[i+2] }));
  }, [filteredOrders]);

  const totalOrderCount = filteredOrders.length;


  const inflows = filteredTransactions.filter(t => t.type === "inflow");
  const outflows = filteredTransactions.filter(t => t.type === "outflow");
  const totalPendapatan = inflows.reduce((s, t) => s + t.amount, 0);
  const totalPengeluaran = outflows.reduce((s, t) => s + t.amount, 0);
  const labaBersih = totalPendapatan - totalPengeluaran;
  const margin = totalPendapatan > 0 ? ((labaBersih / totalPendapatan) * 100).toFixed(1) : "0";

  const TARGET_PENDAPATAN = 2000000;
  const progressPercent = Math.min(100, (totalPendapatan / TARGET_PENDAPATAN) * 100);

  const outflowCategories = outflows.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const maxCategory = Object.keys(outflowCategories).reduce((a, b) => outflowCategories[a] > outflowCategories[b] ? a : b, "");

  const expenseItems = outflows
    .filter(t => !expenseFilter || t.category === expenseFilter)
    .reduce((acc, t) => {
      if (!acc[t.title]) acc[t.title] = { total: 0, category: t.category, count: 0 };
      acc[t.title].total += t.amount;
      acc[t.title].count += 1;
      return acc;
  }, {} as Record<string, { total: number, category: string, count: number }>);

  const topExpenses = Object.entries(expenseItems)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 4);

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-col gap-2 text-xs font-bold text-slate-600 pl-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-2">
            <span className="w-4 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></span>
            {entry.value}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto pb-10">
      
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Month Filter */}
          <div className="relative">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-[#fcfaf8] border border-slate-200 pl-4 pr-10 py-2.5 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]"
            >
              <option>Hari Ini</option>
              <option>Kemarin</option>
              <option>7 Hari Terakhir</option>
              <option>Mei 2026</option>
              <option>Juni 2026</option>
              <option>Juli 2026</option>
              <option>Agustus 2026</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none">calendar_month</span>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 bg-[#fcfaf8] border border-slate-200 px-3 py-2 rounded-xl">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none" 
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none" 
            />
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="bg-[#4a2d21] hover:bg-[#382016] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </button>
        </div>
      </div>

      {/* Smart Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        {/* PENDAPATAN */}
        <div className="bg-[#1ea142] text-white p-6 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[100px]">trending_up</span>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-90">Pendapatan {selectedMonth}</div>
            <div className="text-3xl font-black mb-1">Rp {totalPendapatan.toLocaleString("id-ID")}</div>
          </div>
          <div className="text-xs font-bold opacity-90 mt-2">{inflows.length} transaksi masuk</div>
        </div>

        {/* PENGELUARAN */}
        <div className="bg-[#cd2021] text-white p-6 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 opacity-10">
            <span className="material-symbols-outlined text-[90px]">receipt_long</span>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-90">Pengeluaran {selectedMonth}</div>
            <div className="text-3xl font-black mb-1">Rp {totalPengeluaran.toLocaleString("id-ID")}</div>
          </div>
          <div className="flex gap-2 mt-2 text-xs font-bold opacity-90 relative z-10 flex-wrap">
            {Object.entries(outflowCategories).slice(0, 3).map(([cat, val], i) => (
              <span 
                key={i} 
                onClick={() => setExpenseFilter(expenseFilter === cat ? null : cat)}
                className={`cursor-pointer transition-colors px-2 py-0.5 rounded-md ${expenseFilter === cat ? 'bg-white/30 text-white' : 'hover:bg-white/10'}`}
              >
                {cat}: Rp {val.toLocaleString("id-ID")}
              </span>
            ))}
          </div>
        </div>

        {/* LABA BERSIH */}
        <div className="bg-[#382016] text-white p-6 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-70">Laba Bersih</div>
            <div className="text-3xl font-black mb-1">Rp {labaBersih.toLocaleString("id-ID")}</div>
          </div>
          <div className="text-xs font-bold opacity-70 mt-2">Profit Margin {margin}%</div>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-2">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
             <span className="text-sm">🎯</span>
             <span className="font-bold text-slate-800 text-sm">Target Pendapatan Harian</span>
          </div>
          <span className="font-bold text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="text-xs font-medium text-slate-500 mb-3">
          {progressPercent >= 100 ? "🎉 Target Tercapai!" : "🚀 Terus semangat!"} Rp {totalPendapatan.toLocaleString("id-ID")} dari Rp {TARGET_PENDAPATAN.toLocaleString("id-ID")}
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#1ea142] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Smart Alerts */}
      <div className="flex flex-col gap-3 mb-6">
        {Number(margin) < 40 && (
          <div className="bg-[#fef8ea] text-[#b37622] px-5 py-3 rounded-xl border border-[#faecd2] flex items-center gap-3 text-sm font-bold shadow-sm">
            <span>⚠️</span>
            <span>Profit margin {margin}% — Di bawah rata-rata. Coba kurangi pengeluaran atau dorong pendapatan.</span>
          </div>
        )}
        {maxCategory && (
          <div className="bg-[#f1f3f9] text-[#48536b] px-5 py-3 rounded-xl border border-[#e2e7f1] flex items-center gap-3 text-sm font-bold shadow-sm">
            <span>📦</span>
            <span>Pengeluaran terbesar: {maxCategory} — Rp {outflowCategories[maxCategory].toLocaleString("id-ID")} ({((outflowCategories[maxCategory]/totalPengeluaran)*100).toFixed(0)}% dari total pengeluaran {selectedMonth.toLowerCase()}).</span>
          </div>
        )}
      </div>

      {/* Analisis Pengeluaran Terbesar */}
      <div className="bg-[#fffefb] p-6 rounded-3xl shadow-sm border border-slate-200 mb-6">
        <div className="mb-5">
          <h3 className="font-extrabold text-slate-800 flex items-center gap-2 mb-1">
            <span>🛍️</span> Analisis Pengeluaran Terbesar (Produk/Item Terboros)
          </h3>
          <p className="text-xs font-medium text-slate-500">
            {expenseFilter ? `Menampilkan item pengeluaran terboros untuk kategori: ` : `Item pengeluaran dengan akumulasi biaya tertinggi pada periode ini`}
            {expenseFilter && <span className="font-bold text-red-600">{expenseFilter}</span>}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {topExpenses.map(([title, data], idx) => (
            <div key={idx} className="flex-1 min-w-[250px] bg-[#fdfdfd] border border-slate-200 rounded-2xl p-4 flex justify-between items-center hover:border-slate-300 transition-colors shadow-sm">
               <div className="flex items-center gap-4">
                 <div className="text-2xl drop-shadow-sm">
                   {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "📉"}
                 </div>
                 <div>
                   <div className="font-bold text-slate-800 mb-1.5">{title}</div>
                   <div className="flex items-center gap-2 text-[10px] font-bold">
                     <span className={`px-2 py-0.5 rounded-md ${idx === 0 ? "bg-purple-100 text-purple-700" : idx === 1 ? "bg-slate-200 text-slate-700" : "bg-orange-100 text-orange-700"}`}>{data.category}</span>
                     <span className="text-slate-400">{data.count}x beli</span>
                   </div>
                 </div>
               </div>
               <div className="text-right">
                 <div className="font-black text-red-600">Rp {data.total.toLocaleString("id-ID")}</div>
                 <div className="text-[10px] font-bold text-slate-400 mt-1">Total Biaya</div>
               </div>
            </div>
          ))}
          {topExpenses.length === 0 && (
            <div className="w-full text-center py-6 text-slate-400 font-medium text-sm border border-dashed rounded-xl border-slate-200">
               Belum ada data pengeluaran
            </div>
          )}
        </div>
      </div>

      {/* Advanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Best Selling Items */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <span className="font-extrabold text-slate-800 text-base">Best Selling Items</span>
            <span className="text-xs font-bold text-red-700 cursor-pointer hover:underline">View Details</span>
          </div>
          <div className="flex-1 flex items-center justify-center -ml-10">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={bestSellingData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="none">
                  {bestSellingData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend content={renderCustomLegend} layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <span className="font-extrabold text-slate-800 text-base">Orders</span>
            <span className="text-xs font-bold text-red-700 cursor-pointer hover:underline">View Details</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={ordersData} cx="50%" cy="50%" outerRadius={100} dataKey="value" stroke="none" label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="bold">
                      {`${value}%`}
                    </text>
                  );
                }} labelLine={false}>
                  {ordersData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val) => `${val}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col ml-4">
              <span className="text-xs font-bold text-slate-500 mb-1">Total Order :</span>
              <span className="text-3xl font-black text-slate-800 mb-4">{totalOrderCount}</span>
              <ul className="flex flex-col gap-2 text-xs font-bold text-slate-600">
                {ordersData.map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-4 h-3 rounded-sm" style={{ backgroundColor: d.color }}></span>
                    {d.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Best Category */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <span className="font-extrabold text-slate-800 text-base">Best Category</span>
            <span className="text-xs font-bold text-red-700 cursor-pointer hover:underline">View Details</span>
          </div>
          <div className="flex-1 flex items-center justify-center -ml-10">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="none">
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend content={renderCustomLegend} layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Discount Report */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <span className="font-extrabold text-slate-800 text-base">Discount Report</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xl font-medium text-slate-500">No Data!</span>
          </div>
        </div>

        {/* Tenders Report */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <span className="font-extrabold text-slate-800 text-base">Tenders Report</span>
          </div>
          <div className="flex-1 flex items-center justify-center -ml-10">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={tendersData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="none">
                  {tendersData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend content={renderCustomLegend} layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
