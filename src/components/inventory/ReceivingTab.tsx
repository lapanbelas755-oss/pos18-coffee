import React, { useState } from "react";
import { StockItem } from "../../types";
import { supabase } from "../../lib/supabase";

interface Props {
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function ReceivingTab({ stockItems, setStockItems, onNotify }: Props) {
  const [scannedSku, setScannedSku] = useState("SY-VAN-22");
  const [qty, setQty] = useState<number | string>("12");
  const [notes, setNotes] = useState("");
  
  const [checklist, setChecklist] = useState({
    poMatch: true,
    condition: true,
    temp: true
  });

  const scannedItem = stockItems.find(s => s.sku === scannedSku) || {
    name: "Sirup Vanila Madagaskar",
    sku: "SY-VAN-22"
  };

  const handleConfirm = async () => {
    if (!qty) return;
    const item = stockItems.find(s => s.sku === scannedSku);
    if (item) {
      const newQty = (parseFloat(item.quantity) || 0) + parseFloat(qty.toString());
      await supabase.from('stock_items').update({ quantity: `${newQty}` }).eq('sku', scannedSku);
    }
    onNotify(`Berhasil memperbarui inventaris untuk ${scannedItem.name}!`, "success");
    setQty("");
    setNotes("");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px]">
      
      {/* Success Notification Mockup */}
      <div className="bg-[#0f4d38] text-white rounded-2xl px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl">check_circle</span>
          <span className="font-bold text-sm">Berhasil mendeteksi kode QR untuk SKU: {scannedSku}!</span>
        </div>
        <button className="hover:opacity-70 text-white rounded-full flex items-center justify-center bg-black/20 w-8 h-8">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Scanner Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center">
          <div className="w-full flex justify-between items-start mb-6">
            <h3 className="font-extrabold text-xl text-slate-800 leading-tight w-2/3">Pemindai QR / Kode Batang Terintegrasi</h3>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Kamera</span>
              <span className="text-xs font-bold text-slate-800 uppercase">Bingkai Aktif</span>
            </div>
          </div>

          <div className="w-full aspect-[4/5] bg-[#111111] rounded-2xl flex flex-col items-center justify-center p-8 relative shadow-inner">
            {/* Target brackets */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg opacity-50"></div>
            <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg opacity-50"></div>
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg opacity-50"></div>
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg opacity-50"></div>

            <span className="material-symbols-outlined text-green-500 text-5xl mb-6">check_circle</span>
            <h2 className="text-white text-2xl font-black text-center mb-6 tracking-tight">SKU BERHASIL DIDETEKSI</h2>
            <div className="px-6 py-2 border border-slate-700 rounded-full text-slate-300 font-mono text-sm tracking-wider mb-8">
              {scannedSku}
            </div>
            
            <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-colors">
              Pindai Lainnya
            </button>
          </div>

          <div className="w-full flex justify-between items-center mt-6 px-2">
            <div className="flex items-center gap-3 text-slate-600">
              <span className="material-symbols-outlined text-2xl">photo_camera</span>
              <span className="text-sm font-medium">Kamera Logitech C920 PRO<br/>1080p</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-[#4a2d21]">Gudang Penerimaan<br/>#1</span>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col">
          <h3 className="font-extrabold text-xl text-slate-800 mb-6">Log Penerimaan Barang</h3>
          
          <div className="bg-[#fcfaf8] border border-[#f0e8e0] rounded-2xl p-6 mb-8">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Barang Yang Dipindai</span>
            <h4 className="text-xl font-extrabold text-[#4a2d21] mb-1">{scannedItem.name}</h4>
            <span className="text-sm font-mono text-slate-500">{scannedSku}</span>
          </div>

          <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest block mb-4">Daftar Periksa Kontrol Kualitas</span>
          
          <div className="flex flex-col gap-3 mb-8">
            {[
              { id: 'poMatch', label: "Jumlah sesuai PO" },
              { id: 'condition', label: "Kemasan utuh (tidak ada cacat/rusak)" },
              { id: 'temp', label: "Suhu & rantai pendingin terjaga" },
            ].map(item => (
              <label key={item.id} className="flex items-center justify-between bg-[#fcfaf8] border border-[#f0e8e0] rounded-2xl p-4 cursor-pointer hover:bg-[#faf4ec] transition-colors">
                <span className="text-sm font-bold text-slate-800">{item.label}</span>
                <div className={`w-12 h-7 rounded-full flex items-center p-1 transition-colors ${checklist[item.id as keyof typeof checklist] ? "bg-[#4a2d21]" : "bg-slate-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${checklist[item.id as keyof typeof checklist] ? "translate-x-5" : "translate-x-0"}`}></div>
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={checklist[item.id as keyof typeof checklist]} 
                  onChange={() => setChecklist(p => ({ ...p, [item.id]: !p[item.id as keyof typeof checklist] }))}
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Jumlah Diterima</span>
              <input 
                type="number" 
                value={qty} 
                onChange={e => setQty(e.target.value)}
                className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Komentar / Catatan</span>
              <input 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="misal: Nomor Batch #4"
                className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]"
              />
            </div>
          </div>

          <button 
            onClick={handleConfirm}
            className="w-full bg-[#4a2d21] hover:bg-[#382016] text-white py-5 rounded-2xl font-black text-sm transition-colors mt-auto shadow-md"
          >
            KONFIRMASI PENGIRIMAN & PERBARUI INVENTARIS
          </button>
        </div>

      </div>
    </div>
  );
}
