import React, { useState } from "react";
import { usePOSContext } from "../../layouts/POSLayout";
import { usePosStore } from "../../store/posStore";
import { Promo } from "../../types";

interface POSPromoViewProps {
  onNotify: (msg: string, type?: "success" | "warning" | "info" | "error") => void;
}

export default function POSPromoView({ onNotify }: POSPromoViewProps) {
  const { sidebarOpen, setSidebarOpen } = usePOSContext();
  const { promos, setPromos } = usePosStore();
  const [activeTab, setActiveTab] = useState("Promo Aktif");
  const [search, setSearch] = useState("");
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Promo>>({
    title: "",
    code: "",
    type: "Persentase",
    value: 0,
    minPurchase: 0,
    validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
  });

  const handleOpenModal = (promo?: Promo) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData(promo);
    } else {
      setEditingPromo(null);
      setFormData({
        title: "",
        code: "",
        type: "Persentase",
        value: 0,
        minPurchase: 0,
        validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      });
    }
    setShowModal(true);
  };

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.code || !formData.value) {
      onNotify("Mohon lengkapi data promo!", "warning");
      return;
    }

    if (editingPromo) {
      setPromos(prev => prev.map(p => p.id === editingPromo.id ? { ...p, ...formData } as Promo : p));
      onNotify(`Promo ${formData.code} berhasil diperbarui`, "success");
    } else {
      const newPromo: Promo = {
        id: `PRM-${Date.now()}`,
        title: formData.title || "",
        code: formData.code.toUpperCase() || "",
        type: formData.type as any || "Persentase",
        value: Number(formData.value) || 0,
        minPurchase: Number(formData.minPurchase) || 0,
        validUntil: formData.validUntil || "",
        status: "Aktif",
        usage: 0
      };
      setPromos(prev => [newPromo, ...prev]);
      onNotify(`Promo ${newPromo.code} berhasil ditambahkan`, "success");
    }
    setShowModal(false);
  };

  const handleToggleStatus = (promo: Promo) => {
    const newStatus = promo.status === "Aktif" ? "Nonaktif" : "Aktif";
    setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, status: newStatus } : p));
    onNotify(`Promo ${promo.code} berhasil di-${newStatus.toLowerCase()}kan`, "info");
  };

  const filteredPromos = promos.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "Promo Aktif" ? p.status === "Aktif" : activeTab === "Riwayat" ? p.status === "Nonaktif" : true;
    return matchSearch && matchTab;
  });


  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden">
      
      {/* Header (Blue) */}
      <div className="bg-[#4d3227] text-white flex items-center justify-between px-6 py-4 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-bold text-xl">Promo & Kupon</span>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-white text-[#4d3227] px-4 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Promo
        </button>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6 shrink-0">
          {["Promo Aktif", "Kupon", "Riwayat"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm transition-colors ${
                activeTab === tab
                  ? "text-[#4d3227] border-b-2 border-[#4d3227]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-t-xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-center shrink-0">
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Cari nama promo atau kode..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227]"
            />
          </div>
          <div className="sm:ml-auto text-sm text-slate-500 font-medium">
            Total: {filteredPromos.length} Promo
          </div>
        </div>

        {/* Promo Grid/List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white border-x border-b border-slate-200 rounded-b-xl p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPromos.map((promo) => (
              <div key={promo.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col bg-white relative overflow-hidden group">
                
                {/* Decoration Ribbon */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out"></div>
                
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                    {promo.code}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${promo.status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${promo.status === 'Aktif' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    {promo.status}
                  </div>
                </div>
                
                <h3 className="font-extrabold text-slate-800 text-lg mb-1 relative z-10 leading-tight">
                  {promo.title}
                </h3>
                <p className="text-sm text-slate-500 mb-4 relative z-10 font-medium">
                  Berlaku s/d {promo.validUntil}
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 relative z-10">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nilai Promo</p>
                    <p className="font-bold text-[#4d3227]">
                      {promo.type === "Persentase" ? `${promo.value}%` : promo.type === "Nominal" ? `Rp ${promo.value.toLocaleString('id-ID')}` : 'Gratis'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Digunakan</p>
                    <p className="font-bold text-slate-700">{promo.usage} kali</p>
                  </div>
                </div>

                {/* Actions overlay on hover */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-white/90 backdrop-blur-sm border-t border-slate-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex gap-2 z-20">
                  <button onClick={() => handleOpenModal(promo)} className="flex-1 bg-blue-50 text-blue-600 font-bold py-2 rounded-lg text-sm hover:bg-blue-100 transition-colors">Edit</button>
                  <button onClick={() => handleToggleStatus(promo)} className={`flex-1 font-bold py-2 rounded-lg text-sm transition-colors ${promo.status === 'Aktif' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {promo.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              </div>
            ))}
            
            {filteredPromos.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">local_offer</span>
                <p className="font-medium">Tidak ada promo yang ditemukan.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Add/Edit Promo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#4d3227] text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold">{editingPromo ? "Edit Promo" : "Tambah Promo Baru"}</h2>
                <p className="text-sm opacity-80">Atur diskon dan penawaran menarik</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nama Promo</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Diskon 20% Akhir Tahun" className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold focus:border-[#4d3227] outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Kode Kupon</label>
                  <input type="text" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="Contoh: AKHIRTAHUN20" className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold focus:border-[#4d3227] outline-none uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Berlaku Sampai</label>
                  <input type="date" required value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold focus:border-[#4d3227] outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipe Diskon</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold focus:border-[#4d3227] outline-none bg-white">
                    <option value="Persentase">Persentase (%)</option>
                    <option value="Nominal">Nominal (Rp)</option>
                    <option value="Layanan">Layanan (Gratis)</option>
                    <option value="Karyawan">Voucher Karyawan</option>
                  </select>
                </div>
                {(formData.type !== "Layanan" && formData.type !== "Karyawan") && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nilai Diskon</label>
                    <input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} placeholder={formData.type === 'Persentase' ? "Contoh: 20" : "Contoh: 15000"} className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold focus:border-[#4d3227] outline-none" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Min. Pembelian (Opsional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input type="number" value={formData.minPurchase} onChange={e => setFormData({...formData, minPurchase: Number(e.target.value)})} placeholder="0" className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl font-bold focus:border-[#4d3227] outline-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/30">
                  Simpan Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
