import React, { useState } from "react";
import { Transaction } from "../types";
import { formatRupiah } from "../utils";

interface FinancialViewProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onNotify: (message: string, type?: "success" | "warning") => void;
}

export default function FinancialView({
  transactions,
  setTransactions,
  onNotify
}: FinancialViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"sheet" | "ledger">("sheet");

  // Ledger filter states
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerCategory, setLedgerCategory] = useState("All");
  const [ledgerStatus, setLedgerStatus] = useState("All");

  // Add Transaction Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [txTitle, setTxTitle] = useState("");
  const [txCategory, setTxCategory] = useState("Sales");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"inflow" | "outflow">("inflow");

  // Bar Chart interactive mouseover state
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Scaled Indonesian Rupiah month-by-month trend data
  const cashTrendData = [
    { month: "Jan", inflow: 125000000, outflow: 78000000 },
    { month: "Feb", inflow: 142000000, outflow: 91000000 },
    { month: "Mar", inflow: 184500000, outflow: 124500000 },
    { month: "Apr", inflow: 161000000, outflow: 110000000 },
    { month: "Mei", inflow: 198000000, outflow: 132000000 },
    { month: "Jun", inflow: 224000000, outflow: 145000000 }
  ];

  const categoryLabels: Record<string, string> = {
    "Sales": "Penjualan",
    "Supplier PO": "PO Pemasok",
    "Payroll": "Gaji Karyawan",
    "Top-ups": "Isi Ulang Saldo"
  };

  const statusLabels: Record<string, string> = {
    "Cleared": "Lunas",
    "Pending": "Tertunda"
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle || !txAmount || parseFloat(txAmount) <= 0) return;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: "15 Mar 2024",
      title: txTitle,
      category: txCategory,
      status: "Cleared",
      amount: parseFloat(txAmount),
      type: txType
    };

    setTransactions(prev => [newTx, ...prev]);
    onNotify(`Transaksi dicatat: Menambahkan "${txTitle}" senilai ${formatRupiah(parseFloat(txAmount))}.`, "success");
    
    // reset
    setShowAddModal(false);
    setTxTitle("");
    setTxAmount("");
  };

  // Compute stats based on ledger
  const currentInflowSum = transactions
    .filter(t => t.type === "inflow")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentOutflowSum = transactions
    .filter(t => t.type === "outflow")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = currentInflowSum - currentOutflowSum;

  // Filter transaction ledger list
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                          t.category.toLowerCase().includes(ledgerSearch.toLowerCase());
    const matchesCategory = ledgerCategory === "All" || t.category === ledgerCategory;
    const matchesStatus = ledgerStatus === "All" || t.status === ledgerStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Tab Switcher */}
      <nav className="h-14 px-6 border-b border-outline-variant/30 bg-background flex items-center justify-between flex-shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveSubTab("sheet")}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === "sheet"
                ? "bg-primary text-white"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Laporan Laba Rugi
          </button>
          <button
            onClick={() => setActiveSubTab("ledger")}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === "ledger"
                ? "bg-primary text-white"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Buku Besar Umum ({filteredTransactions.length})
          </button>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          Catat Transaksi
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low/20 custom-scrollbar space-y-6">
        
        {/* TAB A: PROFIT & LOSS STATEMENT */}
        {activeSubTab === "sheet" && (
          <div className="space-y-6">
            
            {/* Top Balances Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-3xl border border-outline-variant/10 shadow-sm">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Total Pendapatan Buku Besar</p>
                <p className="text-xl font-extrabold text-primary mt-1">{formatRupiah(currentInflowSum)}</p>
                <div className="flex items-center gap-1 text-green-600 text-xs mt-1 font-bold">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  +12.4% dibanding minggu lalu
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-outline-variant/10 shadow-sm">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Pengeluaran Operasional</p>
                <p className="text-xl font-extrabold text-error mt-1">-{formatRupiah(currentOutflowSum)}</p>
                <div className="flex items-center gap-1 text-on-surface-variant text-xs mt-1 font-bold">
                  <span className="material-symbols-outlined text-[16px]">done_all</span>
                  Termasuk item tertunda
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-primary/20 shadow-md relative overflow-hidden">
                <div className="absolute right-3 top-3 opacity-10">
                  <span className="material-symbols-outlined text-6xl text-primary">account_balance_wallet</span>
                </div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Posisi Kas Bersih</p>
                <p className={`text-xl font-extrabold mt-1 ${netBalance >= 0 ? "text-green-600" : "text-error"}`}>
                  {netBalance < 0 ? "-" : ""}{formatRupiah(Math.abs(netBalance))}
                </p>
                <div className="flex items-center gap-1 text-primary text-xs mt-1 font-bold">
                  <span className="material-symbols-outlined text-[16px]">analytics</span>
                  Laba Bersih Operasional Kafe
                </div>
              </div>
            </div>

            {/* Custom SVG Cash Trend Chart */}
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Analisis Tren Arus Kas Bulanan</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Perbandingan interaktif kas masuk (cokelat tua) vs kas keluar (cokelat muda).</p>
                </div>

                <div className="flex gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-primary rounded-sm"></span>
                    <span className="text-on-surface-variant">Kas Masuk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-neutral-300 rounded-sm"></span>
                    <span className="text-on-surface-variant">Kas Keluar</span>
                  </div>
                </div>
              </div>

              {/* Custom SVG Bars */}
              <div className="relative pt-6">
                <svg className="w-full h-56" viewBox="0 0 600 220" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="580" y2="20" stroke="#f5ece7" strokeDasharray="3 3" />
                  <line x1="40" y1="80" x2="580" y2="80" stroke="#f5ece7" strokeDasharray="3 3" />
                  <line x1="40" y1="140" x2="580" y2="140" stroke="#f5ece7" strokeDasharray="3 3" />
                  <line x1="40" y1="180" x2="580" y2="180" stroke="#f5ece7" />

                  {/* Render Columns */}
                  {cashTrendData.map((data, idx) => {
                    const groupWidth = 80;
                    const startX = 60 + idx * groupWidth;

                    // scale factor (max amount is 250 million)
                    const maxVal = 250000000;
                    const chartHeight = 160;
                    
                    const inflowHeight = (data.inflow / maxVal) * chartHeight;
                    const outflowHeight = (data.outflow / maxVal) * chartHeight;

                    const inflowY = 180 - inflowHeight;
                    const outflowY = 180 - outflowHeight;

                    const isHovered = hoveredBarIndex === idx;

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Interactive hover background bar */}
                        <rect
                          x={startX - 15}
                          y="10"
                          width="70"
                          height="180"
                          fill={isHovered ? "#fff8f5" : "transparent"}
                          rx="8"
                          style={{ transition: "fill 0.2s" }}
                        />

                        {/* Inflow Bar */}
                        <rect
                          x={startX}
                          y={inflowY}
                          width="16"
                          height={inflowHeight}
                          fill="#44281a"
                          rx="3"
                          className="transition-all duration-300"
                        />

                        {/* Outflow Bar */}
                        <rect
                          x={startX + 22}
                          y={outflowY}
                          width="16"
                          height={outflowHeight}
                          fill="#d4c3bc"
                          rx="3"
                          className="transition-all duration-300"
                        />

                        {/* X Axis Labels */}
                        <text
                          x={startX + 19}
                          y="202"
                          textAnchor="middle"
                          fill="#7e7470"
                          className="font-sans font-bold text-[10px]"
                        >
                          {data.month}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Hover overlay metadata popup */}
                {hoveredBarIndex !== null && (
                  <div
                    className="absolute bg-white border border-outline-variant rounded-xl p-3 shadow-lg text-xs font-bold text-on-surface-variant z-10 space-y-1 transition-all"
                    style={{
                      left: `${15 + hoveredBarIndex * 13}%`,
                      top: "20px"
                    }}
                  >
                    <p className="text-primary font-extrabold uppercase text-[9px] tracking-wider">
                      Ringkasan {cashTrendData[hoveredBarIndex].month}
                    </p>
                    <p className="flex justify-between gap-4">
                      <span>Kas Masuk:</span>
                      <span className="text-primary font-extrabold">
                        {formatRupiah(cashTrendData[hoveredBarIndex].inflow)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span>Kas Keluar:</span>
                      <span className="text-error font-bold">
                        -{formatRupiah(cashTrendData[hoveredBarIndex].outflow)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Profit & Loss spreadsheet */}
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Pos Laporan Laba Rugi (Kuartal 1)</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5">Akun Laporan Keuangan</th>
                      <th className="py-2.5 text-right font-mono">Januari</th>
                      <th className="py-2.5 text-right font-mono">Februari</th>
                      <th className="py-2.5 text-right font-mono">Maret</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-semibold">
                    
                    {/* Revenue Category */}
                    <tr className="bg-surface-container-low/40">
                      <td className="py-3 px-2 font-extrabold text-primary text-xs uppercase tracking-wider">1. AKUN PENDAPATAN</td>
                      <td className="py-3 text-right font-mono text-primary font-bold">{formatRupiah(125000000)}</td>
                      <td className="py-3 text-right font-mono text-primary font-bold">{formatRupiah(142000000)}</td>
                      <td className="py-3 text-right font-mono text-primary font-bold">{formatRupiah(currentInflowSum)}</td>
                    </tr>
                    <tr className="border-b border-outline-variant/10">
                      <td className="py-2.5 pl-6 text-on-surface-variant font-medium">Penjualan Kafe Harian (Kasir/POS)</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatRupiah(118000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatRupiah(135000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatRupiah(currentInflowSum * 0.9)}</td>
                    </tr>
                    <tr className="border-b border-outline-variant/10">
                      <td className="py-2.5 pl-6 text-on-surface-variant font-medium">Top-up Saldo Prabayar Pelanggan</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatRupiah(7000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatRupiah(7000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatRupiah(currentInflowSum * 0.1)}</td>
                    </tr>

                    {/* COGS Category */}
                    <tr className="bg-surface-container-low/40">
                      <td className="py-3 px-2 font-extrabold text-primary text-xs uppercase tracking-wider">2. HARGA POKOK PENJUALAN (HPP/COGS)</td>
                      <td className="py-3 text-right font-mono text-error font-bold">-{formatRupiah(28000000)}</td>
                      <td className="py-3 text-right font-mono text-error font-bold">-{formatRupiah(31000000)}</td>
                      <td className="py-3 text-right font-mono text-error font-bold">-{formatRupiah(38000000)}</td>
                    </tr>
                    <tr className="border-b border-outline-variant/10">
                      <td className="py-2.5 pl-6 text-on-surface-variant font-medium">Pembelian Biji Kopi Grosir</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(18000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(20000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(25000000)}</td>
                    </tr>
                    <tr className="border-b border-outline-variant/10">
                      <td className="py-2.5 pl-6 text-on-surface-variant font-medium">Pemasok Susu & Sirup Flavour</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(10000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(11000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(13000000)}</td>
                    </tr>

                    {/* OPEX Category */}
                    <tr className="bg-surface-container-low/40">
                      <td className="py-3 px-2 font-extrabold text-primary text-xs uppercase tracking-wider">3. BIAYA OPERASIONAL (OPEX)</td>
                      <td className="py-3 text-right font-mono text-error font-bold">-{formatRupiah(50000000)}</td>
                      <td className="py-3 text-right font-mono text-error font-bold">-{formatRupiah(60000000)}</td>
                      <td className="py-3 text-right font-mono text-error font-bold">-{formatRupiah(currentOutflowSum - 38000000)}</td>
                    </tr>
                    <tr className="border-b border-outline-variant/10">
                      <td className="py-2.5 pl-6 text-on-surface-variant font-medium">Gaji Karyawan Toko & Barista</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(35000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(42000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(54000000)}</td>
                    </tr>
                    <tr className="border-b border-outline-variant/10">
                      <td className="py-2.5 pl-6 text-on-surface-variant font-medium">Sewa Tempat, Air, Listrik & Wifi Wifi</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(15000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(18000000)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">-{formatRupiah(18000000)}</td>
                    </tr>

                    {/* Bottom Line profit */}
                    <tr className="bg-primary/5">
                      <td className="py-4 px-2 font-black text-primary text-xs uppercase tracking-widest">LABA OPERASIONAL OUTLET BERSIH</td>
                      <td className="py-4 text-right font-mono text-green-600 font-extrabold">{formatRupiah(47000000)}</td>
                      <td className="py-4 text-right font-mono text-green-600 font-extrabold">{formatRupiah(51000000)}</td>
                      <td className="py-4 text-right font-mono text-green-600 font-extrabold">
                        {formatRupiah(currentInflowSum - currentOutflowSum)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB B: GENERAL LEDGER TRANSACTION LOG */}
        {activeSubTab === "ledger" && (
          <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm space-y-6">
            
            {/* Ledger Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-outline-variant/30 pb-4">
              <div className="relative w-full md:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input
                  type="text"
                  placeholder="Cari entri buku besar..."
                  className="pl-10 pr-4 py-2 bg-surface-container rounded-lg text-xs w-full outline-none focus:ring-1 focus:ring-primary font-bold"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <div>
                  <select
                    className="bg-surface-container rounded-lg px-3 py-2 text-xs font-bold outline-none border-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={ledgerCategory}
                    onChange={(e) => setLedgerCategory(e.target.value)}
                  >
                    <option value="All">Semua Kategori</option>
                    <option value="Sales">Penjualan</option>
                    <option value="Supplier PO">PO Pemasok</option>
                    <option value="Payroll">Gaji Karyawan</option>
                    <option value="Top-ups">Isi Ulang Saldo</option>
                  </select>
                </div>

                <div>
                  <select
                    className="bg-surface-container rounded-lg px-3 py-2 text-xs font-bold outline-none border-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={ledgerStatus}
                    onChange={(e) => setLedgerStatus(e.target.value)}
                  >
                    <option value="All">Semua Status</option>
                    <option value="Cleared">Lunas</option>
                    <option value="Pending">Tertunda</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal Posting</th>
                    <th className="py-3 px-4">Deskripsi Transaksi</th>
                    <th className="py-3 px-4">Kategori Akun</th>
                    <th className="py-3 px-4 text-center">Penyelesaian</th>
                    <th className="py-3 px-4 text-right">Jumlah Kas</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/40 transition-all">
                      <td className="py-4 px-4 text-on-surface-variant font-semibold">{tx.date}</td>
                      <td className="py-4 px-4 font-bold text-on-surface">{tx.title}</td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded bg-surface-container text-on-surface-variant text-[10px] font-bold">
                          {categoryLabels[tx.category] || tx.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.status === "Cleared"
                            ? "bg-green-50 text-green-600 border border-green-200"
                            : "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse"
                        }`}>
                          {statusLabels[tx.status] || tx.status}
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-right font-extrabold font-mono text-sm ${
                        tx.type === "inflow" ? "text-green-600" : "text-error"
                      }`}>
                        {tx.type === "inflow" ? "+" : "-"}{formatRupiah(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Post Transaction Form Modal (Slide Overlay) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-outline-variant shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2">
              <h3 className="font-bold text-base text-primary">Catat Entri Buku Besar Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-sm text-on-surface-variant hover:bg-outline-variant cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Deskripsi Transaksi</label>
                <input
                  type="text"
                  required
                  placeholder="misal: Pembayaran Tagihan Listrik Bulanan"
                  className="w-full bg-surface-container rounded-lg p-2.5 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold"
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Jenis Entri</label>
                  <select
                    className="w-full bg-surface-container rounded-lg p-2.5 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold cursor-pointer"
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                  >
                    <option value="inflow">Arus Masuk (Deposit)</option>
                    <option value="outflow">Arus Keluar (Pengeluaran)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Kategori</label>
                  <select
                    className="w-full bg-surface-container rounded-lg p-2.5 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold cursor-pointer"
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                  >
                    <option value="Sales">Penjualan</option>
                    <option value="Supplier PO">PO Pemasok</option>
                    <option value="Payroll">Gaji Karyawan</option>
                    <option value="Top-ups">Isi Ulang Saldo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Nilai Kas (Rupiah)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0"
                  className="w-full bg-surface-container rounded-lg p-2.5 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Catat ke Buku Besar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
