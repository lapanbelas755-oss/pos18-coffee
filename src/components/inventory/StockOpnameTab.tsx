import React, { useState } from "react";
import { StockItem } from "../../types";
import { supabase } from "../../lib/supabase";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function StockOpnameTab({ stockItems, setStockItems, onNotify }: Props) {
  // Local state for physical counts keyed by SKU
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [showQR, setShowQR] = useState<"kitchen" | "barista" | null>(null);

  const handleApply = async () => {
    let appliedCount = 0;
    const updates: PromiseLike<unknown>[] = [];

    stockItems.forEach(s => {
      const pCountStr = physicalCounts[s.sku];
      if (pCountStr !== undefined && pCountStr !== "") {
        appliedCount++;
        const currentQty = parseFloat(pCountStr) || 0;
        const origQty = parseFloat(s.quantity) || 0;
        const origLevel = s.stockLevel || 0;
        let maxCapacity = 500;
        if (origQty > 0 && origLevel > 0) maxCapacity = origQty / (origLevel / 100);
        const newStockLevel = Math.min(100, Math.max(0, (currentQty / maxCapacity) * 100));
        updates.push(supabase.from('stock_items').update({ quantity: pCountStr, stock_level: newStockLevel }).eq('sku', s.sku).then());
      }
    });

    await Promise.all(updates);

    if (appliedCount > 0) {
      onNotify(`Berhasil menerapkan penyesuaian stok untuk ${appliedCount} barang!`, "success");
      setPhysicalCounts({});
    }
  };

  const renderDifference = (systemQty: number, physicalQtyStr?: string) => {
    if (physicalQtyStr === undefined || physicalQtyStr === "") return null;
    const physicalQty = parseFloat(physicalQtyStr) || 0;
    const diff = physicalQty - systemQty;

    if (diff === 0) {
      return (
        <span className="px-3 py-1 bg-green-50 text-green-600 font-bold text-xs rounded-md">
          Sesuai
        </span>
      );
    }
    if (diff > 0) {
      return (
        <span className="px-3 py-1 bg-blue-50 text-blue-600 font-black text-xs rounded-md">
          +{diff}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-red-50 text-slate-800 font-black text-xs rounded-md">
        {diff}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px]">
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">Audit Opname Stok Berkala</h2>
            <p className="text-sm text-slate-500 font-medium">Hitung secara fisik barang di toko dan periksa silang dengan perkiraan di sistem komputer.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowQR("kitchen")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap border border-slate-200"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
              QR Dapur
            </button>
            <button 
              onClick={() => setShowQR("barista")}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap border border-slate-200"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
              QR Barista
            </button>
            <button 
              onClick={handleApply}
              className="bg-[#4a2d21] hover:bg-[#382016] text-white px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shadow-md ml-2"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Terapkan Penyesuaian
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-slate-700 uppercase tracking-widest w-[30%]">Barang di Toko</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">ID SKU</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-700 uppercase tracking-widest">Gudang</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-700 uppercase tracking-widest text-center w-[15%]">Perkiraan Sistem</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-700 uppercase tracking-widest text-center w-[15%]">Hitungan Fisik</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-700 uppercase tracking-widest text-center">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((item, index) => {
                const systemQty = parseFloat(item.quantity) || 0;
                return (
                  <tr key={item.sku} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-[#fafcf5]'} hover:bg-slate-50 transition-colors`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-[50px] h-[50px] rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <span className="material-symbols-outlined text-2xl">image</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800">{item.name}</span>
                          <span className="text-[11px] text-slate-500">{item.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center font-mono text-xs text-slate-600">{item.sku}</td>
                    <td className="px-8 py-5 text-sm text-slate-700 font-medium">{item.warehouse}</td>
                    <td className="px-8 py-5 text-center text-lg font-black text-slate-800">{systemQty}</td>
                    <td className="px-8 py-5 text-center">
                      <input 
                        type="number"
                        placeholder={systemQty.toString()}
                        value={physicalCounts[item.sku] ?? ""}
                        onChange={e => setPhysicalCounts(p => ({ ...p, [item.sku]: e.target.value }))}
                        className="w-[80px] text-center bg-[#f4ece3] border-none rounded-lg py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]"
                      />
                    </td>
                    <td className="px-8 py-5 text-center">
                      {renderDifference(systemQty, physicalCounts[item.sku])}
                    </td>
                  </tr>
                );
              })}
              {stockItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-slate-400">
                    Tidak ada barang inventaris.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQR(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowQR(null)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-2xl font-black text-slate-800 mb-1">
              QR Opname {showQR === 'kitchen' ? 'Dapur' : 'Barista'}
            </h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Scan menggunakan kamera HP untuk mengupdate stok fisik secara langsung.</p>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
              <QRCodeSVG 
                value={`${window.location.origin}/scan-opname/${showQR}`}
                size={220}
                bgColor={"#ffffff"}
                fgColor={"#4a2d21"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            
            <div className="bg-slate-50 w-full p-4 rounded-xl border border-slate-100 flex items-center justify-center gap-2 text-slate-600 font-bold">
              <span className="material-symbols-outlined text-sm">link</span>
              <span className="text-xs truncate">{`${window.location.origin}/scan-opname/${showQR}`}</span>
            </div>
            
            <p className="text-xs text-slate-400 mt-6 mt-4">
              *Karyawan akan diminta memasukkan PIN untuk verifikasi identitas.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
