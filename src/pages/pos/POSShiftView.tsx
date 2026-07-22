import React, { useState, useEffect, useMemo } from "react";
import { usePOSContext } from "../../layouts/POSLayout";
import { useAuthStore } from "../../store/authStore";
import { Order, PettyCash, ShiftReport } from "../../types";
import { sendTelegramMessage } from "../../lib/telegram";
import { supabase } from "../../lib/supabase";

interface POSShiftViewProps {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
  posOrders: Order[];
}

interface ShiftData {
  isOpen: boolean;
  staff: string;
  openedAt: number;
  startingCash: number;
  outlet?: string;
  posDevice?: string;
}

export default function POSShiftView({ onNotify, posOrders }: POSShiftViewProps) {
  const { sidebarOpen, setSidebarOpen } = usePOSContext();
  const { currentUser } = useAuthStore();

  const [shift, setShift] = useState<ShiftData | null>(null);
  const [pettyCashList, setPettyCashList] = useState<PettyCash[]>([]);
  const [shiftHistory, setShiftHistory] = useState<ShiftReport[]>([]);

  const [selectedShiftDetail, setSelectedShiftDetail] = useState<ShiftReport | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "history" | "detail">("active");

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isPettyModalOpen, setIsPettyModalOpen] = useState(false);
  const [editingPettyId, setEditingPettyId] = useState<string | null>(null);

  // Form states
  const [staffName, setStaffName] = useState(currentUser?.name || "Kasir");
  const [startingCash, setStartingCash] = useState("100000");
  const [pettyAmount, setPettyAmount] = useState("");
  const [pettyDesc, setPettyDesc] = useState("");
  const [pettyCategory, setPettyCategory] = useState("Operasional");
  const [pettyNotes, setPettyNotes] = useState("");
  const [pettyUser, setPettyUser] = useState(currentUser?.name || "Kasir");
  const [pettyType, setPettyType] = useState<"in" | "out">("out");
  const [actualCash, setActualCash] = useState("");

  // Filters for Shift History
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterShiftNum, setFilterShiftNum] = useState("Semua Shift");

  // Load from LocalStorage
  useEffect(() => {
    const savedShift = localStorage.getItem("current_shift");
    const savedPetty = localStorage.getItem("current_petty_cash");
    const savedHistory = localStorage.getItem("shift_history");
    if (savedShift) setShift(JSON.parse(savedShift));
    if (savedPetty) setPettyCashList(JSON.parse(savedPetty));
    if (savedHistory) setShiftHistory(JSON.parse(savedHistory));
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (shift) {
      localStorage.setItem("current_shift", JSON.stringify(shift));
    } else {
      localStorage.removeItem("current_shift");
    }
    localStorage.setItem("current_petty_cash", JSON.stringify(pettyCashList));
    localStorage.setItem("shift_history", JSON.stringify(shiftHistory));
  }, [shift, pettyCashList, shiftHistory]);

  // Active shift calculations
  const calculateTotals = () => {
    let cashSales = 0;
    let qrisSales = 0;
    let transferSales = 0;
    const tenderCounts: Record<string, { count: number; total: number }> = {
      Cash: { count: 0, total: 0 },
      QRIS: { count: 0, total: 0 },
      Transfer: { count: 0, total: 0 }
    };

    const hourDataMap: Record<number, { pax: number; total: number }> = {};

    if (shift) {
      posOrders.forEach(o => {
        const orderTime = (o as any).created_at 
          ? new Date((o as any).created_at).getTime() 
          : 0;
        const isInShift = orderTime >= shift.openedAt && o.status === "Selesai";
        if (!isInShift) return;
        
        const method = o.payment || "Cash";
        if (!tenderCounts[method]) tenderCounts[method] = { count: 0, total: 0 };
        tenderCounts[method].count += 1;
        tenderCounts[method].total += o.total;

        if (method === "Cash") cashSales += o.total;
        else if (method.toLowerCase().includes("qris")) qrisSales += o.total;
        else transferSales += o.total;

        // Sales by hour
        const hr = new Date(orderTime || Date.now()).getHours();
        if (!hourDataMap[hr]) hourDataMap[hr] = { pax: 0, total: 0 };
        hourDataMap[hr].pax += 1;
        hourDataMap[hr].total += o.total;
      });
    }

    const cashInTotal = pettyCashList.filter(p => p.type === "in").reduce((sum, p) => sum + p.amount, 0);
    const cashOutTotal = pettyCashList.filter(p => p.type === "out").reduce((sum, p) => sum + p.amount, 0);
    
    const starting = shift ? shift.startingCash : 0;
    const expectedCash = starting + cashSales + cashInTotal - cashOutTotal;
    const totalSales = cashSales + qrisSales + transferSales;

    return { cashSales, qrisSales, transferSales, cashInTotal, cashOutTotal, expectedCash, totalSales, starting, tenderCounts, hourDataMap };
  };

  const totals = calculateTotals();

  // Handlers
  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: ShiftData = {
      isOpen: true,
      staff: staffName,
      openedAt: Date.now(),
      startingCash: parseInt(startingCash.replace(/\D/g, "")) || 0,
      outlet: "LapanbelasCoffee",
      posDevice: "POS Kasir 1"
    };
    setShift(newShift);
    setPettyCashList([]);
    setIsShiftModalOpen(false);
    setViewMode("active");
    onNotify(`Shift dibuka oleh ${staffName}`, "success");
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseInt(actualCash.replace(/\D/g, "")) || 0;
    const diff = actual - totals.expectedCash;
    
    if (shift) {
      const openHour = new Date(shift.openedAt).getHours();
      const shiftNum = openHour < 15 ? 1 : 2;
      const shiftLabel = openHour < 15 ? "Shift 1 (Pagi/Siang)" : "Shift 2 (Sore/Malam)";

      const shiftOrders = posOrders.filter(o => {
        const rawTime = o.created_at || (o as any).createdAt;
        const t = typeof rawTime === 'number' ? rawTime : rawTime ? new Date(rawTime).getTime() : 0;
        return t >= shift.openedAt && o.status === "Selesai";
      });

      const tenders = Object.entries(totals.tenderCounts).map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        percentage: totals.totalSales > 0 ? Math.round((data.total / totals.totalSales) * 100) : 0
      }));

      const salesByHour = Object.entries(totals.hourDataMap).map(([hr, data]) => ({
        hour: `${hr}:00`,
        count: data.pax,
        totalAmount: data.total,
        avgOrder: data.pax > 0 ? Math.round(data.total / data.pax) : 0
      })).sort((a,b) => parseInt(a.hour) - parseInt(b.hour));

      const report: ShiftReport = {
        id: `SHIFT-${Date.now()}`,
        shiftNumber: shiftNum,
        outlet: "LapanbelasCoffee",
        posDevice: "POS Kasir 1",
        staff: shift.staff,
        closedBy: currentUser?.name || shift.staff,
        openedAt: shift.openedAt,
        closedAt: Date.now(),
        startingCash: totals.starting,
        cashSales: totals.cashSales,
        qrisSales: totals.qrisSales,
        transferSales: totals.transferSales,
        cashInTotal: totals.cashInTotal,
        cashOutTotal: totals.cashOutTotal,
        expectedCash: totals.expectedCash,
        actualCash: actual,
        difference: diff,
        totalSales: totals.totalSales,
        grossSales: totals.totalSales,
        discountTotal: 0,
        serviceChargeTotal: 0,
        taxTotal: 0,
        netSales: totals.totalSales,
        totalInvoices: shiftOrders.length,
        expenses: [...pettyCashList],
        tenders,
        salesByHour
      };

      setShiftHistory(prev => [report, ...prev]);

      // Notifikasi Telegram konsisten
      const diffText = diff > 0 
        ? `+Rp ${diff.toLocaleString('id-ID')} (Surplus/Lebih)` 
        : diff < 0 
        ? `-Rp ${Math.abs(diff).toLocaleString('id-ID')} (Minus/Kurang)` 
        : `Rp 0 (Pas/Sesuai)`;

      const expensesOut = pettyCashList.filter(p => p.type === "out");
      let expensesText = "";
      if (expensesOut.length > 0) {
        expensesText = 
          `━━━━━━━━━━━━━━\n\n` +
          `<b>Rincian Pengeluaran</b>\n\n` +
          expensesOut.map(p => 
            `• <b>${p.description}</b>\nRp${p.amount.toLocaleString('id-ID')}`
          ).join('\n\n') + `\n\n`;
      } else {
        expensesText = `━━━━━━━━━━━━━━\n\n<b>Rincian Pengeluaran</b>\n• Tidak Ada Pengeluaran\n\n`;
      }

      const todayStrFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      const telegramMsg = 
        `📊 <b>Shift #${shiftNum} Ditutup</b>\n\n` +
        `👤 <b>Kasir</b>\n${shift.staff}\n\n` +
        `📅 ${todayStrFormatted}\n\n` +
        `🧾 <b>Total Order</b>\n${shiftOrders.length}\n\n` +
        `💰 <b>Pendapatan</b>\nRp${totals.totalSales.toLocaleString('id-ID')}\n\n` +
        `💸 <b>Pengeluaran</b>\nRp${totals.cashOutTotal.toLocaleString('id-ID')}\n\n` +
        expensesText +
        `━━━━━━━━━━━━━━\n\n` +
        `💵 <b>Cash</b>\nRp${totals.cashSales.toLocaleString('id-ID')}\n\n` +
        `📱 <b>QRIS</b>\nRp${totals.qrisSales.toLocaleString('id-ID')}\n\n` +
        `💳 <b>Transfer</b>\nRp${totals.transferSales.toLocaleString('id-ID')}`;

      sendTelegramMessage(telegramMsg);
    }

    setShift(null);
    setPettyCashList([]);
    setIsCloseModalOpen(false);
    onNotify(`Shift ditutup. Selisih: ${diff >= 0 ? '+' : ''}${diff}. Laporan terkirim ke Telegram.`, "info");
  };

  const handleAddPettyCash = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(pettyAmount.replace(/\D/g, "")) || 0;
    if (amt <= 0 || !pettyDesc.trim()) return;

    if (editingPettyId) {
      setPettyCashList(prev => prev.map(pc => pc.id === editingPettyId ? {
        ...pc,
        type: pettyType,
        amount: amt,
        description: pettyDesc,
        category: pettyCategory,
        notes: pettyNotes,
        createdBy: pettyUser
      } : pc));
      onNotify("Catatan pengeluaran kas diperbarui.", "success");
    } else {
      const newPetty: PettyCash = {
        id: `PC-${Date.now()}`,
        type: pettyType,
        amount: amt,
        description: pettyDesc.trim(),
        category: pettyCategory || "Operasional",
        notes: pettyNotes.trim() || undefined,
        createdBy: pettyUser || currentUser?.name || shift?.staff || "Kasir",
        timestamp: Date.now()
      };
      setPettyCashList(prev => [newPetty, ...prev]);

      if (pettyType === "out") {
        const txTitle = `${pettyDesc.trim()}${pettyNotes.trim() ? ` (${pettyNotes.trim()})` : ''} [Kasir: ${newPetty.createdBy}]`;
        supabase.from('transactions').insert([{
          id: `tx-pc-${Date.now()}`,
          date: new Date().toLocaleDateString("id-ID"),
          title: txTitle,
          category: pettyCategory || "Operasional",
          status: "Cleared",
          amount: amt,
          type: "outflow"
        }]).then(({ error }) => {
          if (error) console.warn("Sync transaction warning:", error);
        });
      }

      onNotify(`Pengeluaran "${pettyDesc}" Rp${amt.toLocaleString("id-ID")} dicatat.`, "success");
    }

    setIsPettyModalOpen(false);
    setEditingPettyId(null);
    setPettyAmount("");
    setPettyDesc("");
    setPettyNotes("");
  };

  const handlePrintReport = (r?: ShiftReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportStaff = r ? r.staff : shift?.staff || "Kasir";
    const openTime = r ? new Date(r.openedAt).toLocaleString('id-ID') : shift ? new Date(shift.openedAt).toLocaleString('id-ID') : "-";
    const closeTime = r ? new Date(r.closedAt).toLocaleString('id-ID') : "Shift Masih Aktif";

    const starting = r ? r.startingCash : totals.starting;
    const cashS = r ? r.cashSales : totals.cashSales;
    const cashIn = r ? r.cashInTotal : totals.cashInTotal;
    const cashOut = r ? r.cashOutTotal : totals.cashOutTotal;
    const expCash = r ? r.expectedCash : totals.expectedCash;
    const actCash = r ? r.actualCash : 0;
    const diff = r ? r.difference : 0;

    const totalS = r ? r.totalSales : totals.totalSales;

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Shift - ${reportStaff}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 12px; color: #333; }
            h2 { font-size: 18px; margin-bottom: 5px; color: #8b2626; border-bottom: 2px solid #8b2626; padding-bottom: 8px; }
            .section-title { font-size: 14px; font-weight: bold; color: #8b2626; margin-top: 20px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            td { padding: 6px 0; border-bottom: 1px dashed #eee; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Laporan Shift - POS18 Coffee</h2>
          <p><b>Kasir:</b> ${reportStaff} | <b>Buka:</b> ${openTime} | <b>Tutup:</b> ${closeTime}</p>

          <div class="section-title">Laci Kas</div>
          <table>
            <tr><td>Mulai Tunai</td><td class="text-right">IDR ${starting.toLocaleString('id-ID')}</td></tr>
            <tr><td>Pembayaran Tunai</td><td class="text-right">IDR ${cashS.toLocaleString('id-ID')}</td></tr>
            <tr><td>Pengembalian Uang Tunai</td><td class="text-right">IDR 0</td></tr>
            <tr><td>Dibayar (Kas Masuk)</td><td class="text-right">IDR ${cashIn.toLocaleString('id-ID')}</td></tr>
            <tr><td>Terbayar (Kas Keluar)</td><td class="text-right">-IDR ${cashOut.toLocaleString('id-ID')}</td></tr>
            <tr class="font-bold"><td>Jumlah Uang Tunai yang Diharapkan</td><td class="text-right">IDR ${expCash.toLocaleString('id-ID')}</td></tr>
            ${r ? `<tr class="font-bold"><td>Jumlah Uang Tunai Aktual</td><td class="text-right">IDR ${actCash.toLocaleString('id-ID')}</td></tr>
            <tr class="font-bold"><td>Perbedaan</td><td class="text-right">${diff >= 0 ? '' : ''}IDR ${diff.toLocaleString('id-ID')}</td></tr>` : ''}
          </table>

          <div class="section-title">Ringkasan Penjualan</div>
          <table>
            <tr><td>Penjualan</td><td class="text-right">IDR ${totalS.toLocaleString('id-ID')}</td></tr>
            <tr><td>Penjualan Bersih</td><td class="text-right font-bold">IDR ${totalS.toLocaleString('id-ID')}</td></tr>
            <tr class="font-bold"><td>Jumlah yang Diterima</td><td class="text-right">IDR ${totalS.toLocaleString('id-ID')}</td></tr>
          </table>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtered shift history
  const filteredHistory = useMemo(() => {
    return shiftHistory.filter(r => {
      const matchSearch = r.staff.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
      const matchShiftNum = filterShiftNum === "Semua Shift" || (r.shiftNumber ? `Shift ${r.shiftNumber}` : "Shift 1") === filterShiftNum;

      let matchDate = true;
      if (startDate && endDate) {
        const opened = new Date(r.openedAt);
        const s = new Date(startDate); s.setHours(0,0,0,0);
        const e = new Date(endDate); e.setHours(23,59,59,999);
        matchDate = opened >= s && opened <= e;
      }

      return matchSearch && matchShiftNum && matchDate;
    });
  }, [shiftHistory, search, startDate, endDate, filterShiftNum]);

  // Active view report data source (either active shift or selected historical shift)
  const activeReport = selectedShiftDetail;

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 overflow-hidden font-sans relative">
      
      {/* Top Main Navigation Header */}
      <div className="bg-[#4d3227] text-white flex items-center justify-between px-6 py-4 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-xl">Laporan Shift</span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode(viewMode === "history" ? "active" : "history")}
            className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">{viewMode === "history" ? "grid_view" : "history"}</span>
            {viewMode === "history" ? "Shift Aktif" : "Riwayat Shift"}
          </button>

          <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${shift?.isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {shift?.isOpen ? 'SHIFT AKTIF' : 'SHIFT DITUTUP'}
          </div>

          {!shift?.isOpen ? (
            <button onClick={() => setIsShiftModalOpen(true)} className="bg-white text-[#4d3227] px-4 py-2 rounded-xl font-extrabold text-xs shadow-md hover:bg-slate-100 transition-all flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              Buka Shift
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditingPettyId(null); setPettyAmount(""); setPettyDesc(""); setIsPettyModalOpen(true); }} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">swap_vert</span>
                Kas Keluar / Masuk
              </button>
              <button onClick={() => setIsCloseModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1 shadow-md">
                <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                Tutup Shift
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-4xl">

          {/* MODE 1: HISTORI SHIFT TABEL */}
          {viewMode === "history" && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#4d3227]">Riwayat Audit Shift</h2>
                  <p className="text-slate-500 text-xs font-medium mt-1">Daftar shift yang telah ditutup kasir.</p>
                </div>
                <button onClick={() => setViewMode("active")} className="text-slate-600 font-bold text-xs hover:underline">
                  Kembali ke Shift Aktif
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-[#8b2626] text-white font-extrabold">
                    <tr>
                      <th className="p-4 text-center">Shift</th>
                      <th className="p-4">Staf Buka</th>
                      <th className="p-4">Staf Tutup</th>
                      <th className="p-4">Waktu Buka</th>
                      <th className="p-4 text-right">Expected Cash</th>
                      <th className="p-4 text-right">Actual Cash</th>
                      <th className="p-4 text-right">Perbedaan</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((report, idx) => (
                      <tr key={report.id} onClick={() => { setSelectedShiftDetail(report); setViewMode("detail"); }} className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <td className="p-4 text-center font-black">{report.shiftNumber || 1}</td>
                        <td className="p-4 font-bold text-blue-600">{report.staff}</td>
                        <td className="p-4 font-bold text-emerald-600">{report.closedBy || report.staff}</td>
                        <td className="p-4 text-slate-500">{new Date(report.openedAt).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-bold">IDR {report.expectedCash.toLocaleString('id-ID')}</td>
                        <td className="p-4 text-right font-bold">IDR {report.actualCash.toLocaleString('id-ID')}</td>
                        <td className={`p-4 text-right font-extrabold ${report.difference < 0 ? 'text-red-600' : report.difference > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {report.difference >= 0 ? '' : ''}IDR {report.difference.toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedShiftDetail(report); setViewMode("detail"); }} className="px-3 py-1 bg-slate-800 text-white font-bold rounded-lg text-[11px]">
                            Lihat Laporan
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr><td colSpan={8} className="p-10 text-center text-slate-400 font-medium">Belum ada data shift ditutup.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODE 2 & 3: LAPORAN SHIFT CLEAN VIEW (MATCHING THE 4 REFERENCE SCREENSHOTS) */}
          {viewMode !== "history" && (
            <div className="flex flex-col gap-6 animate-fade-in">

              {/* Top Banner & Action */}
              {viewMode === "detail" && selectedShiftDetail ? (
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <button onClick={() => setViewMode("history")} className="text-slate-600 font-bold text-xs flex items-center gap-1 hover:text-[#8b2626]">
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Kembali ke Riwayat
                  </button>
                  <span className="font-extrabold text-[#8b2626] text-sm">
                    Laporan Shift #{selectedShiftDetail.shiftNumber || 1} — {selectedShiftDetail.staff}
                  </span>
                  <button onClick={() => handlePrintReport(selectedShiftDetail)} className="text-[#8b2626] hover:bg-red-50 p-2 rounded-xl">
                    <span className="material-symbols-outlined text-lg">print</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-[#8b2626]">
                      {shift?.isOpen ? `Laporan Shift Aktif — ${shift.staff}` : "Laporan Shift (Belum Buka Shift)"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {shift?.isOpen ? `Waktu Buka: ${new Date(shift.openedAt).toLocaleString('id-ID')}` : "Silakan buka shift terlebih dahulu untuk mulai berjualan."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {shift?.isOpen && (
                      <button onClick={() => handlePrintReport()} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">print</span>
                        Cetak Laporan
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* MAIN REPORT CARD matching user screenshots */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Header Bar */}
                <div className="bg-[#bbf7d0] px-6 py-3.5 border-b border-emerald-200 flex justify-between items-center text-emerald-950 font-black text-lg">
                  <span>Laporan Shift</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handlePrintReport(activeReport || undefined)} className="hover:opacity-75 transition-opacity">
                      <span className="material-symbols-outlined text-xl">download</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col gap-8 text-sm text-slate-700">
                  
                  {/* 1. LACI KAS (CASH DRAWER) */}
                  <div>
                    <h3 className="font-extrabold text-[#8b2626] text-base mb-3">Laci Kas</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Mulai Tunai</span>
                        <span className="font-bold text-slate-800">IDR {(activeReport ? activeReport.startingCash : totals.starting).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pembayaran Tunai</span>
                        <span className="font-bold text-slate-800">IDR {(activeReport ? activeReport.cashSales : totals.cashSales).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pengembalian Uang Tunai</span>
                        <span className="font-bold text-slate-800">IDR 0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dibayar (Kas Masuk)</span>
                        <span className="font-bold text-slate-800">IDR {(activeReport ? activeReport.cashInTotal : totals.cashInTotal).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Terbayar (Pengeluaran Kas)</span>
                        <span className="font-bold text-slate-800">-IDR {(activeReport ? activeReport.cashOutTotal : totals.cashOutTotal).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                        <span>Jumlah Uang Tunai yang Diharapkan</span>
                        <span>IDR {(activeReport ? activeReport.expectedCash : totals.expectedCash).toLocaleString('id-ID')}</span>
                      </div>
                      
                      {activeReport ? (
                        <>
                          <div className="flex justify-between font-extrabold text-slate-900">
                            <span>Jumlah Uang Tunai Aktual</span>
                            <span>IDR {activeReport.actualCash.toLocaleString('id-ID')}</span>
                          </div>
                          <div className={`flex justify-between font-black pt-1 ${activeReport.difference < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            <span>Perbedaan</span>
                            <span>{activeReport.difference >= 0 ? '' : ''}IDR {activeReport.difference.toLocaleString('id-ID')}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between font-extrabold text-slate-400 italic">
                          <span>Jumlah Uang Tunai Aktual</span>
                          <span>(Dihitung saat Tutup Shift)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* 2. RINGKASAN PENJUALAN */}
                  <div>
                    <h3 className="font-extrabold text-[#8b2626] text-base mb-3">Ringkasan Penjualan</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Penjualan</span>
                        <span className="font-bold text-slate-800">IDR {(activeReport ? activeReport.totalSales : totals.totalSales).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Biaya Khusus</span>
                        <span>IDR 0</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Biaya Layanan</span>
                        <span>IDR 0</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Pengembalian</span>
                        <span>IDR 0</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Potongan Harga</span>
                        <span>IDR 0</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-slate-900 pt-1">
                        <span>Penjualan Bersih</span>
                        <span>IDR {(activeReport ? activeReport.totalSales : totals.totalSales).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Pajak</span>
                        <span>IDR 0</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Pembulatan</span>
                        <span>IDR 0</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Jumlah Tip</span>
                        <span>IDR 0</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-100 text-base">
                        <span>Jumlah yang Diterima</span>
                        <span>IDR {(activeReport ? activeReport.totalSales : totals.totalSales).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* 3. TENDERS (METODE PEMBAYARAN) */}
                  <div>
                    <h3 className="font-extrabold text-[#8b2626] text-base mb-3">Tenders</h3>
                    <div className="space-y-3">
                      {activeReport?.tenders && activeReport.tenders.length > 0 ? (
                        activeReport.tenders.map((t, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{t.name}</span>
                            <div className="flex gap-12 items-center font-bold text-slate-800">
                              <span className="text-slate-500">X{t.count}</span>
                              <span>IDR {t.total.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">Cash</span>
                            <div className="flex gap-12 items-center font-bold text-slate-800">
                              <span className="text-slate-500">X{totals.tenderCounts.Cash?.count || 0}</span>
                              <span>IDR {totals.cashSales.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">QRIS</span>
                            <div className="flex gap-12 items-center font-bold text-slate-800">
                              <span className="text-slate-500">X{totals.tenderCounts.QRIS?.count || 0}</span>
                              <span>IDR {totals.qrisSales.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                          {totals.transferSales > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800">Transfer</span>
                              <div className="flex gap-12 items-center font-bold text-slate-800">
                                <span className="text-slate-500">X{totals.tenderCounts.Transfer?.count || 0}</span>
                                <span>IDR {totals.transferSales.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex justify-between items-center font-black pt-2 border-t border-slate-100">
                        <span>Void Total</span>
                        <div className="flex gap-12 items-center">
                          <span>X0</span>
                          <span>IDR 0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* 4. MEMBAYAR (PAY OUT / PENGELUARAN KASIR) */}
                  <div>
                    <h3 className="font-extrabold text-[#8b2626] text-base mb-3">Membayar (Pengeluaran Kas Shift)</h3>
                    
                    {((activeReport ? activeReport.expenses : pettyCashList) || []).filter(p => p.type === "out").length > 0 ? (
                      <div className="space-y-4">
                        {((activeReport ? activeReport.expenses : pettyCashList) || []).filter(p => p.type === "out").map((exp, idx) => (
                          <div key={exp.id || idx} className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-400">
                                  {new Date(exp.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                                <span className="font-bold text-slate-800">{exp.createdBy || (activeReport ? activeReport.staff : shift?.staff) || "Kasir"}</span>
                              </div>
                              <span className="text-xs text-slate-500 mt-0.5 italic">{exp.description}{exp.notes ? ` (${exp.notes})` : ''}</span>
                            </div>
                            <span className="font-black text-red-600">-IDR {exp.amount.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-xs">Belum ada pengeluaran kas yang dicatat pada shift ini.</p>
                    )}
                  </div>

                  <hr className="border-slate-200" />

                  {/* 5. PENJUALAN BERDASARKAN JAM */}
                  <div>
                    <h3 className="font-extrabold text-[#8b2626] text-base mb-3">Penjualan Berdasarkan Jam</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="pb-2">Jam</th>
                            <th className="pb-2 text-center">Pax</th>
                            <th className="pb-2 text-right">Jumlah</th>
                            <th className="pb-2 text-right">Rata-rata/orang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeReport?.salesByHour && activeReport.salesByHour.length > 0 ? (
                            activeReport.salesByHour.map((h, idx) => (
                              <tr key={idx}>
                                <td className="py-2 font-bold">{h.hour}</td>
                                <td className="py-2 text-center font-bold text-slate-600">{h.count}</td>
                                <td className="py-2 text-right font-bold text-slate-800">IDR {h.totalAmount.toLocaleString('id-ID')}</td>
                                <td className="py-2 text-right text-slate-500">IDR {h.avgOrder.toLocaleString('id-ID')}</td>
                              </tr>
                            ))
                          ) : (
                            Object.entries(totals.hourDataMap).map(([hr, data]) => (
                              <tr key={hr}>
                                <td className="py-2 font-bold">{hr}:00</td>
                                <td className="py-2 text-center font-bold text-slate-600">{data.pax}</td>
                                <td className="py-2 text-right font-bold text-slate-800">IDR {data.total.toLocaleString('id-ID')}</td>
                                <td className="py-2 text-right text-slate-500">
                                  IDR {(data.pax > 0 ? Math.round(data.total / data.pax) : 0).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))
                          )}

                          {Object.keys(totals.hourDataMap).length === 0 && !activeReport && (
                            <tr><td colSpan={4} className="py-4 text-center text-slate-400">Belum ada penjualan di shift ini.</td></tr>
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
      </div>

      {/* --- MODALS --- */}
      
      {/* Open Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up flex flex-col">
            <div className="bg-[#4d3227] text-white p-6">
              <h3 className="text-xl font-extrabold">Buka Shift Kasir</h3>
              <p className="text-sm opacity-80 mt-1">Masukkan modal awal uang fisik di laci.</p>
            </div>
            <form onSubmit={handleOpenShift} className="p-6 flex flex-col gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Staf Kasir</label>
                <input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 font-medium focus:border-[#4d3227] outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Modal Awal (Mulai Tunai)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input type="text" value={startingCash} onChange={e => {
                    const nums = e.target.value.replace(/\D/g, "");
                    setStartingCash(nums ? parseInt(nums).toLocaleString("id-ID") : "");
                  }} className="w-full text-right font-bold text-lg border border-slate-300 rounded-xl pl-12 pr-4 py-3 focus:border-[#4d3227] outline-none" required />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsShiftModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-[#4d3227] text-white rounded-xl font-bold hover:bg-[#3a251d] transition-colors shadow-lg">Buka Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Petty Cash / Expense Modal */}
      {isPettyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up flex flex-col">
            <div className="bg-[#8b2626] text-white p-6">
              <h3 className="text-xl font-extrabold">Catat Pengeluaran Shift</h3>
              <p className="text-sm opacity-80 mt-1">Masukkan rincian barang/kebutuhan yang dibeli kasir.</p>
            </div>
            <form onSubmit={handleAddPettyCash} className="p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nama / Deskripsi Barang <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={pettyDesc} 
                  onChange={e => setPettyDesc(e.target.value)} 
                  placeholder="Contoh: es kristal 5 pack, air jerigen RO 3" 
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 font-medium focus:border-red-800 outline-none" 
                  required 
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["es kristal 5 pack", "air jerigen RO 3", "makan staf", "gas 3kg", "tisu & atk", "ongkir / paket"].map(preset => (
                    <button 
                      type="button" 
                      key={preset} 
                      onClick={() => setPettyDesc(preset)} 
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Jumlah Nominal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input 
                    type="text" 
                    value={pettyAmount} 
                    onChange={e => {
                      const nums = e.target.value.replace(/\D/g, "");
                      setPettyAmount(nums ? parseInt(nums).toLocaleString("id-ID") : "");
                    }} 
                    placeholder="18.000"
                    className="w-full text-right font-bold text-lg border border-slate-300 rounded-xl pl-12 pr-4 py-3 focus:border-red-800 outline-none" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Catatan Rincian <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input 
                  type="text" 
                  value={pettyNotes} 
                  onChange={e => setPettyNotes(e.target.value)} 
                  placeholder="Contoh: Beli di warung sebelah" 
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 font-medium focus:border-red-800 outline-none text-sm" 
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => { 
                    setIsPettyModalOpen(false); 
                    setEditingPettyId(null); 
                    setPettyAmount(""); 
                    setPettyDesc(""); 
                    setPettyNotes("");
                  }} 
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-[#8b2626] text-white rounded-xl font-bold hover:bg-[#6e1e1e] transition-colors shadow-lg"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col">
            <div className="bg-[#8b2626] text-white p-6">
              <h3 className="text-xl font-extrabold">Tutup Shift Kasir</h3>
              <p className="text-sm text-red-100 mt-1">Harap hitung jumlah fisik uang di dalam laci kasir.</p>
            </div>
            <form onSubmit={handleCloseShift} className="p-6 flex flex-col gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-500">Jumlah Uang Tunai Diharapkan</span>
                <span className="text-xl font-extrabold text-slate-800">IDR {totals.expectedCash.toLocaleString("id-ID")}</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Uang Tunai Aktual (Hitungan Laci)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input type="text" value={actualCash} onChange={e => {
                    const nums = e.target.value.replace(/\D/g, "");
                    setActualCash(nums ? parseInt(nums).toLocaleString("id-ID") : "");
                  }} className="w-full text-right font-extrabold text-2xl border-2 border-slate-300 rounded-xl pl-12 pr-4 py-4 focus:border-red-600 outline-none text-slate-800" required autoFocus />
                </div>
              </div>

              {actualCash !== "" && (
                <div className={`p-4 rounded-xl border ${parseInt(actualCash.replace(/\D/g, "")) - totals.expectedCash === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <div className="flex justify-between font-bold">
                    <span>Perbedaan (Selisih Kas)</span>
                    <span>IDR {(parseInt(actualCash.replace(/\D/g, "")) - totals.expectedCash).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsCloseModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-[#8b2626] text-white rounded-xl font-bold hover:bg-[#6e1e1e] transition-colors shadow-lg shadow-red-900/20">Cetak Laporan & Tutup</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
