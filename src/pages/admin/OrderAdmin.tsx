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
  const [filterShift, setFilterShift] = useState("Semua");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const orderTypes = ["Semua", "Dine In", "Take Out", "Online"];
  const statusTypes = ["Semua", "Selesai", "Unpaid", "Batal", "Ready", "Pending"];

  const filtered = posOrders.filter(o => {
    const matchStatus = filterStatus === "Semua" || o.status === filterStatus;
    const matchType = filterType === "Semua" || o.type === filterType;
    const matchShift = filterShift === "Semua" || (o.shiftLabel || "Shift 1") === filterShift;
    const matchSearch = search === "" || o.id.includes(search) || (o.items || []).some(it => it.product?.name?.toLowerCase().includes(search.toLowerCase())) || (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase()));
    
    let matchDate = true;
    let matchMonth = true;

    if (filterDate || filterMonth) {
      let txDate: Date | null = null;
      const rawCreatedAt = (o as any).created_at;
      if (rawCreatedAt) {
        txDate = new Date(rawCreatedAt);
      } else {
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
    
    return matchStatus && matchType && matchShift && matchSearch && matchDate && matchMonth;
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
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto min-h-0 flex-1 pb-10">

      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 bg-[#f4ece3] px-5 py-2.5 rounded-xl">
          <span className="font-black text-[#4a2d21]">{filtered.length} Order</span>
          <span className="text-slate-500 text-xs sm:text-sm font-bold">dari {posOrders.length} total</span>
        </div>
        <button className="bg-[#4a2d21] text-white hover:bg-[#382016] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ID order atau item..." className="w-full bg-[#f4ece3] border-none rounded-2xl py-2.5 sm:py-3 pl-11 pr-4 text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" />
          <span className="material-symbols-outlined absolute left-4 top-2.5 sm:top-3 text-slate-500 text-lg">search</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterMonth(""); }} className="flex-1 sm:flex-none bg-[#f4ece3] border-none rounded-2xl py-2.5 sm:py-3 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" title="Filter Tanggal" />
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDate(""); }} className="flex-1 sm:flex-none bg-[#f4ece3] border-none rounded-2xl py-2.5 sm:py-3 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" title="Filter Bulan" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <select value={filterShift} onChange={e => setFilterShift(e.target.value)} className="w-full appearance-none border-none bg-[#f4ece3] rounded-2xl py-2.5 sm:py-3 pl-3 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
              <option value="Semua">Semua Shift</option>
              <option value="Shift 1">Shift 1</option>
              <option value="Shift 2">Shift 2</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-2.5 sm:top-3 text-slate-500 pointer-events-none text-base">expand_more</span>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full appearance-none border-none bg-[#f4ece3] rounded-2xl py-2.5 sm:py-3 pl-3 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
              {orderTypes.map(t => <option key={t} value={t}>{t === "Semua" ? "Semua Tipe" : t}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-2.5 sm:top-3 text-slate-500 pointer-events-none text-base">expand_more</span>
          </div>
          <div className="relative flex-1 sm:flex-none">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full appearance-none border-none bg-[#f4ece3] rounded-2xl py-2.5 sm:py-3 pl-3 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
              {statusTypes.map(s => <option key={s} value={s}>{s === "Semua" ? "Semua Status" : statusLabel[s]}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-2.5 sm:top-3 text-slate-500 pointer-events-none text-base">expand_more</span>
          </div>
        </div>
        {(filterDate || filterMonth) && (
          <button onClick={() => { setFilterDate(""); setFilterMonth(""); }} className="text-xs font-bold text-red-500 hover:text-red-700 underline">
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm text-slate-700 min-w-[750px]">
            <thead className="bg-[#fafafa] text-slate-500 font-bold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-5 text-[11px] uppercase tracking-widest">No. Tiket</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Shift / Staf</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Tipe Pesanan</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Meja / Customer</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Item Pesanan</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Pembayaran</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, idx) => (
                <tr key={order.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors align-top ${idx % 2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                  <td className="p-5 font-black text-[#4a2d21] text-base">{order.id}</td>
                  <td className="p-5">
                    <span className="px-2.5 py-1 bg-red-50 text-red-700 font-bold text-xs rounded-md block w-fit mb-1">{order.shiftLabel || "Shift 1"}</span>
                    <span className="text-xs text-slate-500 font-medium">Staf: {order.staff || "Kasir"}</span>
                  </td>
                  <td className="p-5 text-center">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#f4ece3] text-[#4a2d21] whitespace-nowrap">{order.type}</span>
                  </td>
                  <td className="p-5 font-bold text-slate-600">
                    <div>{tables.find(t => t.id === order.table)?.name || order.table || "-"}</div>
                    {order.customerName && <span className="text-xs font-normal text-slate-500">Cust: {order.customerName}</span>}
                  </td>
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
                    <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 block w-fit mx-auto mb-1">
                      {order.payment || "Cash"}
                    </span>
                    {order.refNo && (
                      <span className="text-[11px] font-mono text-slate-500 font-bold block">Ref: {order.refNo}</span>
                    )}
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusStyle[order.status]}`}>
                      {statusLabel[order.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-16 text-center text-slate-400 font-medium">Tidak ada order ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
