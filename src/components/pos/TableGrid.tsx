import React, { useState } from "react";
import { TableData, CartItem } from "../../types";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface TableGridProps {
  tables?: TableData[];
  setTables?: React.Dispatch<React.SetStateAction<TableData[]>>;
  activeTableId?: string | null;
  setActiveTableId?: (id: string | null) => void;
  setCart?: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onNotify?: (msg: string, type: "success"|"error"|"warning"|"info") => void;
}

export default function TableGrid({
  tables = [],
  setTables,
  activeTableId = null,
  setActiveTableId = () => {},
  setCart = () => {},
  onNotify
}: TableGridProps) {
  const [filter, setFilter] = useState("Semua");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [selectedTableForMerge, setSelectedTableForMerge] = useState<TableData | null>(null);
  const [actionType, setActionType] = useState<"gabung" | "pindah">("gabung");
  
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Kosong": return "bg-[#cce3e3] text-slate-700"; // Light cyan/grey from screenshot
      case "Hold": return "bg-red-500 text-white";
      case "Belum Dipesan": return "bg-blue-300 text-white";
      case "Sudah Dipesan": return "bg-primary text-white"; // Dark blue
      case "Selesai": return "bg-green-500 text-white";
      default: return "bg-slate-200 text-slate-700";
    }
  };

  const handleTableClick = (table: TableData) => {
    if (table.status === "Digabung" && table.linkedTo) {
      const parent = tables.find(t => t.id === table.linkedTo);
      if (parent) {
        setActiveTableId(parent.id);
        setCart(parent.cart || []);
        navigate("/pos");
        return;
      }
    }
    setActiveTableId(table.id);
    setCart(table.cart || []);
    navigate("/pos");
  };

  const handleMergeTables = () => {
    if (!selectedTableForMerge || !mergeTargetId || !setTables) return;

    const mergeCarts = (cart1: CartItem[], cart2: CartItem[]): CartItem[] => {
      const result = [...cart1].map(item => ({ ...item }));
      cart2.forEach(item2 => {
        const existing = result.find(i => i.id === item2.id);
        if (existing) {
          // Jika ID sama, tambah qty dan pastikan harga tidak 0
          existing.quantity += item2.quantity;
          if (existing.product.price === 0 && item2.product.price > 0) {
            existing.product = { ...item2.product };
          }
        } else {
          // Beri ID unik agar tidak konflik saat partial checkout
          const newId = `${item2.id}-src${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
          result.push({ ...item2, id: newId });
        }
      });
      return result;
    };

    setTables(prev => {
      const source = prev.find(t => t.id === selectedTableForMerge.id);
      const target = prev.find(t => t.id === mergeTargetId);
      if (!source || !target) return prev;

      const newTarget: TableData = { 
        ...target, 
        cart: mergeCarts(target.cart || [], source.cart || []),
        current: target.current + source.current,
        status: "Sudah Dipesan"
      };

      const newSource: TableData = actionType === "gabung" 
        ? { ...source, cart: [], status: "Digabung", linkedTo: target.id }
        : { ...source, cart: [], current: 0, status: "Kosong", customerName: undefined, time: "", linkedTo: undefined };

      // Supabase Updates (Optimistic)
      supabase.from('tables').update({ 
        cart: newTarget.cart, current: newTarget.current, status: newTarget.status 
      }).eq('id', newTarget.id).then();
      
      supabase.from('tables').update({ 
        cart: newSource.cart, current: newSource.current, status: newSource.status, linkedTo: newSource.linkedTo, customerName: newSource.customerName, time: newSource.time 
      }).eq('id', newSource.id).then();

      return prev.map(t => {
        if (t.id === target.id) return newTarget;
        if (t.id === source.id) return newSource;
        return t;
      });
    });

    const targetTable = tables.find(t => t.id === mergeTargetId);
    if (onNotify) {
      if (actionType === "gabung") {
        onNotify(`Meja ${selectedTableForMerge.name} berhasil digabung ke ${targetTable?.name || "Meja Tujuan"}`, "success");
      } else {
        onNotify(`Pesanan meja ${selectedTableForMerge.name} berhasil dipindah ke ${targetTable?.name || "Meja Tujuan"}`, "success");
      }
    }
    setShowMergeModal(false);
    setSelectedTableForMerge(null);
    setMergeTargetId("");
    setActionType("gabung");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      {/* Top Bar with Filters */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <h2 className="font-bold text-lg text-slate-800">Dine In</h2>
        <div className="flex gap-2">
          {["Semua", "Kosong", "Hold", "Belum Dipesan", "Sudah Dipesan", "Selesai"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === f
                  ? "bg-primary text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {tables.filter(t => filter === "Semua" ? true : t.status === filter).map((table) => {
            const isSelected = table.id === activeTableId;
            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`relative rounded-2xl overflow-hidden flex flex-col h-[140px] cursor-pointer transition-all border-2 ${
                  isSelected ? "border-primary shadow-xl scale-105" : "border-transparent hover:shadow-lg hover:-translate-y-1"
                }`}
              >
                {/* Colored Top Area */}
                <div className={`${getStatusColor(table.status)} flex-1 p-4 flex flex-col items-center justify-center relative`}>
                  {table.time && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold opacity-80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {table.time}
                    </span>
                  )}

                  {table.status === "Sudah Dipesan" && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedTableForMerge(table); setActionType("gabung"); setShowMergeModal(true); }}
                      className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 rounded-full w-7 h-7 flex items-center justify-center text-white transition-colors"
                      title="Pindah / Gabung Meja"
                    >
                      <span className="material-symbols-outlined text-[14px]">merge</span>
                    </button>
                  )}
                  
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {table.name}
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wider mt-1 opacity-90">
                      {table.status}
                    </span>
                    {table.status === "Digabung" && table.linkedTo && (
                      <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full mt-1.5 font-bold truncate max-w-[90%]">
                        ke {tables.find(t => t.id === table.linkedTo)?.name}
                      </span>
                    )}
                    {table.customerName && !table.customerName.startsWith('table-') && (
                      <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full mt-1.5 font-bold truncate max-w-[90%]">
                        {table.customerName}
                      </span>
                    )}
                  </div>
                </div>

                {/* White Bottom Area */}
                <div className="bg-white h-10 flex items-center justify-center border-t border-black/5">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    <span>{table.current} / {table.capacity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Merge Table Modal */}
      {showMergeModal && selectedTableForMerge && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-xl text-slate-800">Pindah / Gabung Meja</h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActionType("gabung")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-colors ${actionType === "gabung" ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                Gabung Meja
              </button>
              <button
                onClick={() => setActionType("pindah")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-colors ${actionType === "pindah" ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                Pindah Meja
              </button>
            </div>
            
            <div className={`${actionType === "gabung" ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"} border rounded-xl p-4 mb-6 flex items-start gap-3`}>
              <span className={`material-symbols-outlined mt-0.5 ${actionType === "gabung" ? "text-blue-500" : "text-orange-500"}`}>info</span>
              <div>
                <p className={`text-sm font-bold ${actionType === "gabung" ? "text-blue-800" : "text-orange-800"}`}>{actionType === "gabung" ? "Gabung Antar Meja" : "Pindahkan Pesanan"}</p>
                <p className={`text-xs mt-1 ${actionType === "gabung" ? "text-blue-600" : "text-orange-600"}`}>
                  {actionType === "gabung" 
                    ? `Pesanan dan tagihan ${selectedTableForMerge.name} akan digabung ke meja tujuan. ${selectedTableForMerge.name} tetap berstatus "Digabung".` 
                    : `Seluruh pesanan dari ${selectedTableForMerge.name} akan dipindahkan ke meja tujuan, dan ${selectedTableForMerge.name} akan dikosongkan.`
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Pilih Meja Tujuan</label>
                <div className="relative">
                  <select 
                    value={mergeTargetId} 
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>Pilih meja...</option>
                    {tables.filter(t => t.id !== selectedTableForMerge.id).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowMergeModal(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleMergeTables}
                disabled={!mergeTargetId}
                className="flex-1 py-3 text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-primary/20"
              >
                {actionType === "gabung" ? "Gabung Sekarang" : "Pindah Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
