import React, { useState } from "react";
import { Transaction } from "../../types";
import { supabase } from "../../lib/supabase";

interface FinanceAdminProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

const EMPTY_TX: Omit<Transaction, "id"> = {
  date: new Date().toLocaleDateString("id-ID"),
  title: "",
  category: "",
  status: "Cleared",
  amount: 0,
  type: "inflow"
};

export default function FinanceAdmin({ transactions, setTransactions, onNotify }: FinanceAdminProps) {
  const [filter, setFilter] = useState<"semua" | "inflow" | "outflow">("semua");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showHppModal, setShowHppModal] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase.from('recipes').select('*').order('name');
      if (data) {
        setRecipes(data.map(r => ({
          name: r.name,
          cogs: r.cogs || 0,
          sellPrice: r.sell_price || 0,
          profitMargin: r.profit_margin || 0
        })));
      }
    };
    if (showHppModal) {
      fetchRecipes();
    }
  }, [showHppModal]);

  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<Omit<Transaction, "id">>(EMPTY_TX);
  const [receiptUrl, setReceiptUrl] = useState("");
  
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState("Semua Kategori");

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));

  const filtered = transactions.filter(t => {
    const matchFilter = filter === "semua" ? true : t.type === filter;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "Semua Kategori" ? true : t.category === filterCategory;
    
    // Parse Date
    const parts = t.date.split(/[\/\-]/);
    let txDate = new Date();
    if(parts.length === 3) {
       txDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);
    const matchDate = txDate >= start && txDate <= end;

    return matchFilter && matchSearch && matchCategory && matchDate;
  });

  const totalPendapatan = filtered.filter(t => t.type === "inflow").reduce((s, t) => s + t.amount, 0);
  const totalPengeluaran = filtered.filter(t => t.type === "outflow").reduce((s, t) => s + t.amount, 0);
  const laba = totalPendapatan - totalPengeluaran;

  const openAdd = () => { setEditTx(null); setForm(EMPTY_TX); setReceiptUrl(""); setShowModal(true); };
  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    let title = tx.title;
    let url = "";
    const match = title.match(/(.*) \[NOTA: (.*)\]$/);
    if (match) {
       title = match[1];
       url = match[2];
    }
    setForm({ date: tx.date, title, category: tx.category, status: tx.status, amount: tx.amount, type: tx.type });
    setReceiptUrl(url);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { onNotify("Judul transaksi wajib diisi!", "warning"); return; }
    
    const finalTitle = receiptUrl.trim() ? `${form.title} [NOTA: ${receiptUrl.trim()}]` : form.title;
    const finalForm = { ...form, title: finalTitle };

    if (editTx) {
      setTransactions(prev => prev.map(t => t.id === editTx.id ? { ...editTx, ...finalForm } : t));
      const { error } = await supabase.from('transactions').update(finalForm).eq('id', editTx.id);
      if (error) { onNotify("Gagal memperbarui transaksi!", "warning"); return; }
      onNotify("Transaksi berhasil diperbarui!");
    } else {
      const newTx = { id: `tx-${Date.now()}`, ...finalForm };
      setTransactions(prev => [newTx, ...prev]);
      const { error } = await supabase.from('transactions').insert([newTx]);
      if (error) { onNotify("Gagal menambahkan transaksi!", "warning"); return; }
      onNotify("Transaksi berhasil ditambahkan!");
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Yakin hapus transaksi "${title}"?`)) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) { onNotify("Gagal menghapus transaksi!", "warning"); return; }
      onNotify(`Transaksi "${title}" dihapus.`, "info");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto h-full pb-10">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Pendapatan", val: totalPendapatan, color: "text-green-600 bg-green-50" },
          { label: "Total Pengeluaran", val: totalPengeluaran, color: "text-red-600 bg-red-50" },
          { label: "Laba Bersih", val: laba, color: `${laba >= 0 ? "text-[#4a2d21] bg-[#f4ece3]" : "text-slate-600 bg-slate-100"}` },
        ].map((c, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
            <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">{c.label}</p>
            <p className={`text-2xl font-black ${c.color} px-4 py-2 rounded-2xl inline-block shadow-inner`}>
              Rp {c.val.toLocaleString("id-ID")}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        
        {/* Top Row: Type Filters & Global Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            {(["semua", "inflow", "outflow"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2.5 rounded-full text-sm font-bold border transition-colors ${filter === f ? "bg-[#4a2d21] text-white border-[#4a2d21]" : "bg-[#fcfaf8] border-slate-200 text-slate-600 hover:bg-[#f4ece3] hover:border-[#4a2d21]/20"}`}>
                {f === "semua" ? "Semua" : f === "inflow" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={() => setShowHppModal(true)}
              className="bg-[#f4ece3] hover:bg-[#e8dccb] text-[#4a2d21] px-5 py-3 rounded-2xl font-black text-sm shadow-sm transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">request_quote</span>
              Laporan HPP
            </button>
            <button onClick={openAdd} className="bg-[#4a2d21] text-white hover:bg-[#382016] px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Tambah Transaksi
            </button>
          </div>
        </div>

        {/* Bottom Row: Date & Category Filters */}
        <div className="flex items-center gap-4 flex-wrap pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 bg-[#fcfaf8] p-2 rounded-2xl border border-slate-200 flex-1 min-w-[250px] max-w-sm">
            <div className="flex flex-col w-full">
              <label className="text-[10px] uppercase font-bold text-slate-400 px-2">Dari Tanggal</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none px-2 w-full" />
            </div>
            <span className="text-slate-300">-</span>
            <div className="flex flex-col w-full">
              <label className="text-[10px] uppercase font-bold text-slate-400 px-2">Sampai Tanggal</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none px-2 w-full" />
            </div>
          </div>
          
          <div className="relative min-w-[200px]">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full appearance-none bg-[#fcfaf8] border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
              <option value="Semua Kategori">Semua Kategori</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none">expand_more</span>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul transaksi..." className="w-full bg-[#fcfaf8] border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" />
            <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-[20px]">search</span>
          </div>
        </div>

      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="overflow-auto custom-scrollbar h-full">
          <table className="w-full text-left text-sm text-slate-700 min-w-[900px]">
            <thead className="bg-[#fafafa] text-slate-500 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-5 text-[11px] uppercase tracking-widest whitespace-nowrap">Tanggal</th>
                <th className="p-5 text-[11px] uppercase tracking-widest w-1/3">Judul</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Kategori</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Tipe</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Status</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-right">Jumlah</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, idx) => (
                <tr key={tx.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                  <td className="p-5 text-slate-500 text-xs font-bold">{tx.date}</td>
                  <td className="p-5 font-black text-slate-800 text-base">
                    {tx.title.replace(/ \[NOTA: (.*)\]$/, "")}
                    {tx.title.match(/ \[NOTA: (.*)\]$/) && (
                      <a href={tx.title.match(/ \[NOTA: (.*)\]$/)![1]} target="_blank" rel="noreferrer" className="ml-2 text-[10px] font-bold bg-[#f4ece3] text-[#4a2d21] px-2 py-1 rounded-md hover:underline inline-flex items-center gap-1 align-middle">
                        <span className="material-symbols-outlined text-[12px]">receipt</span>
                        Lihat Nota
                      </a>
                    )}
                  </td>
                  <td className="p-5 text-slate-600 font-medium">{tx.category}</td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${tx.type === "inflow" ? "bg-green-50 text-green-700 border-green-100" : "bg-[#f4ece3] text-[#4a2d21] border-[#e8dccb]"}`}>
                      {tx.type === "inflow" ? "Pemasukan" : "Pengeluaran"}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${tx.status === "Cleared" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-yellow-50 text-yellow-700 border-yellow-100"}`}>
                      {tx.status === "Cleared" ? "Selesai" : "Tertunda"}
                    </span>
                  </td>
                  <td className={`p-5 text-right font-black text-lg ${tx.type === "inflow" ? "text-green-600" : "text-[#4a2d21]"}`}>
                    {tx.type === "inflow" ? "+" : "-"} Rp {tx.amount.toLocaleString("id-ID")}
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEdit(tx)} className="p-2 text-[#4a2d21] hover:bg-[#f4ece3] rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(tx.id, tx.title)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-16 text-center text-slate-400 font-medium">Tidak ada transaksi ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg p-8 flex flex-col gap-6">
            <h3 className="font-extrabold text-2xl text-slate-800">{editTx ? "Edit Transaksi" : "Tambah Transaksi"}</h3>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Judul</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" placeholder="Contoh: Pembelian Biji Kopi" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Tanggal</label>
                <input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Kategori</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21] appearance-none">
                  <option value="" disabled>Pilih Kategori</option>
                  <option value="Bar">Bar</option>
                  <option value="Dapur">Dapur (Kitchen)</option>
                  <option value="Lainnya">Lainnya</option>
                  <option value="Bahan Baku">Bahan Baku</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Payroll">Payroll</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Jumlah (Rp)</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Tipe</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as Transaction["type"] }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21] appearance-none">
                  <option value="inflow">Pemasukan</option>
                  <option value="outflow">Pengeluaran</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Transaction["status"] }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21] appearance-none">
                  <option value="Cleared">Selesai</option>
                  <option value="Pending">Tertunda</option>
                </select>
              </div>
              <div className="col-span-2 p-4 bg-[#fcfaf8] border border-slate-200 rounded-xl">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                  Link / URL Nota Bukti Belanja (Opsional)
                </label>
                <input 
                  value={receiptUrl} 
                  onChange={e => setReceiptUrl(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" 
                  placeholder="https://drive.google.com/..." 
                />
                <p className="text-[10px] text-slate-400 mt-2">Untuk memudahkan pengecekan, Anda bisa melampirkan link foto nota dari Google Drive, Imgur, dsb.</p>
              </div>
            </div>
            <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-[#fcfaf8] hover:bg-[#f4ece3] rounded-2xl font-black text-sm text-slate-600 transition-colors">Batal</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-[#4a2d21] hover:bg-[#382016] text-white rounded-2xl font-black text-sm shadow-md transition-colors">Simpan Transaksi</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Laporan HPP */}
      {showHppModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl p-8 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-2xl text-slate-800">Laporan Harga Pokok Penjualan (HPP)</h3>
              <button onClick={() => setShowHppModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#4a2d21] text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[10px] rounded-tl-xl">Item Menu</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[10px] text-right">Modal (COGS)</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[10px] text-right">Harga Jual</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[10px] text-right">Laba / Item</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[10px] text-center rounded-tr-xl">Margin (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                        Tidak ada data resep / sedang memuat...
                      </td>
                    </tr>
                  ) : (
                    recipes.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-4 font-extrabold text-slate-800">{r.name}</td>
                        <td className="px-4 py-4 text-right font-medium text-red-600">Rp {r.cogs.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-4 text-right font-black text-slate-800">Rp {r.sellPrice.toLocaleString("id-ID")}</td>
                        <td className="px-4 py-4 text-right font-black text-green-600">Rp {Math.max(0, r.sellPrice - r.cogs).toLocaleString("id-ID")}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold text-xs">{r.profitMargin}%</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
