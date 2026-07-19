import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePOSContext } from "../../layouts/POSLayout";
import { TableData, CartItem } from "../../types";
import { supabase } from "../../lib/supabase";
import { QRCodeSVG } from "qrcode.react";

interface POSTableManagementViewProps {
  tables: TableData[];
  setTables: React.Dispatch<React.SetStateAction<TableData[]>>;
  setActiveTableId: (id: string | null) => void;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function POSTableManagementView({ tables, setTables, setActiveTableId, onNotify }: POSTableManagementViewProps) {
  const { sidebarOpen, setSidebarOpen } = usePOSContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("Semua");
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrTable, setQrTable] = useState<TableData | null>(null);

  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [actionType, setActionType] = useState<"gabung" | "pindah">("gabung");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Kosong": return "bg-[#cce3e3] text-slate-700";
      case "Hold": return "bg-red-500 text-white";
      case "Belum Dipesan": return "bg-blue-300 text-white";
      case "Sudah Dipesan": return "bg-[#4d3227] text-white";
      case "Selesai": return "bg-green-500 text-white";
      default: return "bg-slate-200 text-slate-700";
    }
  };

  const handleTableClick = (table: TableData) => {
    setSelectedTable(table);
  };

  const handleOrderForTable = () => {
    if (selectedTable) {
      setActiveTableId(selectedTable.id);
      navigate("/pos");
    }
  };

  const handleClearTable = () => {
    if (selectedTable) {
      setTables(prev => prev.map(t => {
        if (t.id === selectedTable.id || t.linkedTo === selectedTable.id) {
          const updated = { ...t, status: "Kosong" as const, current: 0, cart: [], customerName: undefined, time: "", linkedTo: undefined };
          supabase.from('tables').update({
            cart: updated.cart,
            status: updated.status,
            customer_name: updated.customerName || null
          }).eq('id', t.id).then();
          return updated;
        }
        return t;
      }));
      setSelectedTable(null);
      onNotify(`Meja ${selectedTable.name} telah dikosongkan.`, "info");
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (selectedTable) {
      setTables(prev => prev.map(t => 
        t.id === selectedTable.id ? { ...t, status: newStatus as any } : t
      ));
      supabase.from('tables').update({ status: newStatus as any }).eq('id', selectedTable.id).then();
      onNotify(`Status meja ${selectedTable.name} diubah menjadi ${newStatus}.`, "info");
      setSelectedTable(prev => prev ? { ...prev, status: newStatus as any } : null);
    }
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    const newTable: TableData = {
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      name: newTableName,
      capacity: parseInt(newTableCapacity) || 4,
      status: "Kosong",
      current: 0,
      time: "",
      cart: []
    };

    setTables(prev => [...prev, newTable]);
    supabase.from('tables').insert([newTable]).then();
    onNotify(`Meja ${newTableName} berhasil ditambahkan.`, "success");
    
    setNewTableName("");
    setNewTableCapacity("4");
    setShowAddModal(false);
  };

  const handleMergeTables = () => {
    if (!selectedTable || !mergeTargetId) return;

    const mergeCarts = (cart1: CartItem[], cart2: CartItem[]): CartItem[] => {
      const result = [...cart1].map(item => ({ ...item }));
      cart2.forEach(item2 => {
        const existing = result.find(i => i.id === item2.id);
        if (existing) {
          existing.quantity += item2.quantity;
          if (existing.product.price === 0 && item2.product.price > 0) {
            existing.product = { ...item2.product };
          }
        } else {
          const newId = `${item2.id}-src${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
          result.push({ ...item2, id: newId });
        }
      });
      return result;
    };

    setTables(prev => {
      const source = prev.find(t => t.id === selectedTable.id);
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
        cart: newSource.cart, current: newSource.current, status: newSource.status, 
        linked_to: newSource.linkedTo || null, customer_name: newSource.customerName || null, time: newSource.time 
      }).eq('id', newSource.id).then();

      // Merge logic: all items from source move to target
      return prev.map(t => {
        if (t.id === target.id) return newTarget;
        if (t.id === source.id) return newSource;
        return t;
      });
    });

    const targetTable = tables.find(t => t.id === mergeTargetId);
    if (actionType === "gabung") {
      onNotify(`Meja ${selectedTable.name} berhasil digabung ke ${targetTable?.name || "Meja Tujuan"}`, "success");
    } else {
      onNotify(`Pesanan meja ${selectedTable.name} berhasil dipindah ke ${targetTable?.name || "Meja Tujuan"}`, "success");
    }
    setShowMergeModal(false);
    setSelectedTable(null);
    setMergeTargetId("");
    setActionType("gabung");
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden relative">
      
      {/* Header (Blue) */}
      <div className="bg-[#4d3227] text-white flex items-center justify-between px-6 py-4 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-xl">Pengaturan Meja</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-white text-[#4d3227] px-4 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Meja
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Filters */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-4 shadow-sm z-10 shrink-0">
          <span className="font-bold text-slate-700 mr-2">Filter:</span>
          {["Semua", "Kosong", "Hold", "Belum Dipesan", "Sudah Dipesan", "Selesai", "Digabung"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                filter === f
                  ? "bg-[#4d3227] text-white border-[#4d3227] shadow-md"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
            {tables.filter(t => filter === "Semua" ? true : t.status === filter).map((table) => {
              const isSelected = selectedTable?.id === table.id;
              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={`relative rounded-2xl overflow-hidden flex flex-col h-[140px] cursor-pointer transition-all border-[3px] ${
                    isSelected ? "border-[#4d3227] shadow-2xl scale-105 z-10" : "border-transparent shadow-md hover:shadow-lg hover:-translate-y-1"
                  }`}
                >
                  {/* QR Code Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setQrTable(table); setShowQRModal(true); }}
                    className="absolute top-2 right-2 bg-white/30 hover:bg-white/50 text-white w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm z-20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                  </button>

                  {/* Colored Top Area */}
                  <div className={`${getStatusColor(table.status)} flex-1 p-4 flex flex-col items-center justify-center relative`}>
                    {table.time && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold opacity-80 flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        {table.time}
                      </span>
                    )}
                    
                    <div className="flex flex-col items-center">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {table.name}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider mt-1 opacity-90">
                        {table.status}
                      </span>
                      {table.status === "Digabung" && table.linkedTo && (
                        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full mt-1.5 font-bold truncate max-w-[90%]">
                          ke {tables.find(t => t.id === table.linkedTo)?.name}
                        </span>
                      )}
                      {table.customerName && (
                        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full mt-1.5 font-bold truncate max-w-[90%]">
                          {table.customerName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* White Bottom Area */}
                  <div className="bg-white h-10 flex items-center justify-center border-t border-black/10">
                    <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs">
                      <span className="material-symbols-outlined text-[16px]">group</span>
                      <span>{table.current} / {table.capacity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Action Modal / Side Panel for Selected Table */}
      {selectedTable && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedTable(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            
            <div className={`${getStatusColor(selectedTable.status)} p-6 text-center relative`}>
              <button 
                onClick={() => setSelectedTable(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="text-4xl font-extrabold mb-1">{selectedTable.name}</h3>
              <p className="font-bold opacity-90 tracking-wide uppercase text-sm">{selectedTable.status}</p>
            </div>

            <div className="p-6 space-y-6">
              
              <div className="flex justify-between items-center text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-xs">Kapasitas</span>
                  <span>{selectedTable.current} / {selectedTable.capacity} Orang</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-slate-400 text-xs">Waktu Kedatangan</span>
                  <span>{selectedTable.time || "-"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleOrderForTable}
                  className="bg-[#4d3227] text-white py-3 rounded-xl font-bold hover:bg-[#3a251d] transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined">shopping_cart_checkout</span>
                  <span>Buat Pesanan</span>
                </button>
                <button 
                  onClick={handleClearTable}
                  className="bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined">cleaning_services</span>
                  <span>Kosongkan</span>
                </button>
              </div>

              {selectedTable.status !== "Kosong" && (
                <button 
                  onClick={() => { setActionType("gabung"); setShowMergeModal(true); }}
                  className="w-full bg-blue-50 text-blue-600 border border-blue-200 py-3 rounded-xl font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <span className="material-symbols-outlined text-[20px]">merge</span>
                  Pindah / Gabung Meja
                </button>
              )}

              <div className="border-t border-slate-200 pt-6">
                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Ubah Status Cepat</p>
                <div className="flex flex-wrap gap-2">
                  {["Kosong", "Hold", "Belum Dipesan", "Sudah Dipesan", "Selesai"].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        selectedTable.status === status
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Add New Table Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in p-6">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-slate-800">Tambah Meja Baru</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama / Nomor Meja</label>
                <input 
                  type="text" 
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                  placeholder="Contoh: Meja 12"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Kapasitas Kursi</label>
                <input 
                  type="number" 
                  min="1"
                  value={newTableCapacity}
                  onChange={e => setNewTableCapacity(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227]"
                  required
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-[#4d3227] text-white py-3 rounded-xl font-bold hover:bg-[#3a251d] transition-colors shadow-md"
                >
                  Simpan Meja
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrTable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-[#4d3227] text-white">
              <h2 className="font-bold text-lg">QR Code {qrTable.name}</h2>
              <button onClick={() => setShowQRModal(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center bg-slate-50">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                <QRCodeSVG 
                  value={`${window.location.origin}/qr/${qrTable.id}`} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <h3 className="font-extrabold text-2xl text-slate-800 tracking-tight">{qrTable.name}</h3>
              <p className="text-sm text-slate-500 mt-2 text-center">
                Scan QR Code ini untuk memesan langsung dari meja.
              </p>
            </div>

            <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => {
                  window.open(`/qr/${qrTable.id}`, '_blank');
                  setShowQRModal(false);
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Buka Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Table Modal */}
      {showMergeModal && selectedTable && (
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
                className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-colors ${actionType === "gabung" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
              >
                Gabung Meja
              </button>
              <button
                onClick={() => setActionType("pindah")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-colors ${actionType === "pindah" ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
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
                    ? `Pesanan dan tagihan ${selectedTable.name} akan digabung ke meja tujuan. ${selectedTable.name} tetap berstatus "Digabung".` 
                    : `Seluruh pesanan dari ${selectedTable.name} akan dipindahkan ke meja tujuan, dan ${selectedTable.name} akan dikosongkan.`
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4d3227]"
                  >
                    <option value="" disabled>Pilih meja...</option>
                    {tables.filter(t => t.id !== selectedTable.id).map(t => (
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
                className={`flex-1 py-3 text-sm font-bold text-white rounded-xl transition-colors shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed ${
                  actionType === "gabung" 
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" 
                    : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                }`}
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
