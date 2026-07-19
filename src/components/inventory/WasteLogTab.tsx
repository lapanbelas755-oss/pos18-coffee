import React, { useState } from "react";
import { StockItem, WasteLog } from "../../types";
import { supabase } from "../../lib/supabase";
import { sendTelegramMessage } from "../../lib/telegram";
import { useAuthStore } from "../../store/authStore";

interface Props {
  stockItems: StockItem[];
  wasteLogs: WasteLog[];
  setWasteLogs: React.Dispatch<React.SetStateAction<WasteLog[]>>;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function WasteLogTab({ stockItems, wasteLogs, setWasteLogs, onNotify }: Props) {
  const { currentUser } = useAuthStore();
  const [form, setForm] = useState({
    itemSku: "",
    quantity: "1",
    reason: "Tumpah",
    notes: ""
  });

  const reasons = ["Tumpah", "Kedaluwarsa", "Rusak", "Lainnya"];

  const handleSave = async () => {
    if (!form.itemSku) {
      onNotify("Pilih barang terlebih dahulu!", "warning");
      return;
    }
    const selectedItem = stockItems.find(s => s.sku === form.itemSku);
    if (!selectedItem) return;
    const costPerUnit = 35000; 
    const qty = parseFloat(form.quantity) || 1;
    const totalCost = costPerUnit * qty;
    const newLog: WasteLog = {
      id: `WST-${Date.now()}`,
      item: selectedItem.name,
      sku: selectedItem.sku,
      quantity: qty,
      unit: selectedItem.unit,
      reason: form.reason,
      notes: form.notes,
      cost: totalCost,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB"
    };
    setWasteLogs(prev => [newLog, ...prev]);
    const { error } = await supabase.from('waste_logs').insert([newLog]);
    if (error) { onNotify("Gagal mencatat pembuangan!", "warning"); return; }
    
    // Telegram Notification
    const user = currentUser?.name || "Sistem";
    const telegramMsg = `🗑️ <b>BARANG RUSAK / TERBUANG</b> 🗑️\n\n👤 <b>Oleh:</b> ${user}\n📦 <b>Barang:</b> ${selectedItem.name}\n📉 <b>Jumlah:</b> ${qty} ${selectedItem.unit}\n❓ <b>Alasan:</b> ${form.reason}\n📝 <b>Catatan:</b> ${form.notes || '-'}`;
    sendTelegramMessage(telegramMsg);
    
    onNotify(`Log pembuangan untuk ${selectedItem.name} berhasil dicatat.`, "success");
    setForm({ itemSku: "", quantity: "1", reason: "Tumpah", notes: "" });
  };

  const displayWasteLogs = wasteLogs.filter(log => log.reason !== "Penyesuaian Stok (Edit)");
  const totalLoss = displayWasteLogs.reduce((sum, log) => sum + log.cost, 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px]">
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        
        {/* Left Panel: Form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col h-fit">
          <h3 className="font-extrabold text-xl text-slate-800 mb-6">Catat Kerusakan /<br/>Pembuangan</h3>
          
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Pilih Barang</label>
              <div className="relative">
                <select 
                  value={form.itemSku}
                  onChange={e => setForm(p => ({ ...p, itemSku: e.target.value }))}
                  className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4a2d21]"
                >
                  <option value="" disabled>Pilih bahan baku...</option>
                  {stockItems.map(item => (
                    <option key={item.sku} value={item.sku}>{item.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-500 pointer-events-none">expand_more</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Jumlah</label>
                <input 
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Alasan</label>
                <div className="relative">
                  <select 
                    value={form.reason}
                    onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4a2d21]"
                  >
                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-500 pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Catatan Korektif</label>
              <textarea 
                rows={3}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Jelaskan apa yang terjadi dan tindakan korektif yang diambil..."
                className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4a2d21] resize-none"
              />
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-[#4a2d21] hover:bg-[#382016] text-white py-4 rounded-xl font-bold text-sm transition-colors mt-2 shadow-md"
            >
              Simpan Log
            </button>
          </div>
        </div>

        {/* Right Panel: History */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col">
          <h3 className="font-extrabold text-xl text-slate-800 mb-2">Log Pembuangan Terbaru</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">Riwayat kerusakan, tumpahan, atau kedaluwarsa barang yang dicatat dari area bar dan dapur.</p>

          <div className="flex flex-col gap-4 flex-1 overflow-y-auto mb-6 pr-2">
            {displayWasteLogs.map((log, idx) => (
              <div key={log.id || idx} className="border border-slate-200 rounded-2xl p-5 flex items-start gap-4 hover:border-[#4a2d21]/30 transition-colors bg-[#fcfaf8]">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-700 shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-extrabold text-slate-800 text-sm">{log.item} ({log.quantity} {log.unit})</h4>
                    <span className="font-black text-slate-800 text-sm">-Rp {log.cost.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-slate-600 leading-relaxed max-w-[80%]">
                      <span className="font-bold text-slate-800">Alasan: {log.reason}</span> &middot; {log.notes || "Tidak ada catatan"}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400">{log.time}</span>
                  </div>
                </div>
              </div>
            ))}
            {displayWasteLogs.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                Belum ada log pembuangan.
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200 border-dashed flex justify-between items-center">
            <span className="font-extrabold text-slate-800">Total Kerugian Terakumulasi:</span>
            <span className="font-black text-xl text-slate-800">-Rp {totalLoss.toLocaleString("id-ID")}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
