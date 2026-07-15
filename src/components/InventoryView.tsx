import React, { useState } from "react";
import { StockItem, WasteLog } from "../types";
import { formatRupiah } from "../utils";

interface InventoryViewProps {
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  wasteLogs: WasteLog[];
  setWasteLogs: React.Dispatch<React.SetStateAction<WasteLog[]>>;
  onNotify: (message: string, type?: "success" | "warning") => void;
}

export default function InventoryView({
  stockItems,
  setStockItems,
  wasteLogs,
  setWasteLogs,
  onNotify
}: InventoryViewProps) {
  // Tabs: "stocks" | "receiving" | "opname" | "waste"
  const [activeTab, setActiveTab] = useState<"stocks" | "receiving" | "opname" | "waste">("stocks");

  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // --- Waste Form State ---
  const [wasteItem, setWasteItem] = useState("Susu Oat Barista");
  const [wasteQty, setWasteQty] = useState(1);
  const [wasteReason, setWasteReason] = useState<"Spillage" | "Expired" | "Damaged" | "Other">("Spillage");
  const [wasteNotes, setWasteNotes] = useState("");

  // --- Goods Receiving & Scanner State ---
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<"idle" | "capturing" | "decoded">("idle");
  const [receivedSku, setReceivedSku] = useState("");
  const [receivedItemName, setReceivedItemName] = useState("");
  const [rcvQtyMatches, setRcvQtyMatches] = useState(true);
  const [rcvPackagingOk, setRcvPackagingOk] = useState(true);
  const [rcvTempOk, setRcvTempOk] = useState(true);
  const [rcvNotes, setRcvNotes] = useState("");
  const [rcvQtyVal, setRcvQtyVal] = useState("10");

  const categories = ["All", "Coffee Beans", "Dairy Alternatives", "Syrups & Flavors", "Packaging"];

  const categoryLabels: Record<string, string> = {
    "All": "Semua",
    "Coffee Beans": "Biji Kopi",
    "Dairy Alternatives": "Alternatif Susu",
    "Syrups & Flavors": "Sirup & Rasa",
    "Packaging": "Kemasan"
  };

  const statusLabels: Record<string, string> = {
    "Healthy": "Sehat",
    "Low Stock": "Stok Menipis",
    "Pending Arrival": "Menunggu Datang"
  };

  const reasonLabels: Record<string, string> = {
    "Spillage": "Tumpah",
    "Expired": "Kedaluwarsa",
    "Damaged": "Rusak",
    "Other": "Lainnya"
  };

  // Filter stocks
  const filteredStocks = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                          item.sku.toLowerCase().includes(stockSearch.toLowerCase());
    const matchesFilter = stockFilter === "All" || item.category === stockFilter;
    return matchesSearch && matchesFilter;
  });

  // Paginated Stocks
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage) || 1;
  const paginatedStocks = filteredStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle stock level updates (Mock Quick Restock)
  const handleQuickRestock = (sku: string) => {
    setStockItems(prev => prev.map(item => {
      if (item.sku === sku) {
        onNotify(`Berhasil menambah 10 unit stok untuk ${item.name}!`, "success");
        // increase percentage and quantity text
        const currentQty = parseInt(item.quantity.replace(/[^0-9]/g, "")) || 0;
        const unitLabel = item.quantity.replace(/[0-9.,\s]/g, "");
        const nextQty = currentQty + 10;
        return {
          ...item,
          stockLevel: Math.min(item.stockLevel + 15, 100),
          quantity: `${nextQty.toLocaleString("id-ID")} ${unitLabel}`,
          status: "Healthy"
        };
      }
      return item;
    }));
  };

  // Handle Stock Opname checklist count updates
  const handleOpnameChange = (sku: string, actualVal: number) => {
    setStockItems(prev => prev.map(item => {
      if (item.sku === sku) {
        const expectedVal = item.expected ?? 15;
        const varianceVal = actualVal - expectedVal;
        return {
          ...item,
          actual: actualVal,
          variance: varianceVal
        };
      }
      return item;
    }));
  };

  const handleApplyOpname = () => {
    setStockItems(prev => prev.map(item => {
      if (item.actual !== undefined) {
        // Apply actual counts as stock level estimations
        const maxExpected = item.expected || 15;
        const ratio = Math.min(Math.round((item.actual / maxExpected) * 100), 100);
        const unitLabel = item.quantity.replace(/[0-9.,\s]/g, "");
        return {
          ...item,
          stockLevel: ratio,
          quantity: `${item.actual} ${unitLabel}`,
          status: ratio < 20 ? "Low Stock" : "Healthy"
        };
      }
      return item;
    }));
    onNotify("Penyesuaian selisih Opname Stok berhasil diterapkan ke tingkat inventaris aktif!", "success");
  };

  // Handle Waste Log submission
  const handleSubmitWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteQty || wasteQty <= 0) return;

    const matchedStock = stockItems.find(s => s.name === wasteItem);
    // Use realistic Rupiah pricing based on unit
    const unitPrice = matchedStock ? (matchedStock.sku.includes("OAT") ? 35000 : matchedStock.sku.includes("AB") ? 150000 : 25000) : 30000;
    const computedCost = wasteQty * unitPrice;

    const newLog: WasteLog = {
      id: `w-${Date.now()}`,
      item: wasteItem,
      quantity: wasteQty,
      unit: matchedStock ? matchedStock.unit : "Unit",
      reason: wasteReason,
      notes: wasteNotes || "Tidak ada komentar spesifik",
      time: "Baru Saja",
      cost: computedCost
    };

    setWasteLogs([newLog, ...wasteLogs]);

    // Deduct stock levels dynamically
    setStockItems(prev => prev.map(item => {
      if (item.name === wasteItem) {
        const currentQty = parseInt(item.quantity.replace(/[^0-9]/g, "")) || 0;
        const unitLabel = item.quantity.replace(/[0-9.,\s]/g, "");
        const nextQty = Math.max(currentQty - wasteQty, 0);
        const nextPercent = Math.max(item.stockLevel - Math.round((wasteQty / (currentQty || 1)) * item.stockLevel), 0);
        return {
          ...item,
          stockLevel: nextPercent,
          quantity: `${nextQty.toLocaleString("id-ID")} ${unitLabel}`,
          status: nextPercent < 15 ? "Low Stock" : "Healthy"
        };
      }
      return item;
    }));

    onNotify(`Berhasil mencatat pembuangan ${wasteQty} ${newLog.unit} dari ${wasteItem}.`, "warning");
    setWasteQty(1);
    setWasteNotes("");
  };

  // Handle QR scanner simulation steps
  const triggerMockScan = () => {
    setScanning(true);
    setScanStep("capturing");
    // Simulate camera delay scanning
    setTimeout(() => {
      const items = [
        { sku: "DM-OAT-552", name: "Susu Oat Barista", qty: "24" },
        { sku: "AB-1092-DWTN", name: "Biji Kopi Arabika - Estate", qty: "50" },
        { sku: "SY-VAN-22", name: "Sirup Vanila Madagaskar", qty: "12" }
      ];
      const pick = items[Math.floor(Math.random() * items.length)];
      setReceivedSku(pick.sku);
      setReceivedItemName(pick.name);
      setRcvQtyVal(pick.qty);
      setScanStep("decoded");
      setScanning(false);
      onNotify(`Berhasil mendeteksi kode QR untuk SKU: ${pick.sku}!`, "success");
    }, 2200);
  };

  const handleAcceptReceivedGoods = () => {
    if (!receivedSku) return;

    // Update stock levels
    setStockItems(prev => prev.map(item => {
      if (item.sku === receivedSku) {
        const currentQty = parseInt(item.quantity.replace(/[^0-9]/g, "")) || 0;
        const unitLabel = item.quantity.replace(/[0-9.,\s]/g, "");
        const incomingQty = parseInt(rcvQtyVal) || 0;
        const nextQty = currentQty + incomingQty;
        return {
          ...item,
          stockLevel: Math.min(item.stockLevel + Math.round((incomingQty / 100) * 80), 100),
          quantity: `${nextQty.toLocaleString("id-ID")} ${unitLabel}`,
          status: "Healthy"
        };
      }
      return item;
    }));

    onNotify(`Penerimaan barang selesai: Ditambahkan ${rcvQtyVal} unit ke ${receivedItemName}.`, "success");
    setScanStep("idle");
    setReceivedSku("");
    setReceivedItemName("");
    setRcvNotes("");
  };

  // Compute total inventory value based on realistic IDR cost estimations
  const totalInventoryCost = stockItems.reduce((sum, item) => {
    const isOat = item.sku.includes("OAT");
    const isBeans = item.sku.includes("AB");
    const unitCostVal = isOat ? 35000 : isBeans ? 150000 : 25000;
    const qtyVal = parseInt(item.quantity.replace(/[^0-9]/g, "")) || 10;
    return sum + (qtyVal * unitCostVal);
  }, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Secondary Subheader Nav */}
      <nav className="h-14 px-6 border-b border-outline-variant/30 bg-background flex items-center justify-between flex-shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("stocks")}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "stocks"
                ? "bg-primary text-white"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Level Stok
          </button>
          <button
            onClick={() => setActiveTab("receiving")}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "receiving"
                ? "bg-primary text-white"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Penerimaan Barang
          </button>
          <button
            onClick={() => setActiveTab("opname")}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "opname"
                ? "bg-primary text-white"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Opname Stok
          </button>
          <button
            onClick={() => setActiveTab("waste")}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "waste"
                ? "bg-primary text-white"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            Log Pembuangan
          </button>
        </div>

        <div className="text-xs font-bold text-on-surface-variant">
          Total Nilai Inventaris: <span className="text-primary font-extrabold">{formatRupiah(totalInventoryCost)}</span>
        </div>
      </nav>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low/20 custom-scrollbar">
        
        {/* TAB 1: LEVEL STOK */}
        {activeTab === "stocks" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm">
              <div className="relative w-full md:w-80">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input
                  type="text"
                  placeholder="Cari stok berdasarkan nama, SKU..."
                  className="pl-11 pr-4 py-2 bg-surface-container rounded-lg text-xs w-full outline-none focus:ring-1 focus:ring-primary"
                  value={stockSearch}
                  onChange={(e) => { setStockSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto w-full md:w-auto no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setStockFilter(cat); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                      stockFilter === cat
                        ? "border-primary bg-primary text-white"
                        : "border-outline-variant text-on-surface-variant bg-white hover:bg-surface-container"
                    }`}
                  >
                    {categoryLabels[cat] || cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Stocks Level Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedStocks.map((item) => (
                <div key={item.sku} className="bg-white rounded-3xl p-5 border border-outline-variant/10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex gap-4">
                    <img
                      className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          item.status === "Healthy" ? "bg-green-500" : item.status === "Low Stock" ? "bg-error animate-pulse" : "bg-blue-500"
                        }`}></span>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                          {categoryLabels[item.category] || item.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-on-surface mt-1 leading-tight">{item.name}</h3>
                      <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">{item.sku}</p>
                    </div>
                  </div>

                  {/* Stock Level Slider */}
                  <div className="my-5 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                      <span>Tingkat Stok ({item.stockLevel}%)</span>
                      <span className={item.stockLevel < 15 ? "text-error" : "text-primary"}>{item.quantity}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.stockLevel < 15 ? "bg-error" : item.stockLevel < 50 ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${item.stockLevel}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-dashed border-outline-variant/30">
                    <div className="text-left">
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">Gudang Penyimpanan</p>
                      <p className="text-xs text-on-surface font-semibold mt-0.5">{item.warehouse === "Pusat Hub" ? "Pusat Hub" : item.warehouse === "Gudang B" ? "Gudang Cabang B" : item.warehouse}</p>
                    </div>
                    <button
                      onClick={() => handleQuickRestock(item.sku)}
                      className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_box</span>
                      Isi Cepat (+10)
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm">
              <p className="text-xs font-bold text-on-surface-variant">
                Menampilkan {Math.min(currentPage * itemsPerPage, filteredStocks.length)} dari {filteredStocks.length} barang inventaris
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container hover:bg-outline-variant/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="px-3 py-1.5 text-xs font-bold text-primary self-center">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container hover:bg-outline-variant/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PENERIMAAN BARANG */}
        {activeTab === "receiving" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Live Camera Scanner Box */}
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm flex flex-col h-[520px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-on-surface">Pemindai QR / Kode Batang Terintegrasi</h3>
                <span className="px-2.5 py-1 rounded bg-error/10 text-error text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span>
                  Kamera Bingkai Aktif
                </span>
              </div>

              {/* Scanning viewport */}
              <div className="flex-1 bg-neutral-950 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center border-4 border-neutral-800">
                
                {/* Simulated Camera Feed */}
                {scanStep === "capturing" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                    <div className="text-white text-xs font-bold animate-pulse mb-2">MEMINDAI KODE BATANG...</div>
                    <div className="w-56 h-36 border-2 border-primary/50 rounded-lg relative overflow-hidden flex items-center justify-center bg-black/40">
                      <div className="absolute left-0 right-0 h-[3px] bg-red-500 animate-scan"></div>
                      <div className="w-10 h-10 border-t-2 border-l-2 border-primary absolute top-2 left-2"></div>
                      <div className="w-10 h-10 border-t-2 border-r-2 border-primary absolute top-2 right-2"></div>
                      <div className="w-10 h-10 border-b-2 border-l-2 border-primary absolute bottom-2 left-2"></div>
                      <div className="w-10 h-10 border-b-2 border-r-2 border-primary absolute bottom-2 right-2"></div>
                      <span className="text-zinc-600 font-mono text-[10px]">ARAHKAN KODE BATANG</span>
                    </div>
                  </div>
                ) : scanStep === "decoded" ? (
                  <div className="absolute inset-0 bg-primary/10 flex flex-col items-center justify-center p-6 text-center">
                    <span className="material-symbols-outlined text-green-500 text-5xl animate-bounce">check_circle</span>
                    <h4 className="text-white font-bold text-lg mt-3">SKU BERHASIL DIDETEKSI</h4>
                    <p className="text-zinc-300 font-mono text-xs mt-1 bg-black/50 px-3 py-1.5 rounded-full border border-white/10">
                      {receivedSku}
                    </p>
                    <button
                      onClick={() => setScanStep("idle")}
                      className="mt-6 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Pindai Lainnya
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900">
                    <span className="material-symbols-outlined text-zinc-500 text-5xl mb-3">qr_code_scanner</span>
                    <p className="text-white font-bold text-sm">Kamera dalam Posisi Siaga</p>
                    <p className="text-zinc-500 text-xs mt-1 max-w-xs">Pindai label stok masuk dari pemasok atau kotak kiriman untuk mengisi otomatis log Penerimaan Barang.</p>
                    <button
                      onClick={triggerMockScan}
                      className="mt-6 px-5 py-3 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      <span className="material-symbols-outlined">videocam</span>
                      Simulasikan Tangkapan Pemindai
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                  Kamera Logitech C920 PRO 1080p
                </span>
                <span className="font-semibold text-primary">Gudang Penerimaan #1</span>
              </div>
            </div>

            {/* Inbound Goods Checklist Form */}
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm flex flex-col justify-between h-[520px]">
              <div>
                <h3 className="font-bold text-base text-on-surface mb-4">Log Penerimaan Barang</h3>
                
                {scanStep === "decoded" ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-surface-container rounded-2xl border border-primary/20">
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Barang yang Dipindai</p>
                      <h4 className="font-bold text-base text-primary mt-0.5">{receivedItemName}</h4>
                      <p className="font-mono text-xs text-on-surface-variant mt-0.5">{receivedSku}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-on-surface uppercase tracking-wider">Daftar Periksa Kontrol Kualitas</p>
                      
                      <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl">
                        <span className="text-xs font-bold text-on-surface-variant">Jumlah sesuai PO</span>
                        <button
                          onClick={() => setRcvQtyMatches(!rcvQtyMatches)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${rcvQtyMatches ? "bg-primary" : "bg-neutral-300"}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${rcvQtyMatches ? "right-1" : "left-1"}`}></span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl">
                        <span className="text-xs font-bold text-on-surface-variant">Kemasan utuh (tidak ada cacat/rusak)</span>
                        <button
                          onClick={() => setRcvPackagingOk(!rcvPackagingOk)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${rcvPackagingOk ? "bg-primary" : "bg-neutral-300"}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${rcvPackagingOk ? "right-1" : "left-1"}`}></span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl">
                        <span className="text-xs font-bold text-on-surface-variant">Suhu & rantai pendingin terjaga</span>
                        <button
                          onClick={() => setRcvTempOk(!rcvTempOk)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${rcvTempOk ? "bg-primary" : "bg-neutral-300"}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${rcvTempOk ? "right-1" : "left-1"}`}></span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Jumlah Diterima</label>
                        <input
                          type="number"
                          className="w-full bg-surface-container rounded-lg p-2.5 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold"
                          value={rcvQtyVal}
                          onChange={(e) => setRcvQtyVal(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Komentar / Catatan</label>
                        <input
                          type="text"
                          className="w-full bg-surface-container rounded-lg p-2.5 text-xs outline-none border-none focus:ring-1 focus:ring-primary"
                          placeholder="misal: Nomor Batch #4992-B"
                          value={rcvNotes}
                          onChange={(e) => setRcvNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-65">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2">ballot</span>
                    <p className="font-bold text-xs text-primary">Belum Ada Barang Dimuat</p>
                    <p className="text-[10px] text-on-surface-variant mt-1">Simulasikan pemindaian kode batang pada penampil kamera untuk menarik informasi spesifikasi barang.</p>
                  </div>
                )}
              </div>

              {scanStep === "decoded" && (
                <button
                  onClick={handleAcceptReceivedGoods}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  Konfirmasi Pengiriman & Perbarui Inventaris
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT OPNAME STOK */}
        {activeTab === "opname" && (
          <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-on-surface">Audit Opname Stok Berkala</h3>
                <p className="text-xs text-on-surface-variant mt-1">Hitung secara fisik barang di toko dan periksa silang dengan perkiraan di sistem komputer.</p>
              </div>
              <button
                onClick={handleApplyOpname}
                className="bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">publish</span>
                Terapkan Penyesuaian
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Barang di Toko</th>
                    <th className="py-3 px-4 font-mono">ID SKU</th>
                    <th className="py-3 px-4">Gudang</th>
                    <th className="py-3 px-4 text-center">Perkiraan Sistem</th>
                    <th className="py-3 px-4 text-center">Hitungan Fisik</th>
                    <th className="py-3 px-4 text-center">Selisih</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-medium">
                  {stockItems.map((item) => {
                    const expected = item.expected ?? 15;
                    const actual = item.actual ?? expected;
                    const variance = actual - expected;
                    const isDeficit = variance < 0;

                    return (
                      <tr key={item.sku} className={`border-b border-outline-variant/10 hover:bg-surface-container-low transition-all ${
                        variance !== 0 ? "bg-amber-50/40" : ""
                      }`}>
                        <td className="py-4 px-4 flex items-center gap-3">
                          <img className="w-10 h-10 rounded-lg object-cover" src={item.image} alt={item.name} referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-bold text-on-surface">{item.name}</p>
                            <p className="text-[10px] text-on-surface-variant">{categoryLabels[item.category] || item.category}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-[10px] text-on-surface-variant">{item.sku}</td>
                        <td className="py-4 px-4 text-on-surface-variant">{item.warehouse === "Pusat Hub" ? "Pusat Hub" : item.warehouse === "Gudang B" ? "Gudang Cabang B" : item.warehouse}</td>
                        <td className="py-4 px-4 text-center font-bold text-on-surface-variant">{expected}</td>
                        <td className="py-4 px-4 text-center">
                          <input
                            type="number"
                            className="w-16 bg-surface-container text-center rounded p-1 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold"
                            value={actual}
                            onChange={(e) => handleOpnameChange(item.sku, parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-extrabold ${
                            variance === 0
                              ? "bg-green-50 text-green-600"
                              : isDeficit
                              ? "bg-error/10 text-error"
                              : "bg-blue-50 text-blue-600"
                          }`}>
                            {variance === 0 ? "Sesuai" : variance > 0 ? `+${variance}` : variance}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LOG & RIWAYAT PEMBUANGAN */}
        {activeTab === "waste" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Log Waste Form */}
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm lg:col-span-1 h-fit">
              <h3 className="font-bold text-base text-on-surface mb-4">Catat Kerusakan / Pembuangan</h3>
              <form onSubmit={handleSubmitWaste} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1.5">Pilih Barang</label>
                  <select
                    className="w-full bg-surface-container rounded-lg p-3 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold"
                    value={wasteItem}
                    onChange={(e) => setWasteItem(e.target.value)}
                  >
                    {stockItems.map(item => (
                      <option key={item.sku} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1.5">Jumlah</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full bg-surface-container rounded-lg p-3 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold"
                      value={wasteQty}
                      onChange={(e) => setWasteQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1.5">Alasan</label>
                    <select
                      className="w-full bg-surface-container rounded-lg p-3 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-bold"
                      value={wasteReason}
                      onChange={(e) => setWasteReason(e.target.value as any)}
                    >
                      <option value="Spillage">Tumpah (Spillage)</option>
                      <option value="Expired">Kedaluwarsa (Expired)</option>
                      <option value="Damaged">Rusak (Damaged)</option>
                      <option value="Other">Lainnya (Other)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1.5">Catatan Korektif</label>
                  <textarea
                    rows={3}
                    className="w-full bg-surface-container rounded-lg p-3 text-xs outline-none border-none focus:ring-1 focus:ring-primary font-semibold"
                    placeholder="Jelaskan apa yang terjadi dan tindakan korektif yang diambil..."
                    value={wasteNotes}
                    onChange={(e) => setWasteNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-error text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Catat Kerugian Pembuangan
                </button>
              </form>
            </div>

            {/* Waste History Log List */}
            <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm lg:col-span-2 flex flex-col justify-between h-[450px]">
              <div className="w-full">
                <h3 className="font-bold text-base text-on-surface mb-1">Log Pembuangan Terbaru</h3>
                <p className="text-xs text-on-surface-variant mb-4 font-medium">Riwayat kerusakan, tumpahan, atau kedaluwarsa barang yang dicatat dari area bar dan dapur.</p>

                <div className="overflow-y-auto max-h-[300px] custom-scrollbar space-y-3">
                  {wasteLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-error bg-error/10 p-2.5 rounded-xl text-lg flex items-center justify-center">
                          receipt_long
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-on-surface">{log.item} ({log.quantity} {log.unit === "Pieces" ? "Buah" : log.unit})</h4>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                            Alasan: <span className="text-error font-bold">{reasonLabels[log.reason] || log.reason}</span> · {log.notes}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-extrabold text-error">-{formatRupiah(log.cost)}</p>
                        <p className="text-[9px] text-on-surface-variant font-medium mt-0.5">{log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-dashed border-outline-variant/30 flex items-center justify-between text-xs font-bold text-on-surface-variant">
                <span>Total Kerugian Terakumulasi:</span>
                <span className="text-error font-extrabold">
                  -{formatRupiah(wasteLogs.reduce((acc, log) => acc + log.cost, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
