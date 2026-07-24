import React, { useState, useEffect, useMemo } from "react";
import { Order, PettyCash, Transaction, TableData } from "../../types";

interface CustomerAdminProps {
  posOrders: Order[];
  transactions?: Transaction[];
  tables?: TableData[];
}

export interface ShiftAggregateRow {
  id: string;
  shiftLabel: string;
  staff: string;
  dateStr: string;
  openedAt: number;
  isOpen: boolean;
  totalOrders: number;
  totalSales: number;
  cashSales: number;
  qrisSales: number;
  transferSales: number;
  debitSales: number;
  cashOutTotal: number;
  expenses: PettyCash[];
  orders: Order[];
}

// Normalize date from order.time string e.g. "22 Jul 2026, 07.30"
const getDateFromOrder = (order: Order): string => {
  // order.time format: "22 Jul 2026, 07.30" or similar
  if (order.time && order.time.includes(",")) {
    return order.time.split(",")[0].trim(); // "22 Jul 2026"
  }
  if (order.time) {
    return order.time.trim();
  }
  if (order.created_at) {
    return new Date(order.created_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return "";
};

// Derive shift label from staff name if not explicitly stored on order
const getShiftLabel = (order: Order): string => {
  if (order.shiftLabel) return order.shiftLabel;
  const staff = (order.staff || "").toLowerCase().trim();
  if (staff.includes("beby") || staff.includes("cindy") || staff.includes("kasir 2")) {
    return "Shift 2";
  }
  return "Shift 1";
};

// Get timestamp for sorting
const getTimestamp = (order: Order): number => {
  if (order.created_at) {
    const t = typeof order.created_at === "number"
      ? order.created_at
      : new Date(order.created_at).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
};

export default function CustomerAdmin({ posOrders, transactions = [], tables = [] }: CustomerAdminProps) {
  const [activeShiftRaw, setActiveShiftRaw] = useState<any>(null);
  const [activePettyRaw, setActivePettyRaw] = useState<PettyCash[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftAggregateRow | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterShiftNum, setFilterShiftNum] = useState("Semua Shift");
  const [filterKasir, setFilterKasir] = useState("Semua Kasir");

  // Load active shift state from localStorage (for badge only)
  useEffect(() => {
    const load = () => {
      const savedActive = localStorage.getItem("current_shift");
      const savedPetty = localStorage.getItem("current_petty_cash");
      setActiveShiftRaw(savedActive ? JSON.parse(savedActive) : null);
      setActivePettyRaw(savedPetty ? JSON.parse(savedPetty) : []);
    };
    load();
    window.addEventListener("storage", load);
    const interval = setInterval(load, 3000);
    return () => {
      window.removeEventListener("storage", load);
      clearInterval(interval);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // AGGREGATION ENGINE — Satu sumber kebenaran: posOrders
  // Group by: shiftLabel + staff + dateStr
  // Ini SAMA PERSIS dengan data yang ditampilkan di menu Order
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // AGGREGATION ENGINE — Single Source of Truth
  // Mengombinasikan shift_history tersimpan (untuk shift yang sudah ditutup)
  // dengan agregasi real-time dari posOrders (untuk shift aktif atau fallback)
  // ---------------------------------------------------------------------------
  const aggregatedShifts = useMemo(() => {
    // 1. Ambil data shift history yang disimpan oleh POS Kasir saat Tutup Shift
    let savedShiftHistory: ShiftReport[] = [];
    try {
      const rawHistory = localStorage.getItem("shift_history");
      if (rawHistory) {
        savedShiftHistory = JSON.parse(rawHistory);
      }
    } catch (err) {
      console.warn("Failed to parse shift_history from localStorage", err);
    }

    // List ID shift yang sudah ada di history agar tidak terhitung ganda
    const processedShiftKeys = new Set<string>();

    const rows: ShiftAggregateRow[] = [];

    // Prioritas 1: Masukkan data dari ShiftReport (Shift yang sudah resmi ditutup di POS Kasir)
    savedShiftHistory.forEach((report) => {
      const dateObj = new Date(report.openedAt);
      const dateStr = dateObj.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const shiftLabel = report.shiftNumber ? `Shift ${report.shiftNumber}` : "Shift 1";
      const staff = report.staff || "Kasir";
      const key = `${shiftLabel}__${staff}__${dateStr}`;
      processedShiftKeys.add(key);

      // Extract shift orders matching shift open & close timeframe
      const shiftOrders = posOrders.filter(o => {
        const rawTime = o.created_at || (o as any).createdAt;
        const t = typeof rawTime === 'number' ? rawTime : rawTime ? new Date(rawTime).getTime() : 0;
        const matchTime = t >= report.openedAt && (!report.closedAt || t <= report.closedAt);
        const matchStatus = o.status === "Selesai" || o.status === "Paid" || o.status === "Completed";
        return matchTime && matchStatus;
      });

      rows.push({
        id: report.id || key,
        shiftLabel,
        staff,
        dateStr,
        openedAt: report.openedAt,
        isOpen: false,
        totalOrders: report.totalInvoices || shiftOrders.length,
        totalSales: report.totalSales,
        cashSales: report.cashSales,
        qrisSales: report.qrisSales,
        transferSales: report.transferSales || 0,
        debitSales: report.debitSales || 0,
        cashOutTotal: report.cashOutTotal,
        expenses: report.expenses || [],
        orders: shiftOrders,
      });
    });

    // Prioritas 2: Agregasi real-time dari posOrders untuk shift aktif atau shift yang belum tersimpan di history
    const completedOrders = posOrders.filter(o =>
      o.status === "Selesai" || o.status === "Paid" || o.status === "Completed"
    );

    const groupMap: Record<string, {
      shiftLabel: string;
      staff: string;
      dateStr: string;
      orders: Order[];
      timestamps: number[];
    }> = {};

    completedOrders.forEach(o => {
      const dateStr = getDateFromOrder(o);
      const shiftLabel = getShiftLabel(o);
      const staff = o.staff || "Kasir";
      const key = `${shiftLabel}__${staff}__${dateStr}`;

      // Hanya proses jika belum ditangani oleh shift_history
      if (!processedShiftKeys.has(key)) {
        if (!groupMap[key]) {
          groupMap[key] = { shiftLabel, staff, dateStr, orders: [], timestamps: [] };
        }
        groupMap[key].orders.push(o);
        const ts = getTimestamp(o);
        if (ts > 0) groupMap[key].timestamps.push(ts);
      }
    });

    // Tentukan active shift key
    let activeKey: string | null = null;
    if (activeShiftRaw && activeShiftRaw.isOpen) {
      const activeStaff = activeShiftRaw.staff || "";
      const activeShiftLabel = activeShiftRaw.shiftLabel || "Shift 1";
      const activeDateStr = new Date(activeShiftRaw.openedAt).toLocaleDateString("id-ID", {
        day: "numeric", month: "short", year: "numeric"
      });
      activeKey = `${activeShiftLabel}__${activeStaff}__${activeDateStr}`;
    }

    Object.entries(groupMap).forEach(([key, g]) => {
      let cashSales = 0;
      let qrisSales = 0;
      let transferSales = 0;
      let debitSales = 0;

      g.orders.forEach(o => {
        const method = (o.payment || "Cash").toLowerCase();
        if (method.includes("cash")) cashSales += o.total;
        else if (method.includes("qris")) qrisSales += o.total;
        else if (method.includes("debit") || method.includes("card")) debitSales += o.total;
        else transferSales += o.total;
      });

      const openedAt = g.timestamps.length > 0 ? Math.min(...g.timestamps) : Date.now();
      const isOpen = key === activeKey;

      let expenses: PettyCash[] = [];
      if (isOpen && activePettyRaw.length > 0) {
        expenses = activePettyRaw.filter(p => p.type === "out");
      } else {
        expenses = transactions
          .filter(t => {
            if (t.type !== "outflow") return false;
            // Abaikan transaksi COGS / HPP bahan baku yang tercipta otomatis saat checkout order
            if (t.category === "Bahan Baku" || (t.title && t.title.startsWith("COGS:"))) return false;
            let txDate = t.date || "";
            if (!txDate) return false;
            // Split if slash or format: e.g. "23/7/2026" vs "23 Jul 2026"
            let formattedTxDate = txDate;
            if (txDate.includes("T") || (txDate.includes("-") && !txDate.includes(" "))) {
              formattedTxDate = new Date(txDate).toLocaleDateString("id-ID", {
                day: "numeric", month: "short", year: "numeric"
              });
            } else if (txDate.includes("/")) {
              const parts = txDate.split("/");
              if (parts.length === 3) {
                const d = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const y = parseInt(parts[2], 10);
                const dt = new Date(y, m, d);
                if (!isNaN(dt.getTime())) {
                  formattedTxDate = dt.toLocaleDateString("id-ID", {
                    day: "numeric", month: "short", year: "numeric"
                  });
                }
              }
            }
            const matchDate = formattedTxDate === g.dateStr || txDate === g.dateStr;
            if (!matchDate) return false;

            // PENTING: Filter pengeluaran berdasarkan nama Kasir yang menginput
            // (Apakah title mengandung [Kasir: NamaKasir] atau diciptakan oleh g.staff)
            const titleLower = (t.title || "").toLowerCase();
            const staffLower = g.staff.toLowerCase().trim();
            if (titleLower.includes("[kasir:")) {
              return titleLower.includes(`[kasir: ${staffLower}]`) || titleLower.includes(`[kasir:${staffLower}]`);
            }
            return true;
          })
          .map(t => ({
            id: t.id,
            type: "out" as const,
            amount: t.amount,
            description: (t.title || "").replace(/\[NOTA:.*\]/, "").trim(),
            category: t.category || "Operasional",
            createdBy: g.staff,
            timestamp: openedAt,
            notes: undefined,
          }));
      }

      const cashOutTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

      rows.push({
        id: key,
        shiftLabel: g.shiftLabel,
        staff: g.staff,
        dateStr: g.dateStr,
        openedAt,
        isOpen,
        totalOrders: g.orders.length,
        totalSales: cashSales + qrisSales + transferSales + debitSales,
        cashSales,
        qrisSales,
        transferSales,
        debitSales,
        cashOutTotal,
        expenses,
        orders: g.orders,
      });
    });

    // Sort: active shift first, then most recent openedAt
    return rows.sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;
      return b.openedAt - a.openedAt;
    });
  }, [posOrders, transactions, activeShiftRaw, activePettyRaw]);

  const uniqueKasir = useMemo(() =>
    Array.from(new Set(aggregatedShifts.map(s => s.staff))),
    [aggregatedShifts]
  );

  const filteredShifts = useMemo(() => {
    return aggregatedShifts.filter(s => {
      const matchSearch =
        s.staff.toLowerCase().includes(search.toLowerCase()) ||
        s.shiftLabel.toLowerCase().includes(search.toLowerCase()) ||
        s.dateStr.toLowerCase().includes(search.toLowerCase());
      const matchShift = filterShiftNum === "Semua Shift" || s.shiftLabel === filterShiftNum;
      const matchKasir = filterKasir === "Semua Kasir" || s.staff === filterKasir;

      let matchDate = true;
      if (startDate && endDate) {
        const opened = new Date(s.openedAt);
        const st = new Date(startDate); st.setHours(0, 0, 0, 0);
        const en = new Date(endDate); en.setHours(23, 59, 59, 999);
        matchDate = opened >= st && opened <= en;
      }

      return matchSearch && matchShift && matchKasir && matchDate;
    });
  }, [aggregatedShifts, search, filterShiftNum, filterKasir, startDate, endDate]);

  const formatTableLabel = (tableStr: string | null | undefined): string => {
    if (!tableStr || tableStr === "-") return "-";
    const found = tables.find(t => t.id === tableStr || t.name === tableStr);
    if (found?.name) return found.name;
    if (tableStr.startsWith("table-")) {
      const digits = tableStr.replace(/\D/g, "");
      if (digits) return `Table ${(parseInt(digits.slice(-2), 10) % 20) + 1}`;
      return "Table 1";
    }
    if (/^\d+$/.test(tableStr)) return `Table ${tableStr}`;
    return tableStr;
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto min-h-0 flex-1 pb-10 font-sans">

      {/* Page Header */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-black text-[#4d3227]">Riwayat Shift & Audit Operasional</h2>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full border border-emerald-300 flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              LIVE
            </span>
          </div>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Data diambil langsung dari tabel Order — sama persis dengan menu Order.
          </p>
        </div>
        <div className="text-left md:text-right w-full md:w-auto flex md:block justify-between items-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <p className="text-xs text-slate-400 font-medium">Total Shift Tercatat</p>
          <p className="text-2xl md:text-3xl font-black text-[#4d3227]">{aggregatedShifts.length}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kasir, shift, tanggal..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none focus:border-[#4d3227]"
          />
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
        </div>

        <div className="flex gap-2">
          <select value={filterShiftNum} onChange={e => setFilterShiftNum(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none">
            <option value="Semua Shift">Semua Shift</option>
            <option value="Shift 1">Shift 1</option>
            <option value="Shift 2">Shift 2</option>
          </select>

          <select value={filterKasir} onChange={e => setFilterKasir(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none">
            <option value="Semua Kasir">Semua Kasir</option>
            {uniqueKasir.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none" />
          <span className="text-slate-400">s/d</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none" />
        </div>
      </div>

      {/* Shift Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
            <thead className="bg-[#4d3227] text-white font-extrabold">
              <tr>
                <th className="p-4 text-center">Shift</th>
                <th className="p-4">Kasir</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4 text-center">Total Order</th>
                <th className="p-4 text-right">Pendapatan</th>
                <th className="p-4 text-right">Pengeluaran</th>
                <th className="p-4 text-right">Cash</th>
                <th className="p-4 text-right">QRIS</th>
                <th className="p-4 text-right">Transfer</th>
                <th className="p-4 text-right">Debit</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShifts.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.isOpen ? "bg-emerald-50/40" : ""}`}>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md font-extrabold text-[11px]">
                        {s.shiftLabel}
                      </span>
                      {s.isOpen && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-white font-extrabold rounded text-[9px] uppercase tracking-wider animate-pulse">
                          Aktif
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-800 text-sm">{s.staff}</td>
                  <td className="p-4 text-slate-600 font-medium">{s.dateStr}</td>
                  <td className="p-4 text-center font-extrabold text-slate-800 text-sm">{s.totalOrders}</td>
                  <td className="p-4 text-right font-black text-emerald-600 text-sm">
                    Rp {s.totalSales.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-right font-black text-red-600 text-sm">
                    Rp {s.cashOutTotal.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-700">
                    Rp {s.cashSales.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-700">
                    Rp {s.qrisSales.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-700">
                    Rp {s.transferSales.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-right font-bold text-slate-700">
                    Rp {s.debitSales.toLocaleString("id-ID")}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setSelectedShift(s)}
                      className="px-3.5 py-1.5 bg-[#4d3227] hover:bg-[#382016] text-white font-bold rounded-lg transition-colors text-xs flex items-center gap-1 mx-auto shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">find_in_page</span>
                      Detail
                    </button>
                  </td>
                </tr>
              ))}

              {filteredShifts.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-40">receipt_long</span>
                    Belum ada data transaksi shift yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="bg-[#4d3227] text-white p-6 flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black">Detail {selectedShift.shiftLabel}</h3>
                  <span className="px-3 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-full text-xs border border-amber-400/30">
                    Kasir: {selectedShift.staff}
                  </span>
                  {selectedShift.isOpen && (
                    <span className="px-2.5 py-0.5 bg-emerald-500 text-white font-extrabold rounded-full text-[10px] uppercase tracking-wider animate-pulse">
                      Aktif Realtime
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-80 mt-1">Tanggal: {selectedShift.dateStr}</p>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-bold"
              >×</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">

              {/* 1. Ringkasan Penjualan & Breakdown Pembayaran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <h4 className="font-extrabold text-[#4d3227] text-xs uppercase tracking-wider mb-4">Ringkasan Penjualan</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Order (Selesai)</span>
                      <span className="font-extrabold text-slate-800">{selectedShift.totalOrders} Order</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Item Terjual</span>
                      <span className="font-extrabold text-slate-800">
                        {selectedShift.orders.reduce((sum, o) =>
                          sum + (o.items ? o.items.reduce((s, i) => s + (i.quantity || 1), 0) : 0), 0)} Items
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <span className="font-black text-[#4d3227] text-base">Total Pendapatan</span>
                      <span className="font-black text-emerald-600 text-xl">
                        Rp {selectedShift.totalSales.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                  <h4 className="font-extrabold text-[#4d3227] text-xs uppercase tracking-wider mb-3">Breakdown Metode Pembayaran</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Cash", value: selectedShift.cashSales, count: selectedShift.orders.filter(o => (o.payment || "Cash").toLowerCase().includes("cash")).length },
                      { label: "QRIS", value: selectedShift.qrisSales, count: selectedShift.orders.filter(o => (o.payment || "").toLowerCase().includes("qris")).length },
                      { label: "Transfer", value: selectedShift.transferSales, count: selectedShift.orders.filter(o => (o.payment || "").toLowerCase().includes("transfer")).length },
                      { label: "Debit", value: selectedShift.debitSales, count: selectedShift.orders.filter(o => (o.payment || "").toLowerCase().includes("debit") || (o.payment || "").toLowerCase().includes("card")).length },
                    ].map(pm => (
                      <div key={pm.label} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800">{pm.label}</span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold rounded text-[10px]">
                            {pm.count} Transaksi
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-800">Rp {pm.value.toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Pengeluaran Kasir */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-red-900 text-sm">Pengeluaran Kasir (Pay Out)</h4>
                    <p className="text-xs text-red-700 mt-0.5">Rincian pengeluaran yang diinput kasir selama shift.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block">Total Pengeluaran</span>
                    <span className="font-black text-red-700 text-lg">Rp {selectedShift.cashOutTotal.toLocaleString("id-ID")}</span>
                  </div>
                </div>
                <div className="p-4">
                  {selectedShift.expenses.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold">
                        <tr>
                          <th className="p-2.5">Keterangan</th>
                          <th className="p-2.5">Kategori</th>
                          <th className="p-2.5 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedShift.expenses.map((exp, idx) => (
                          <tr key={exp.id || idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{exp.description}</td>
                            <td className="p-2.5 text-slate-500">{exp.category || "Operasional"}</td>
                            <td className="p-2.5 text-right font-black text-red-600">
                              Rp {exp.amount.toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-400 font-medium">
                      Tidak ada pengeluaran kasir (Pay Out) pada shift ini.
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Riwayat Order */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-800 text-sm">Riwayat Order Pada Shift Ini</h4>
                  <span className="text-xs font-bold text-slate-500">{selectedShift.orders.length} Pesanan Selesai</span>
                </div>
                <div className="p-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Invoice</th>
                        <th className="p-2.5">Waktu</th>
                        <th className="p-2.5">Tipe</th>
                        <th className="p-2.5">Meja</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-center">Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedShift.orders.map((ord, idx) => (
                        <tr key={ord.id || idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-black text-slate-800">{ord.id}</td>
                          <td className="p-2.5 font-bold text-slate-500">{ord.time}</td>
                          <td className="p-2.5 font-bold text-slate-700">{ord.type || "Dine In"}</td>
                          <td className="p-2.5 font-bold text-slate-700">{formatTableLabel(ord.table)}</td>
                          <td className="p-2.5 text-right font-black text-[#4d3227]">
                            Rp {ord.total.toLocaleString("id-ID")}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                              {ord.payment || "Cash"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {selectedShift.orders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                            Belum ada transaksi pada shift ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
