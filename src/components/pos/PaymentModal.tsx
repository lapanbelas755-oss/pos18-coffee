import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CartItem } from "../../types";
import { calculateItemUnitPrice } from "../../utils/pricing";

interface PaymentModalProps {
  total: number;
  cart?: CartItem[];
  onClose: () => void;
  onSuccess: (method: string, amountGiven: number, change: number) => void;
  onPartialSuccess?: (method: string, paidItems: CartItem[]) => void;
}

export default function PaymentModal({ total, cart = [], onClose, onSuccess, onPartialSuccess }: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"Penuh" | "Split" | "Item">("Penuh");
  
  // Tab Penuh State
  const [method, setMethod] = useState<"Cash" | "QRIS">("Cash");
  const [given, setGiven] = useState<string>("");
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [qrisOrderId, setQrisOrderId] = useState<string | null>(null);
  const [isGeneratingQris, setIsGeneratingQris] = useState(false);
  const [qrisError, setQrisError] = useState<string | null>(null);
  const [qrisTimer, setQrisTimer] = useState<number>(900);

  // Timer countdown for QRIS expiration
  useEffect(() => {
    let timerInterval: any;
    if (method === "QRIS" && qrisUrl && qrisTimer > 0) {
      timerInterval = setInterval(() => {
        setQrisTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [method, qrisUrl, qrisTimer]);

  // Check transaction status periodically if QRIS is active
  useEffect(() => {
    let interval: any;
    if (method === "QRIS" && qrisOrderId) {
      interval = setInterval(async () => {
        try {
          const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:3002";
          const res = await fetch(`${apiUrl}/api/qris/status/${qrisOrderId}`);
          const data = await res.json();
          if (data.success && (data.status === 'settlement' || data.status === 'capture')) {
            clearInterval(interval);
            onSuccess("QRIS", total, 0); // Sukses & Otomatis Selesai
          }
        } catch (e) {
          console.error("Gagal mengecek status", e);
        }
      }, 5000); // Cek setiap 5 detik
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [method, qrisOrderId, total, onSuccess]);

  const handleSelectQris = async () => {
    setMethod("QRIS");
    setIsGeneratingQris(true);
    setQrisError(null);
    setQrisTimer(900);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:3002";
      const response = await fetch(`${apiUrl}/api/qris`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: Math.floor(Math.random() * 1000000).toString(),
          gross_amount: total,
          customer_name: "Customer POS"
        })
      });
      const data = await response.json();
      if (data.success && data.qr_url) {
        setQrisUrl(data.qr_url);
        setQrisOrderId(data.order_id);
      } else {
        setQrisError(data.error || "Gagal mendapatkan QRIS");
      }
    } catch (err) {
      setQrisError("Gagal terhubung ke server pembayaran (API tidak aktif)");
    } finally {
      setIsGeneratingQris(false);
    }
  };

  // Tab Split (Pax) State
  const [splitBy, setSplitBy] = useState<number>(2);
  const [payments, setPayments] = useState<{method: string, amount: number, id: string}[]>([]);

  // Tab Split (Item) State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  const selectedItems = cart.filter(c => selectedItemIds.includes(c.id));
  const partialTotal = selectedItems.reduce((s, c) => s + (c.product.price * c.quantity), 0);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(total - totalPaid, 0);

  const givenNum = parseInt(given.replace(/\D/g, "")) || 0;
  
  // Validation for Penuh
  const change = method === "Cash" ? givenNum - total : 0;
  const isPenuhValid = method === "QRIS" || (method === "Cash" && givenNum >= total);

  const handleQuickAmount = (amount: number) => {
    setGiven(amount.toString());
  };

  const handleExactAmount = () => {
    setGiven(total.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "Penuh") {
      if (isPenuhValid) {
        onSuccess(method, method === "Cash" ? givenNum : total, change);
      }
    } else if (activeTab === "Split") {
      if (totalPaid >= total) {
        const methods = [...new Set(payments.map(p => p.method))];
        const primaryMethod = methods.length === 1 ? methods[0] : `Multi (${methods.join("+")})`;
        onSuccess(primaryMethod, total, 0);
      }
    } else if (activeTab === "Item") {
      if (selectedItemIds.length > 0 && onPartialSuccess) {
        onPartialSuccess(method, selectedItems);
      }
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAddSplitPayment = (splitMethod: "Cash" | "QRIS") => {
    const amountToPay = total / splitBy;
    if (totalPaid + amountToPay > total + 1) return; // Prevent overpayment
    
    setPayments([...payments, { method: splitMethod, amount: amountToPay, id: Date.now().toString() }]);
  };

  const handleRemoveSplitPayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg md:max-w-4xl shadow-2xl overflow-hidden animate-slide-up flex flex-col md:h-[580px] max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-[#4d3227] text-white p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-extrabold">Pembayaran</h2>
            <p className="text-sm opacity-80">Selesaikan transaksi pelanggan</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex border-b border-slate-200 shrink-0">
          <button 
            type="button"
            onClick={() => setActiveTab("Penuh")}
            className={`flex-1 py-4 font-bold text-[13px] transition-colors cursor-pointer ${activeTab === "Penuh" ? "text-[#4d3227] border-b-2 border-[#4d3227]" : "text-slate-400 hover:text-slate-600"}`}
          >
            Penuh
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("Split")}
            className={`flex-1 py-4 font-bold text-[13px] transition-colors cursor-pointer ${activeTab === "Split" ? "text-[#4d3227] border-b-2 border-[#4d3227]" : "text-slate-400 hover:text-slate-600"}`}
          >
            Split (Pax)
          </button>
          {cart.length > 0 && (
            <button 
              type="button"
              onClick={() => setActiveTab("Item")}
              className={`flex-1 py-4 font-bold text-[13px] transition-colors cursor-pointer ${activeTab === "Item" ? "text-[#4d3227] border-b-2 border-[#4d3227]" : "text-slate-400 hover:text-slate-600"}`}
            >
              Split (Item)
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 min-h-0">
          
          {/* TAB 1: PENUH */}
          {activeTab === "Penuh" && (
            <>
              {/* Left Column: Summary and Methods */}
              <div className="flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-500">Total Tagihan</span>
                    <span className="text-3xl font-extrabold text-[#4d3227]">Rp {total.toLocaleString("id-ID")}</span>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Metode Pembayaran</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setMethod("Cash")}
                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                          method === "Cash" ? "border-[#4d3227] bg-blue-50/50 text-[#4d3227]" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                        Tunai (Cash)
                      </button>
                      <button 
                        type="button"
                        onClick={handleSelectQris}
                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                          method === "QRIS" ? "border-[#4d3227] bg-blue-50/50 text-[#4d3227]" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                        QRIS / e-Wallet
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button 
                    type="submit"
                    disabled={!isPenuhValid}
                    className="w-full bg-[#4d3227] hover:bg-[#3a251d] disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined">print</span>
                    Cetak Struk & Selesai
                  </button>
                </div>
              </div>

              {/* Right Column: Interaction Input */}
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-center min-h-[380px] md:h-full">
                {method === "Cash" ? (
                  <div className="space-y-4 animate-fade-in w-full">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Uang Diterima</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                        <input 
                          type="text" 
                          value={givenNum === 0 ? "" : givenNum.toLocaleString("id-ID")}
                          onChange={(e) => setGiven(e.target.value)}
                          className="w-full text-right text-2xl font-bold border border-slate-300 rounded-xl pl-12 pr-4 py-3 bg-white focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227] outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <button type="button" onClick={handleExactAmount} className="py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer">Uang Pas</button>
                      <button type="button" onClick={() => handleQuickAmount(50000)} className="py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer">50k</button>
                      <button type="button" onClick={() => handleQuickAmount(100000)} className="py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer">100k</button>
                      <button type="button" onClick={() => handleQuickAmount(200000)} className="py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer">200k</button>
                    </div>

                    {givenNum > 0 && (
                      <div className={`p-4 rounded-xl border flex justify-between items-center ${change >= 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                        <span className="font-bold text-sm">Kembalian</span>
                        <span className="text-xl font-extrabold">{change >= 0 ? `Rp ${change.toLocaleString("id-ID")}` : "Uang Kurang"}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center animate-fade-in text-center w-full">
                    {isGeneratingQris ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-slate-500">Membuat QRIS Midtrans...</p>
                      </div>
                    ) : qrisError ? (
                      <div className="text-center space-y-2">
                        <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
                        <p className="text-sm font-bold text-slate-700">{qrisError}</p>
                        <button type="button" onClick={handleSelectQris} className="text-xs bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 mt-2 mx-auto cursor-pointer">Coba Lagi</button>
                      </div>
                    ) : qrisTimer <= 0 ? (
                      <div className="text-center space-y-2">
                        <span className="material-symbols-outlined text-amber-500 text-4xl">hourglass_disabled</span>
                        <p className="text-sm font-bold text-slate-700">QRIS Kedaluwarsa</p>
                        <p className="text-xs text-slate-500">Batas waktu habis. Silakan buat barcode baru.</p>
                        <button type="button" onClick={handleSelectQris} className="text-xs bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 mt-2 mx-auto cursor-pointer">Buat Baru</button>
                      </div>
                    ) : qrisUrl ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-4 flex items-center justify-center animate-fade-in">
                          <img src={qrisUrl} alt="QRIS Midtrans" className="w-[240px] h-[240px] object-contain mix-blend-multiply" />
                        </div>
                        <p className="text-[20px] font-black text-slate-800 mb-1">Rp {total.toLocaleString("id-ID")}</p>
                        <p className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
                          Scan QRIS dengan aplikasi pembayaran
                        </p>
                        <div className="mt-3 text-[11px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 inline-flex items-center gap-1.5 animate-pulse">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Sisa Waktu: {Math.floor(qrisTimer / 60)}:{(qrisTimer % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="material-symbols-outlined text-blue-600 text-2xl">qr_code_scanner</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700">Pembayaran Midtrans</p>
                        <p className="text-xs text-slate-500 mt-1 mb-4">Dapatkan barcode QRIS dinamis.</p>
                        <button type="button" onClick={handleSelectQris} className="bg-[#4d3227] text-white px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-[#3d271e] transition-colors cursor-pointer text-xs">
                          Buat Barcode QRIS
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: SPLIT PAX */}
          {activeTab === "Split" && (
            <>
              {/* Left Column: Pax Control */}
              <div className="flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-500">Total Tagihan</span>
                    <span className="text-3xl font-extrabold text-[#4d3227]">Rp {total.toLocaleString("id-ID")}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Bagi Menjadi Berapa Orang?</label>
                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <button type="button" onClick={() => setSplitBy(Math.max(2, splitBy - 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-lg hover:bg-slate-50 active:scale-95 cursor-pointer">-</button>
                      <span className="text-2xl font-extrabold text-slate-800 w-8 text-center">{splitBy}</span>
                      <button type="button" onClick={() => setSplitBy(Math.min(10, splitBy + 1))} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-lg hover:bg-slate-50 active:scale-95 cursor-pointer">+</button>
                      <span className="ml-auto text-xs font-black text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        Rp {Math.round(total / splitBy).toLocaleString("id-ID")} / pax
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Telah Dibayar:</span>
                      <span className="text-emerald-600 font-extrabold">Rp {totalPaid.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Sisa Tagihan:</span>
                      <span className="text-red-500 font-extrabold">Rp {remaining.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button 
                    type="submit"
                    disabled={remaining > 0}
                    className="w-full bg-[#4d3227] hover:bg-[#3a251d] disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined">print</span>
                    Selesaikan Transaksi
                  </button>
                </div>
              </div>

              {/* Right Column: Pax Log & Actions */}
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between min-h-[280px]">
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[160px] pr-1 custom-scrollbar">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Riwayat Cicilan Pax</p>
                  {payments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada cicilan porsi.</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p, idx) => (
                        <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-xs font-bold text-slate-600">Porsi {idx + 1} ({p.method})</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-extrabold text-[#4d3227]">Rp {p.amount.toLocaleString("id-ID")}</span>
                            <button type="button" onClick={() => handleRemoveSplitPayment(p.id)} className="text-red-400 hover:text-red-600 cursor-pointer">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 bg-slate-50">
                  {remaining > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => handleAddSplitPayment("Cash")} className="py-3 bg-white text-[#4d3227] border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer shadow-sm">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        Bayar 1 Pax (Cash)
                      </button>
                      <button type="button" onClick={() => handleAddSplitPayment("QRIS")} className="py-3 bg-white text-[#4d3227] border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer shadow-sm">
                        <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                        Bayar 1 Pax (QRIS)
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-100 text-emerald-800 p-3.5 rounded-xl text-center text-xs font-black border border-emerald-200">
                      Semua porsi telah dibayar!
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: SPLIT ITEM */}
          {activeTab === "Item" && (
            <>
              {/* Left Column: Item List Checks */}
              <div className="flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center shrink-0">
                    <span className="font-bold text-blue-800 text-xs">Tagihan Terpilih</span>
                    <span className="text-xl font-extrabold text-blue-900">Rp {partialTotal.toLocaleString("id-ID")}</span>
                  </div>
                  
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Pilih Item untuk Dibayar</p>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[140px]">
                    {cart.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItemSelection(item.id)} 
                        className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-colors ${selectedItemIds.includes(item.id) ? "bg-[#4d3227]/5 border-[#4d3227] shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedItemIds.includes(item.id) ? "bg-[#4d3227] border-[#4d3227] text-white" : "border-slate-300"}`}>
                            {selectedItemIds.includes(item.id) && <span className="material-symbols-outlined text-[14px]">check</span>}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.product.name}</p>
                            <p className="text-[10px] text-slate-500">{item.quantity}x @ Rp {calculateItemUnitPrice(item).toLocaleString("id-ID")}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-[#4d3227]">Rp {(item.quantity * calculateItemUnitPrice(item)).toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 shrink-0">
                  <button 
                    type="submit"
                    disabled={selectedItemIds.length === 0}
                    className="w-full bg-[#4d3227] hover:bg-[#3a251d] disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined">print</span>
                    Bayar Item Terpilih (Rp {partialTotal.toLocaleString("id-ID")})
                  </button>
                </div>
              </div>

              {/* Right Column: Split Item Methods / Keypad */}
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-center min-h-[280px]">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-700">Metode Pembayaran Item</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setMethod("Cash")} className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${method === "Cash" ? "border-[#4d3227] bg-blue-50/50 text-[#4d3227]" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                      <span className="material-symbols-outlined text-[18px]">payments</span> Tunai
                    </button>
                    <button type="button" onClick={() => setMethod("QRIS")} className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${method === "QRIS" ? "border-[#4d3227] bg-blue-50/50 text-[#4d3227]" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                      <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span> QRIS
                    </button>
                  </div>

                  {method === "QRIS" && partialTotal > 0 && (
                    <div className="flex flex-col items-center justify-center pt-2">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-center text-center">
                        <p className="text-xs text-slate-400 italic">Silakan buat QRIS melalui tombol bayar sebelah kiri</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
}
