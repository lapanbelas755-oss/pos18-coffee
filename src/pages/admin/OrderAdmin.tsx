import React, { useState } from "react";
import { Order, TableData } from "../../types";

interface OrderAdminProps {
  posOrders: Order[];
  tables: TableData[];
}

export default function OrderAdmin({ posOrders, tables }: OrderAdminProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterType, setFilterType] = useState("Semua");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const orderTypes = ["Semua", "Dine In", "Take Out", "Online"];
  const statusTypes = ["Semua", "Selesai", "Unpaid", "Batal", "Ready", "Pending"];

  const filtered = posOrders.filter(o => {
    const matchStatus = filterStatus === "Semua" || o.status === filterStatus;
    const matchType = filterType === "Semua" || o.type === filterType;
    const matchSearch = search === "" || o.id.includes(search) || (o.items || []).some(it => it.product?.name?.toLowerCase().includes(search.toLowerCase()));
    
    let matchDate = true;
    let matchMonth = true;

    if (filterDate || filterMonth) {
      // Prioritaskan created_at (ISO timestamp dari Supabase), fallback ke o.time
      let txDate: Date | null = null;
      const rawCreatedAt = (o as any).created_at;
      if (rawCreatedAt) {
        txDate = new Date(rawCreatedAt);
      } else {
        // Parse format "13 Jul 2026, 14.30"
        try {
          const dStr = o.time?.split(',')[0]?.trim();
          const parts = dStr?.split(' ');
          if (parts?.length === 3) {
            const months: Record<string, string> = { "Jan":"01","Feb":"02","Mar":"03","Apr":"04","Mei":"05","Jun":"06","Jul":"07","Ags":"08","Sep":"09","Okt":"10","Nov":"11","Des":"12" };
            txDate = new Date(`${parts[2]}-${months[parts[1]] || '01'}-${parts[0].padStart(2,'0')}`);
          }
        } catch (e) {}
      }
      
      if (txDate && !isNaN(txDate.getTime())) {
        const iso = txDate.toISOString().split('T')[0];
        const monthIso = iso.slice(0, 7);
        if (filterDate) matchDate = iso === filterDate;
        if (filterMonth) matchMonth = monthIso === filterMonth;
      } else {
        matchDate = false;
        matchMonth = false;
      }
    }
    
    return matchStatus && matchType && matchSearch && matchDate && matchMonth;
  });

  const statusLabel: Record<string, string> = { Selesai: "Selesai", Unpaid: "Belum Bayar", Batal: "Dibatalkan", Ready: "Siap Diambil", Pending: "Tertunda" };
  const statusStyle: Record<string, string> = {
    Selesai: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Unpaid: "bg-yellow-50 text-yellow-700 border-yellow-100",
    Batal: "bg-red-50 text-red-700 border-red-100",
    Ready: "bg-blue-50 text-blue-700 border-blue-100",
    Pending: "bg-slate-50 text-slate-700 border-slate-100"
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto h-full pb-10">

      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 bg-[#f4ece3] px-5 py-2.5 rounded-xl">
          <span className="font-black text-[#4a2d21]">{filtered.length} Order</span>
          <span className="text-slate-500 text-sm font-bold">dari {posOrders.length} total</span>
        </div>
        <button className="bg-[#4a2d21] text-white hover:bg-[#382016] px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ID order atau item..." className="w-full bg-[#f4ece3] border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" />
          <span className="material-symbols-outlined absolute left-4 top-3 text-slate-500">search</span>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterMonth(""); }} className="bg-[#f4ece3] border-none rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" title="Filter Tanggal" />
          </div>
          <div className="relative">
            <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDate(""); }} className="bg-[#f4ece3] border-none rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" title="Filter Bulan" />
          </div>
        </div>
        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="appearance-none border-none bg-[#f4ece3] rounded-2xl py-3 pl-4 pr-10 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
            {orderTypes.map(t => <option key={t} value={t}>{t === "Semua" ? "Semua Tipe" : t}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-3 text-slate-500 pointer-events-none">expand_more</span>
        </div>
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none border-none bg-[#f4ece3] rounded-2xl py-3 pl-4 pr-10 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
            {statusTypes.map(s => <option key={s} value={s}>{s === "Semua" ? "Semua Status" : statusLabel[s]}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-3 text-slate-500 pointer-events-none">expand_more</span>
        </div>
        {(filterDate || filterMonth) && (
          <button onClick={() => { setFilterDate(""); setFilterMonth(""); }} className="text-sm font-bold text-red-500 hover:text-red-700 underline">
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="overflow-auto custom-scrollbar h-full">
          <table className="w-full text-left text-sm text-slate-700 min-w-[800px]">
            <thead className="bg-[#fafafa] text-slate-500 font-bold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-5 text-[11px] uppercase tracking-widest">No. Tiket</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">POS Device</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Tipe Pesanan</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Meja / Info</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Item Pesanan</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, idx) => (
                <tr key={order.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors align-top ${idx % 2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                  <td className="p-5 font-black text-[#4a2d21] text-base">{order.id}</td>
                  <td className="p-5 text-slate-500 font-medium">Kasir Utama</td>
                  <td className="p-5 text-center">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f4ece3] text-[#4a2d21] whitespace-nowrap">{order.type}</span>
                  </td>
                  <td className="p-5 font-bold text-slate-600">{tables.find(t => t.id === order.table)?.name || order.table || "-"}</td>
                  <td className="p-5">
                    <ul className="space-y-1">
                      {order.items.map(item => (
                        <li key={item.id} className="text-sm">
                          <span className={`font-bold text-slate-800`}>{item.quantity}x {item.product.name}</span>
                          {item.notes && <span className="text-slate-500 ml-1 italic font-medium">— {item.notes}</span>}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusStyle[order.status]}`}>
                      {statusLabel[order.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-16 text-center text-slate-400 font-medium">Tidak ada order ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
