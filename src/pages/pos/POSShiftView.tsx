import React, { useState, useEffect } from "react";
import { usePOSContext } from "../../layouts/POSLayout";
import { usePosStore } from "../../store/posStore";
import { useAuthStore } from "../../store/authStore";
import { Order } from "../../types";
import { sendTelegramMessage } from "../../lib/telegram";

interface POSShiftViewProps {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
  posOrders: Order[];
}

interface ShiftData {
  isOpen: boolean;
  staff: string;
  openedAt: number;
  startingCash: number;
}

interface PettyCash {
  id: string;
  type: "in" | "out";
  amount: number;
  description: string;
  timestamp: number;
}

interface ShiftReport {
  id: string;
  staff: string;
  openedAt: number;
  closedAt: number;
  startingCash: number;
  cashSales: number;
  qrisSales: number;
  cashInTotal: number;
  cashOutTotal: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  totalSales: number;
}

export default function POSShiftView({ onNotify, posOrders }: POSShiftViewProps) {
  const { sidebarOpen, setSidebarOpen } = usePOSContext();
  const { currentUser } = useAuthStore();

  const [shift, setShift] = useState<ShiftData | null>(null);
  const [pettyCashList, setPettyCashList] = useState<PettyCash[]>([]);
  const [shiftHistory, setShiftHistory] = useState<ShiftReport[]>([]);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isPettyModalOpen, setIsPettyModalOpen] = useState(false);
  const [editingPettyId, setEditingPettyId] = useState<string | null>(null);

  // Form states
  const [staffName, setStaffName] = useState(currentUser?.name || "Kasir");
  const [startingCash, setStartingCash] = useState("100000");
  const [pettyAmount, setPettyAmount] = useState("");
  const [pettyDesc, setPettyDesc] = useState("");
  const [pettyType, setPettyType] = useState<"in" | "out">("out");
  const [actualCash, setActualCash] = useState("");

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

  // Calculations
  const calculateTotals = () => {
    let cashSales = 0;
    let qrisSales = 0;

    if (shift) {
      // Hanya hitung order yang masuk SELAMA shift berlangsung
      posOrders.forEach(o => {
        const orderTime = (o as any).created_at 
          ? new Date((o as any).created_at).getTime() 
          : 0;
        const isInShift = orderTime >= shift.openedAt;
        if (!isInShift) return;
        
        if (o.payment === "Cash") cashSales += o.total;
        if (o.payment === "QRIS" || o.payment === "QRIS (Paid)") qrisSales += o.total;
      });
    }

    const cashInTotal = pettyCashList.filter(p => p.type === "in").reduce((sum, p) => sum + p.amount, 0);
    const cashOutTotal = pettyCashList.filter(p => p.type === "out").reduce((sum, p) => sum + p.amount, 0);
    
    const starting = shift ? shift.startingCash : 0;
    const expectedCash = starting + cashSales + cashInTotal - cashOutTotal;
    const totalSales = cashSales + qrisSales;

    return { cashSales, qrisSales, cashInTotal, cashOutTotal, expectedCash, totalSales, starting };
  };

  const totals = calculateTotals();

  // Handlers
  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift: ShiftData = {
      isOpen: true,
      staff: staffName,
      openedAt: Date.now(),
      startingCash: parseInt(startingCash.replace(/\D/g, "")) || 0
    };
    setShift(newShift);
    setPettyCashList([]);
    setIsShiftModalOpen(false);
    onNotify(`Shift dibuka oleh ${staffName}`, "success");
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseInt(actualCash.replace(/\D/g, "")) || 0;
    const diff = actual - totals.expectedCash;
    
    if (shift) {
      const report: ShiftReport = {
        id: `SHIFT-${Date.now()}`,
        staff: shift.staff,
        openedAt: shift.openedAt,
        closedAt: Date.now(),
        startingCash: totals.starting,
        cashSales: totals.cashSales,
        qrisSales: totals.qrisSales,
        cashInTotal: totals.cashInTotal,
        cashOutTotal: totals.cashOutTotal,
        expectedCash: totals.expectedCash,
        actualCash: actual,
        difference: diff,
        totalSales: totals.totalSales
      };
      setShiftHistory(prev => [report, ...prev]);

      // Kirim Notifikasi Tutup Shift ke Telegram
      const openHour = new Date(shift.openedAt).getHours();
      const shiftLabel = openHour < 15 ? "Shift 1 (Pagi/Siang)" : "Shift 2 (Sore/Malam)";
      const diffText = diff > 0 
        ? `+Rp ${diff.toLocaleString('id-ID')} (Surplus/Lebih)` 
        : diff < 0 
        ? `-Rp ${Math.abs(diff).toLocaleString('id-ID')} (Minus/Kurang)` 
        : `Rp 0 (Pas/Sesuai)`;

      const shiftOrdersCount = posOrders.filter(o => {
        const rawTime = o.created_at || (o as any).createdAt;
        const t = typeof rawTime === 'number' ? rawTime : rawTime ? new Date(rawTime).getTime() : 0;
        return t >= shift.openedAt;
      }).length;

      const telegramMsg = 
        `🔒 <b>NOTIFIKASI TUTUP SHIFT [${shiftLabel.toUpperCase()}]</b>\n` +
        `-----------------------------------------\n` +
        `👤 <b>Kasir:</b> ${shift.staff}\n` +
        `📅 <b>Waktu Tutup:</b> ${new Date().toLocaleString('id-ID')}\n` +
        `🕒 <b>Waktu Buka:</b> ${new Date(shift.openedAt).toLocaleString('id-ID')}\n` +
        `-----------------------------------------\n` +
        `💰 <b>Total Penjualan:</b> Rp ${totals.totalSales.toLocaleString('id-ID')}\n` +
        `📊 <b>Jumlah Transaksi:</b> ${shiftOrdersCount} Transaksi\n` +
        `💵 <b>Kasir Tunai (Cash):</b> Rp ${totals.cashSales.toLocaleString('id-ID')}\n` +
        `📱 <b>Kasir Non-Tunai (QRIS):</b> Rp ${totals.qrisSales.toLocaleString('id-ID')}\n` +
        `-----------------------------------------\n` +
        `📥 <b>Saldo Kas Awal:</b> Rp ${totals.starting.toLocaleString('id-ID')}\n` +
        `📥 <b>Petty Cash Masuk:</b> Rp ${totals.cashInTotal.toLocaleString('id-ID')}\n` +
        `📤 <b>Petty Cash Keluar:</b> Rp ${totals.cashOutTotal.toLocaleString('id-ID')}\n` +
        `💵 <b>Ekspektasi Kas Fisik:</b> Rp ${totals.expectedCash.toLocaleString('id-ID')}\n` +
        `💵 <b>Aktual Kas Fisik:</b> Rp ${actual.toLocaleString('id-ID')}\n` +
        `⚖️ <b>Selisih Kas:</b> ${diffText}`;

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
    if (amt <= 0 || !pettyDesc) return;

    if (editingPettyId) {
      setPettyCashList(prev => prev.map(pc => pc.id === editingPettyId ? { ...pc, type: pettyType, amount: amt, description: pettyDesc } : pc));
      onNotify("Catatan kas diperbarui.", "success");
    } else {
      const newPetty: PettyCash = {
        id: `PC-${Date.now()}`,
        type: pettyType,
        amount: amt,
        description: pettyDesc,
        timestamp: Date.now()
      };
      setPettyCashList(prev => [newPetty, ...prev]);
      onNotify(`Kas ${pettyType === "in" ? "Masuk" : "Keluar"} Rp${amt.toLocaleString("id-ID")} dicatat.`, "success");
    }

    setIsPettyModalOpen(false);
    setEditingPettyId(null);
    setPettyAmount("");
    setPettyDesc("");
  };

  const handleEditPetty = (pc: PettyCash) => {
    setEditingPettyId(pc.id);
    setPettyType(pc.type);
    setPettyAmount(pc.amount.toString());
    setPettyDesc(pc.description);
    setIsPettyModalOpen(true);
  };

  const handleDeletePetty = (id: string) => {
    if (confirm("Yakin ingin menghapus catatan kas ini?")) {
      setPettyCashList(prev => prev.filter(pc => pc.id !== id));
      onNotify("Catatan kas dihapus.", "info");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 overflow-hidden font-sans relative">
      
      {/* Header */}
      <div className="bg-[#4d3227] text-white flex items-center justify-between px-6 py-4 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-xl">Manajemen Shift</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${shift?.isOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {shift?.isOpen ? 'SHIFT AKTIF' : 'SHIFT DITUTUP'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-6xl">
          
          {/* Actions & Info Bar */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#4d3227] mb-1">
                {shift?.isOpen ? `Shift Aktif: ${shift.staff}` : "Belum Ada Shift Aktif"}
              </h2>
              <p className="text-slate-500 font-medium text-sm">
                {shift?.isOpen 
                  ? `Dibuka sejak: ${new Date(shift.openedAt).toLocaleString("id-ID")}` 
                  : "Silakan buka shift untuk mulai menerima pembayaran."}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {!shift?.isOpen ? (
                <button onClick={() => setIsShiftModalOpen(true)} className="bg-[#4d3227] text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-[#3a251d] transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">play_circle</span>
                  Buka Shift
                </button>
              ) : (
                <>
                  <button onClick={() => { setEditingPettyId(null); setPettyAmount(""); setPettyDesc(""); setIsPettyModalOpen(true); }} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">swap_vert</span>
                    Kas Masuk / Keluar
                  </button>
                  <button onClick={() => setIsCloseModalOpen(true)} className="bg-red-50 text-red-600 border-2 border-red-200 px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-red-100 hover:border-red-300 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">stop_circle</span>
                    Tutup Shift
                  </button>
                </>
              )}
            </div>
          </div>

          {shift?.isOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Arus Kas (Cash Flow) */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="font-extrabold text-[#4d3227] text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined">payments</span>
                    Arus Kas Fisik (Di Laci)
                  </h3>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-slate-600 pb-4 border-b border-dashed border-slate-200">
                    <span className="font-medium">Modal Awal</span>
                    <span className="font-bold text-slate-800">Rp {totals.starting.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 pb-4 border-b border-dashed border-slate-200">
                    <span className="font-medium">Pembayaran Tunai Masuk</span>
                    <span className="font-bold text-emerald-600">+ Rp {totals.cashSales.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 pb-4 border-b border-dashed border-slate-200">
                    <span className="font-medium">Kas Masuk Tambahan</span>
                    <span className="font-bold text-emerald-600">+ Rp {totals.cashInTotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 pb-4 border-b border-dashed border-slate-200">
                    <span className="font-medium">Kas Keluar (Pengeluaran)</span>
                    <span className="font-bold text-red-500">- Rp {totals.cashOutTotal.toLocaleString("id-ID")}</span>
                  </div>
                  
                  <div className="mt-auto pt-6 flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Uang Tunai Diharapkan</span>
                      <span className="text-sm font-medium text-slate-500">Expected Cash in Drawer</span>
                    </div>
                    <span className="text-3xl font-extrabold text-[#4d3227]">Rp {totals.expectedCash.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

              {/* Ringkasan Penjualan */}
              <div className="flex flex-col gap-8">
                
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h3 className="font-extrabold text-[#4d3227] text-lg flex items-center gap-2">
                      <span className="material-symbols-outlined">monitoring</span>
                      Ringkasan Penjualan (Sales)
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-6">
                    <div className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-500 text-sm font-medium mb-1">Total Tunai</span>
                      <span className="text-2xl font-extrabold text-slate-800">Rp {totals.cashSales.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-500 text-sm font-medium mb-1">Total QRIS/Non-Tunai</span>
                      <span className="text-2xl font-extrabold text-slate-800">Rp {totals.qrisSales.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="col-span-2 flex justify-between items-center p-5 bg-[#4d3227]/5 rounded-2xl border border-[#4d3227]/10">
                      <span className="font-extrabold text-[#4d3227]">TOTAL KESELURUHAN</span>
                      <span className="text-2xl font-extrabold text-[#4d3227]">Rp {totals.totalSales.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>

                {/* Aktivitas Kas History */}
                {pettyCashList.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200">
                      <h3 className="font-extrabold text-slate-700">Riwayat Kas Masuk/Keluar</h3>
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto max-h-48 custom-scrollbar">
                      {pettyCashList.map(pc => (
                        <div key={pc.id} className="flex justify-between items-center p-4 border-b border-slate-100 last:border-0 group hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pc.type === "in" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                              <span className="material-symbols-outlined text-[20px]">{pc.type === "in" ? "arrow_downward" : "arrow_upward"}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{pc.description}</span>
                              <span className="text-xs text-slate-400">{new Date(pc.timestamp).toLocaleTimeString("id-ID")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-bold ${pc.type === "in" ? "text-emerald-600" : "text-red-600"}`}>
                              {pc.type === "in" ? "+" : "-"}Rp{pc.amount.toLocaleString("id-ID")}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditPetty(pc)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button onClick={() => handleDeletePetty(pc.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {!shift?.isOpen && (
            shiftHistory.length > 0 ? (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mt-8 animate-fade-in">
                <h3 className="text-xl font-extrabold text-[#4d3227] mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">history</span>
                  Riwayat Laporan Shift
                </h3>
                <div className="grid gap-4">
                  {shiftHistory.map((report) => (
                    <div key={report.id} className="p-5 border border-slate-200 rounded-2xl flex flex-col md:flex-row justify-between gap-4 items-center bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col text-center md:text-left">
                        <span className="font-extrabold text-slate-800 text-lg">{report.staff}</span>
                        <span className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1 justify-center md:justify-start">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          {new Date(report.openedAt).toLocaleString("id-ID")} - {new Date(report.closedAt).toLocaleTimeString("id-ID")}
                        </span>
                      </div>
                      <div className="flex flex-wrap justify-center gap-4 md:gap-8 w-full md:w-auto">
                        <div className="flex flex-col text-center md:text-right bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex-1 md:flex-none">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Penjualan</span>
                          <span className="font-extrabold text-slate-700">Rp {report.totalSales.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex flex-col text-center md:text-right bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex-1 md:flex-none">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Uang Aktual (Di Laci)</span>
                          <span className="font-extrabold text-slate-700">Rp {report.actualCash.toLocaleString("id-ID")}</span>
                        </div>
                        <div className={`flex flex-col text-center md:text-right p-3 rounded-xl border flex-1 md:flex-none ${report.difference === 0 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Selisih Kas</span>
                          <span className={`font-extrabold ${report.difference === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                            {report.difference > 0 ? "+" : ""}Rp {report.difference.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-slate-400 mt-8">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">point_of_sale</span>
                <p className="font-medium">Shift saat ini belum dibuka. Buka shift untuk melacak transaksi.</p>
              </div>
            )
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Staf</label>
                <input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-3 font-medium focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227] outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Modal Awal (Tunai)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input type="text" value={startingCash} onChange={e => {
                    const nums = e.target.value.replace(/\D/g, "");
                    setStartingCash(nums ? parseInt(nums).toLocaleString("id-ID") : "");
                  }} className="w-full text-right font-bold text-lg border border-slate-300 rounded-xl pl-12 pr-4 py-3 focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227] outline-none" required />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsShiftModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-[#4d3227] text-white rounded-xl font-bold hover:bg-[#3a251d] transition-colors shadow-lg shadow-[#4d3227]/30">Buka Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Petty Cash Modal */}
      {isPettyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up flex flex-col">
            <div className="bg-slate-800 text-white p-6">
              <h3 className="text-xl font-extrabold">Kas Masuk / Keluar</h3>
              <p className="text-sm opacity-80 mt-1">Catat penambahan atau pengeluaran tunai (Kasbon).</p>
            </div>
            <form onSubmit={handleAddPettyCash} className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
                <button type="button" onClick={() => setPettyType("out")} className={`py-2.5 rounded-lg font-bold text-sm transition-all ${pettyType === "out" ? "bg-white text-red-600 shadow-sm" : "text-slate-500"}`}>Kas Keluar</button>
                <button type="button" onClick={() => setPettyType("in")} className={`py-2.5 rounded-lg font-bold text-sm transition-all ${pettyType === "in" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>Kas Masuk</button>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Jumlah Nominal</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input type="text" value={pettyAmount} onChange={e => {
                    const nums = e.target.value.replace(/\D/g, "");
                    setPettyAmount(nums ? parseInt(nums).toLocaleString("id-ID") : "");
                  }} className="w-full text-right font-bold text-lg border border-slate-300 rounded-xl pl-12 pr-4 py-3 focus:border-slate-800 outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Keterangan / Tujuan</label>
                <input type="text" value={pettyDesc} onChange={e => setPettyDesc(e.target.value)} placeholder="Contoh: Beli es batu, Kasbon staf" className="w-full border border-slate-300 rounded-xl px-4 py-3 font-medium focus:border-slate-800 outline-none mb-3" required />
                <div className="flex flex-wrap gap-2">
                  {["Es Kristal", "Air RO", "Paket", "Yakult", "Cleo"].map(item => (
                    <button type="button" key={item} onClick={() => setPettyDesc(item)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => { setIsPettyModalOpen(false); setEditingPettyId(null); setPettyAmount(""); setPettyDesc(""); }} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg">Simpan Kas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col">
            <div className="bg-red-600 text-white p-6">
              <h3 className="text-xl font-extrabold">Tutup Shift Kasir</h3>
              <p className="text-sm text-red-100 mt-1">Harap hitung jumlah fisik uang di dalam laci kasir.</p>
            </div>
            <form onSubmit={handleCloseShift} className="p-6 flex flex-col gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-500">Uang Diharapkan (Sistem)</span>
                <span className="text-xl font-extrabold text-slate-800">Rp {totals.expectedCash.toLocaleString("id-ID")}</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Uang Fisik Aktual (Hitungan Kasir)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input type="text" value={actualCash} onChange={e => {
                    const nums = e.target.value.replace(/\D/g, "");
                    setActualCash(nums ? parseInt(nums).toLocaleString("id-ID") : "");
                  }} className="w-full text-right font-extrabold text-2xl border-2 border-slate-300 rounded-xl pl-12 pr-4 py-4 focus:border-red-500 outline-none text-slate-800" required autoFocus />
                </div>
              </div>

              {actualCash !== "" && (
                <div className={`p-4 rounded-xl border ${parseInt(actualCash.replace(/\D/g, "")) - totals.expectedCash === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <div className="flex justify-between font-bold">
                    <span>Selisih (Short/Over)</span>
                    <span>Rp {(parseInt(actualCash.replace(/\D/g, "")) - totals.expectedCash).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsCloseModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30">Cetak Laporan & Tutup</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
