import React, { useState } from "react";
import { usePOSContext } from "../../layouts/POSLayout";

interface POSBiayaViewProps {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function POSBiayaView({ onNotify }: POSBiayaViewProps) {
  const { sidebarOpen, setSidebarOpen } = usePOSContext();
  const [search, setSearch] = useState("");

  const initialBiaya = [
    {
      id: "FEE-001",
      name: "Pajak Restoran (PB1)",
      type: "Persentase",
      value: 10,
      applyTo: "Semua Pesanan",
      isActive: true,
      description: "Pajak daerah wajib untuk setiap transaksi FnB."
    },
    {
      id: "FEE-002",
      name: "Service Charge",
      type: "Persentase",
      value: 5,
      applyTo: "Dine-in (Makan di Tempat)",
      isActive: true,
      description: "Biaya layanan khusus pelanggan makan di tempat."
    },
    {
      id: "FEE-003",
      name: "Biaya Kemasan (Takeaway)",
      type: "Nominal",
      value: 3000,
      applyTo: "Bungkus (Takeaway)",
      isActive: false,
      description: "Biaya tambahan untuk paper bag dan cup plastik/kertas."
    },
    {
      id: "FEE-004",
      name: "Biaya Platform Online",
      type: "Persentase",
      value: 20,
      applyTo: "Pesanan Online (GoFood/GrabFood)",
      isActive: true,
      description: "Potongan biaya dari aplikasi pihak ketiga."
    }
  ];

  const [biayaList, setBiayaList] = useState(() => {
    const saved = localStorage.getItem("pos_biaya_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialBiaya;
      }
    }
    return initialBiaya;
  });

  const filteredBiaya = biayaList.filter((b: any) => b.name.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = (id: string, currentStatus: boolean, name: string) => {
    const newList = biayaList.map((b: any) => b.id === id ? { ...b, isActive: !currentStatus } : b);
    setBiayaList(newList);
    localStorage.setItem("pos_biaya_settings", JSON.stringify(newList));
    onNotify(`Biaya "${name}" telah ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}.`, !currentStatus ? 'success' : 'warning');
  };

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
          <span className="font-bold text-xl">Biaya Tambahan</span>
        </div>
        <button 
          onClick={() => onNotify("Menambahkan biaya tambahan baru", "success")}
          className="bg-white text-[#4d3227] px-4 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Biaya Baru
        </button>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        {/* Top Description & Filters */}
        <div className="bg-white p-6 rounded-t-xl border border-slate-200 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shrink-0 mb-1">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Pengaturan Pajak & Biaya</h2>
            <p className="text-sm text-slate-500 mt-1">Kelola pajak (PB1), service charge, dan biaya operasional lainnya.</p>
          </div>
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Cari biaya..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227]"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white border-x border-b border-slate-200 rounded-b-xl p-6">
          <div className="space-y-4 max-w-4xl">
            {filteredBiaya.map((biaya) => (
              <div 
                key={biaya.id} 
                className={`border rounded-xl p-5 transition-all flex flex-col sm:flex-row gap-6 items-start sm:items-center ${
                  biaya.isActive ? "border-blue-200 bg-blue-50/30" : "border-slate-200 bg-slate-50 opacity-70"
                }`}
              >
                
                {/* Status Toggle (Left) */}
                <div className="shrink-0 flex items-center justify-center">
                  <button 
                    onClick={() => handleToggle(biaya.id, biaya.isActive, biaya.name)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      biaya.isActive ? 'bg-[#4d3227]' : 'bg-slate-300'
                    }`}
                  >
                    <span 
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                        biaya.isActive ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Details (Middle) */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`font-bold text-lg ${biaya.isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                      {biaya.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      biaya.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {biaya.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{biaya.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">payments</span>
                      Nilai: <span className="font-bold text-slate-800">{biaya.type === "Persentase" ? `${biaya.value}%` : `Rp ${biaya.value.toLocaleString("id-ID")}`}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">filter_alt</span>
                      Berlaku u/: <span className="font-bold text-slate-800">{biaya.applyTo}</span>
                    </div>
                  </div>
                </div>

                {/* Actions (Right) */}
                <div className="shrink-0 flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                  <button onClick={() => onNotify(`Edit biaya ${biaya.name}`, "info")} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
                    Edit
                  </button>
                </div>

              </div>
            ))}

            {filteredBiaya.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
                <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">search_off</span>
                <p className="font-medium">Tidak ada biaya tambahan yang sesuai dengan pencarian Anda.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
