import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { sendTelegramNotification } from "../../utils/telegram";
import { StockItem } from "../../types";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../lib/supabase";

export default function ScannerMainScreen() {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [sku, setSku] = useState("");
  const [itemFound, setItemFound] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{msg: string, type: string} | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const triggerToast = (msg: string, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    if (showCamera) {
      // Delay initialization slightly to ensure the #reader element is in the DOM
      const timer = setTimeout(() => {
        html5QrCode = new Html5Qrcode("reader");
        
        html5QrCode.start(
          { facingMode: "environment" }, // Prefer back camera
          {
            fps: 5,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Success
            setSku(decodedText);
            setShowCamera(false);
            // Trigger search automatically
            handleCheckSku(decodedText);
          },
          (errorMessage) => {
            // Ignore ongoing read errors
          }
        ).catch((err) => {
          console.error("Camera start failed:", err);
          triggerToast("Gagal mengakses kamera. Pastikan izin kamera diberikan di browser Anda.", "error");
          setShowCamera(false);
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(console.error);
        }
      };
    }
  }, [showCamera]);

  if (!currentUser) {
    navigate("/scanner", { replace: true });
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/scanner", { replace: true });
  };

  const handleCheckSku = async (searchSku: string = sku) => {
    if (!searchSku.trim()) return;
    setIsScanning(true);
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('sku', searchSku.trim())
        .single();
        
      if (error || !data) {
        triggerToast(`SKU ${searchSku} tidak ditemukan di database.`, "warning");
        setItemFound(null);
      } else {
        triggerToast(`Barcode terdeteksi: ${searchSku}`, "info");
        setItemFound({
          sku: data.sku,
          name: data.name,
          category: data.category,
          stockLevel: data.stock_level,
          quantity: data.quantity,
          warehouse: data.warehouse,
          unit: data.unit,
          status: data.status,
          image: data.image
        });
      }
    } catch (e) {
      console.error(e);
      triggerToast("Gagal mencari SKU.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!sku.trim() || quantity <= 0 || !itemFound || !currentUser) {
      triggerToast("SKU dan Jumlah tidak valid!", "warning");
      return;
    }

    setLoading(true);

    const isManager = currentUser.role.toLowerCase() === 'manajer' || currentUser.role.toLowerCase() === 'admin';
    const isBaristaOrChef = currentUser.role.toLowerCase() === 'barista' || currentUser.role.toLowerCase() === 'chef';

    const currentQty = parseFloat(itemFound.quantity) || 0;
    
    if (!isManager && currentQty < quantity) {
      triggerToast(`Stok tidak mencukupi! Sisa stok hanya ${currentQty} ${itemFound.unit}.`, "warning");
      setLoading(false);
      return;
    }

    // Hitung stok baru
    let newQty = currentQty;
    if (isManager) {
      newQty = currentQty + quantity; // Manager tambah stok
    } else {
      newQty = currentQty - quantity; // Karyawan ambil stok
    }

    // Perbarui level stok (opsional, menggunakan max 500 sebagai acuan dasar)
    const maxCapacity = (currentQty > 0 && itemFound.stockLevel && itemFound.stockLevel > 0) ? (currentQty / (itemFound.stockLevel / 100)) : 500;
    const newStockLevel = Math.min(100, Math.max(0, (newQty / maxCapacity) * 100));

    try {
      // 1. UPDATE DATABASE STOK SECARA REAL-TIME
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: newQty.toString(),
          stock_level: newStockLevel 
        })
        .eq('sku', itemFound.sku);

      if (updateError) throw updateError;

      // 2. KIRIM TELEGRAM
      const now = new Date();
      const dateStr = now.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });

      let message = "";
      if (isManager) {
        message = `
📥 *BARANG MASUK (RESTOCK)*
--------------------------------
👤 *Manajer:* ${currentUser.name}
📅 *Waktu:* ${dateStr}, ${timeStr} WIB
🛒 *Barang:* ${itemFound.name} (SKU: ${itemFound.sku})
➕ *Ditambahkan:* ${quantity} ${itemFound.unit}
📊 *Total Stok Sekarang:* ${newQty} ${itemFound.unit}
_Diperbarui otomatis via POS18 Scanner_
        `.trim();
      } else {
        message = `
📤 *PENGAMBILAN GUDANG*
--------------------------------
👤 *${currentUser.role}:* ${currentUser.name}
📅 *Waktu:* ${dateStr}, ${timeStr} WIB
🛒 *Barang:* ${itemFound.name} (SKU: ${itemFound.sku})
➖ *Diambil:* ${quantity} ${itemFound.unit}
📊 *Sisa Stok Sekarang:* ${newQty} ${itemFound.unit}
_Dicatat otomatis via POS18 Scanner_
        `.trim();
      }

      await sendTelegramNotification(message);

      // 3. TAMPILKAN POP-UP SUKSES
      if (isManager) {
        triggerToast(`Berhasil menambah stok ${quantity} ${itemFound.unit}. Total stok sekarang: ${newQty} ${itemFound.unit}.`, "success");
      } else {
        triggerToast(`Berhasil mengambil ${quantity} ${itemFound.unit}. Stok tersisa: ${newQty} ${itemFound.unit}.`, "success");
      }
      
      setSku("");
      setItemFound(null);
      setQuantity(1);
    } catch (e) {
      triggerToast("Gagal memperbarui database stok", "error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 sm:p-12 relative overflow-hidden">
      
      {/* Dekorasi Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100 rounded-full blur-[100px] opacity-50 -mr-40 -mt-40 pointer-events-none"></div>
      
      {/* Header */}
      <header className="w-full max-w-2xl flex justify-between items-center mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30 text-white">
            <span className="material-symbols-outlined text-3xl">barcode_scanner</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Ambil Stok Gudang</h1>
            <p className="text-slate-500 font-semibold text-sm">Masuk sebagai <strong className="text-emerald-600">{currentUser.name}</strong></p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-white hover:bg-slate-100 text-slate-600 font-bold px-6 py-3 rounded-2xl shadow-sm border border-slate-200 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="hidden sm:inline">Selesai / Keluar</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl bg-white rounded-[32px] shadow-xl border border-slate-100 p-8 flex flex-col gap-8 relative z-10">
        <div className="p-5 bg-blue-50/80 border border-blue-100 text-blue-700 rounded-2xl flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
             <span className="material-symbols-outlined text-blue-600">info</span>
          </div>
          <p className="text-sm font-bold leading-relaxed pt-1">
            <b>{currentUser.role} Mode:</b> Scanner ini terhubung langsung ke Database. 
            {currentUser.role.toLowerCase() === 'manajer' || currentUser.role.toLowerCase() === 'admin' 
              ? " Sebagai Manajer, angka yang Anda masukkan akan DITAMBAHKAN ke total stok fisik gudang." 
              : " Saat Anda scan, stok fisik gudang akan otomatis DIKURANGI. Pastikan angka sesuai fisik yang diambil!"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase font-black tracking-widest text-slate-400">1. Scan Barcode / SKU</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={sku}
                autoFocus={!showCamera}
                onChange={(e) => {
                  setSku(e.target.value);
                  setItemFound(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckSku(sku)}
                placeholder="Arahkan scanner atau ketik SKU (Contoh: SKU-0344)"
                className="w-full bg-[#f8faf9] border-2 border-slate-200 rounded-2xl py-4 pl-14 pr-4 font-bold text-slate-800 text-lg focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
              />
              <span className="material-symbols-outlined absolute left-5 top-[18px] text-slate-400 text-2xl">qr_code_scanner</span>
            </div>
            <button 
              onClick={() => handleCheckSku(sku)}
              disabled={isScanning || !sku}
              className="bg-slate-800 text-white px-8 rounded-2xl font-black hover:bg-slate-900 transition-colors disabled:opacity-50 text-lg shadow-lg shadow-slate-800/20"
            >
              Cari
            </button>
          </div>
        </div>

        {/* Camera Toggle Button & Reader Area */}
        <div className="flex flex-col gap-4 items-center">
          {!showCamera ? (
            <button 
              onClick={() => setShowCamera(true)}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 py-3 px-6 rounded-2xl font-bold flex items-center gap-3 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined">photo_camera</span>
              Scan dengan Kamera HP
            </button>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl border-4 border-emerald-500 bg-black relative min-h-[300px] flex items-center justify-center">
                 {/* The html5-qrcode will mount inside this div */}
                 <div id="reader" className="w-full"></div>
                 <span className="text-white/50 text-sm absolute z-0 animate-pulse">Menginisialisasi Kamera...</span>
              </div>
              <button 
                onClick={() => setShowCamera(false)}
                className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 py-2 px-6 rounded-2xl font-bold transition-colors"
              >
                Tutup Kamera
              </button>
            </div>
          )}
        </div>

        {itemFound && (
          <div className="bg-emerald-50 p-6 rounded-2xl flex items-center gap-4 border border-emerald-100 animate-slide-up">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
               <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">Barang Ditemukan</span>
              <span className="font-black text-slate-800 text-xl">{itemFound.name}</span>
              <span className="text-emerald-700 font-bold text-sm mt-1">Stok Fisik Saat Ini: <span className="text-lg bg-emerald-200/50 px-2 rounded-md">{itemFound.quantity} {itemFound.unit}</span></span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase font-black tracking-widest text-slate-400">2. Jumlah Diambil</label>
          <div className="flex items-center gap-4 bg-[#f8faf9] p-2 rounded-3xl border-2 border-slate-100 w-full sm:w-1/2">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-slate-600 hover:bg-slate-50 text-2xl shadow-sm border border-slate-200">-</button>
            <input 
              type="number" 
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="flex-1 bg-transparent py-3 text-center font-black text-slate-800 text-3xl focus:outline-none"
            />
            <button onClick={() => setQuantity(quantity + 1)} className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-white hover:bg-slate-900 text-2xl shadow-sm">+</button>
          </div>
        </div>
        
        <div className="pt-4 border-t border-dashed border-slate-200 mt-4">
          <button 
            onClick={handleSubmit}
            disabled={loading || !sku || quantity <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg transition-transform active:scale-[0.98] shadow-xl shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 relative z-10"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[24px]">send</span>
                Kirim Log Pengambilan
              </>
            )}
          </button>
        </div>
      </main>

      {/* Simple Toast */}
      {toastMessage && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-8 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-slide-up text-lg ${
          toastMessage.type === 'warning' ? 'bg-amber-500 text-black' :
          toastMessage.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'
        }`}>
          <span className="material-symbols-outlined text-2xl">
            {toastMessage.type === 'warning' ? 'warning' : 'check_circle'}
          </span>
          {toastMessage.msg}
        </div>
      )}

    </div>
  );
}
