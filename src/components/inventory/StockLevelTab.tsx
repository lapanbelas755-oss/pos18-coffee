import React, { useState } from "react";
import { StockItem, WasteLog } from "../../types";
import { supabase } from "../../lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { useAuthStore } from "../../store/authStore";
import { sendTelegramMessage } from "../../lib/telegram";

interface Props {
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  wasteLogs?: WasteLog[];
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

const EMPTY_STOCK: StockItem = {
  sku: "",
  name: "",
  category: "Bahan Baku Minuman",
  quantity: "0",
  unit: "Kilogram",
  warehouse: "Penyimpanan Utama",
  status: "Healthy",
  stockLevel: 100,
  image: "",
  unitCost: 0,
};

export default function StockLevelTab({ stockItems, setStockItems, wasteLogs = [], onNotify }: Props) {
  const { currentUser } = useAuthStore();
  const [search, setSearch] = useState("");
  const [activeDepartment, setActiveDepartment] = useState("Semua Departemen");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [form, setForm] = useState<StockItem>(EMPTY_STOCK);

  // Kalkulator HPP State
  const [calcPrice, setCalcPrice] = useState<number | "">("");
  const [calcQty, setCalcQty] = useState<number | "">("");

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);

  // QR Print State
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrItem, setSelectedQrItem] = useState<StockItem | null>(null);

  // History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<StockItem | null>(null);

  const baristaCats = ["Bahan Baku Minuman", "Bahan Pendukung Minuman", "Operasional", "Kemasan"];
  const kitchenCats = ["Bahan Baku Makanan", "Frozen", "Bakmie", "Mie Indomie", "Buah", "Daging", "Garnis"];

  const displayedCategories = ["Semua"];
  if (activeDepartment === "Barista" || activeDepartment === "Semua Departemen") displayedCategories.push(...baristaCats);
  if (activeDepartment === "Kitchen" || activeDepartment === "Semua Departemen") displayedCategories.push(...kitchenCats);
  if (activeDepartment === "Semua Departemen") displayedCategories.push("Lainnya");

  const filtered = stockItems.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "Semua" || s.category.toLowerCase().includes(activeCategory.toLowerCase());

    let matchDepartment = true;
    if (activeDepartment === "Barista" && activeCategory === "Semua") {
      matchDepartment = baristaCats.some(c => s.category.toLowerCase().includes(c.toLowerCase()));
    } else if (activeDepartment === "Kitchen" && activeCategory === "Semua") {
      matchDepartment = kitchenCats.some(c => s.category.toLowerCase().includes(c.toLowerCase()));
    }

    return matchSearch && matchCategory && matchDepartment;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const displayedItems = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSimulateScan = () => {
    // Simulate reading a QR code that contains the SKU "DM-OAT-552"
    const scannedSku = "DM-OAT-552";
    const foundItem = stockItems.find(s => s.sku === scannedSku);

    setIsScanning(false);

    if (foundItem) {
      onNotify(`QR Code terdeteksi! Barang: ${foundItem.name}`, "success");
      openEdit(foundItem);
    } else {
      onNotify(`QR Code terdeteksi SKU baru: ${scannedSku}`, "info");
      setEditingItem(null);
      setForm({ ...EMPTY_STOCK, sku: scannedSku });
      setShowModal(true);
    }
  };

  const handleQuickAdd = async (item: StockItem) => {
    const currentQty = parseFloat(item.quantity) || 0;
    const newQty = currentQty + 10;
    const currentStockLevel = item.stockLevel || 0;
    let maxCapacity = 500;
    if (currentQty > 0 && currentStockLevel > 0) {
      maxCapacity = currentQty / (currentStockLevel / 100);
    }
    const newStockLevel = Math.min(100, Math.max(0, (newQty / maxCapacity) * 100));
    setStockItems(prev => prev.map(s => s.sku === item.sku ? { ...s, quantity: `${newQty}`, stockLevel: newStockLevel } : s));
    await supabase.from('stock_items').update({ quantity: `${newQty}`, stock_level: newStockLevel }).eq('sku', item.sku);

    const user = currentUser?.name || "Sistem";
    const newLog: WasteLog = {
      id: `HST-${Date.now()}`,
      item: item.name,
      sku: item.sku,
      quantity: 10,
      unit: item.unit,
      reason: "Penyesuaian Stok (Edit)",
      notes: `Isi Cepat (+10). Stok diubah dari ${currentQty} menjadi ${newQty}.`,
      cost: 0,
      user: user,
      date: new Date().toLocaleDateString('id-ID'),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB"
    };
    await supabase.from('waste_logs').insert([newLog]);
    
    // Telegram Notification
    const telegramMsg = `🔄 <b>STOCK ADJUSTMENT</b> 🔄\n\n👤 <b>Oleh:</b> ${user}\n📦 <b>Barang:</b> ${item.name}\n📊 <b>Stok Awal:</b> ${currentQty} ${item.unit}\n📈 <b>Stok Baru:</b> ${newQty} ${item.unit} (+10)\n📝 <b>Catatan:</b> Isi Cepat`;
    sendTelegramMessage(telegramMsg);

    onNotify(`Berhasil menambahkan 10 ${item.unit} ke ${item.name}`, "success");
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_STOCK, sku: `SKU-${Date.now().toString().slice(-4)}` });
    setCalcPrice("");
    setCalcQty("");
    setShowModal(true);
  };

  const openEdit = (item: StockItem) => {
    setEditingItem(item);
    setForm(item);
    setCalcPrice("");
    setCalcQty("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) {
      onNotify("Nama dan SKU harus diisi!", "warning");
      return;
    }
    const currentQty = parseFloat(form.quantity) || 0;
    let maxCapacity = 500;
    if (editingItem) {
      const origQty = parseFloat(editingItem.quantity) || 0;
      const origLevel = editingItem.stockLevel || 0;
      if (origQty > 0 && origLevel > 0) maxCapacity = origQty / (origLevel / 100);
    }
    const newStockLevel = Math.min(100, Math.max(0, (currentQty / maxCapacity) * 100));
    const updatedForm = { ...form, stockLevel: newStockLevel };
    const dbPayload = {
      sku: updatedForm.sku, name: updatedForm.name, category: updatedForm.category,
      stock: updatedForm.stock, stock_level: updatedForm.stockLevel, quantity: updatedForm.quantity,
      warehouse: updatedForm.warehouse, unit: updatedForm.unit, status: updatedForm.status,
      image: updatedForm.image, min_stock: updatedForm.minStock,
      unit_cost: updatedForm.unitCost ?? 0
    };
    if (editingItem) {
      setStockItems(prev => prev.map(s => s.sku === editingItem.sku ? updatedForm : s));
      const { error } = await supabase.from('stock_items').update(dbPayload).eq('sku', editingItem.sku);
      if (error) { onNotify("Gagal memperbarui stok!", "warning"); return; }
      
      const origQty = parseFloat(editingItem.quantity) || 0;
      const newQty = parseFloat(updatedForm.quantity) || 0;
      if (origQty !== newQty) {
        const user = currentUser?.name || "Sistem";
        const newLog: WasteLog = {
          id: `HST-${Date.now()}`,
          item: updatedForm.name,
          sku: updatedForm.sku,
          quantity: Math.abs(newQty - origQty),
          unit: updatedForm.unit,
          reason: "Penyesuaian Stok (Edit)",
          notes: `Stok diubah dari ${origQty} menjadi ${newQty}.`,
          cost: 0,
          user: user,
          date: new Date().toLocaleDateString('id-ID'),
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB"
        };
        await supabase.from('waste_logs').insert([newLog]);

        // Telegram Notification
        const telegramMsg = `🔄 <b>STOCK ADJUSTMENT</b> 🔄\n\n👤 <b>Oleh:</b> ${user}\n📦 <b>Barang:</b> ${updatedForm.name}\n📊 <b>Stok Awal:</b> ${origQty} ${updatedForm.unit}\n📈 <b>Stok Baru:</b> ${newQty} ${updatedForm.unit}\n📝 <b>Catatan:</b> Edit Manual`;
        sendTelegramMessage(telegramMsg);
      }
      
      onNotify("Data stok berhasil diperbarui!", "success");
    } else {
      if (stockItems.some(s => s.sku === form.sku)) { onNotify("SKU sudah digunakan!", "warning"); return; }
      setStockItems(prev => [updatedForm, ...prev]);
      const { error } = await supabase.from('stock_items').insert([dbPayload]);
      if (error) { onNotify("Gagal menambahkan stok!", "warning"); return; }
      onNotify("Data stok berhasil ditambahkan!", "success");
    }
    setShowModal(false);
  };

  const handleDelete = async (sku: string, name: string) => {
    if (confirm(`Yakin ingin menghapus stok "${name}"?`)) {
      setStockItems(prev => prev.filter(s => s.sku !== sku));
      const { error } = await supabase.from('stock_items').delete().eq('sku', sku);
      if (error) { onNotify("Gagal menghapus stok!", "warning"); return; }
      onNotify("Data stok berhasil dihapus!", "success");
    }
  };

  const getStatusColor = (category: string) => {
    if (category.toLowerCase().includes("kopi")) return "bg-green-500";
    if (category.toLowerCase().includes("susu")) return "bg-slate-800";
    if (category.toLowerCase().includes("sirup")) return "bg-blue-500";
    return "bg-amber-500";
  };

  const getProgressVal = (item: StockItem) => {
    if (item.stockLevel && item.stockLevel <= 100) return item.stockLevel;
    const num = parseFloat(item.quantity) || 0;
    return Math.min(100, Math.max(0, (num / 500) * 100));
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Department Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        {["Semua Departemen", "Barista", "Kitchen"].map(dept => (
          <button
            key={dept}
            onClick={() => { setActiveDepartment(dept); setActiveCategory("Semua"); setPage(1); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeDepartment === dept
                ? "bg-white text-[#4a2d21] shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full max-w-sm">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari stok berdasarkan nama, SKU..."
            className="w-full bg-[#f4ece3] border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#4a2d21] text-slate-800 placeholder:text-slate-500"
          />
          <span className="material-symbols-outlined absolute left-4 top-3 text-slate-500">search</span>
        </div>
        <div className="flex gap-2 flex-wrap flex-1 md:justify-end">
          {displayedCategories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setPage(1); }}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors border ${activeCategory === cat
                  ? "bg-[#4a2d21] text-white border-[#4a2d21]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-[#f4ece3] hover:border-[#4a2d21]/20"
                }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setIsScanning(true)}
            className="px-5 py-2.5 rounded-full text-sm font-bold transition-colors border bg-[#f4ece3] text-[#4a2d21] border-transparent hover:bg-[#e8dccb] flex items-center gap-2 shadow-sm ml-2"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            Scan QR
          </button>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 rounded-full text-sm font-bold transition-colors border bg-[#4a2d21] text-white border-[#4a2d21] hover:bg-[#382016] flex items-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Stok
          </button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedItems.map(item => {
          const progress = getProgressVal(item);
          return (
            <div key={item.sku} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group">

              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => { setSelectedQrItem(item); setShowQrModal(true); }} className="bg-white/90 backdrop-blur text-blue-600 hover:bg-white p-2 rounded-xl shadow-md transition-colors" title="Cetak QR Code">
                  <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                </button>
                <button onClick={() => { setSelectedHistoryItem(item); setShowHistoryModal(true); }} className="bg-white/90 backdrop-blur text-purple-600 hover:bg-white p-2 rounded-xl shadow-md transition-colors" title="Riwayat Edit">
                  <span className="material-symbols-outlined text-[18px]">history</span>
                </button>
                <button onClick={() => openEdit(item)} className="bg-white/90 backdrop-blur text-[#4a2d21] hover:bg-white p-2 rounded-xl shadow-md transition-colors">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onClick={() => handleDelete(item.sku, item.name)} className="bg-white/90 backdrop-blur text-red-600 hover:bg-white p-2 rounded-xl shadow-md transition-colors">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>

              <div className="p-6 pb-4 flex gap-5 items-start">
                <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden bg-[#f4ece3] flex-shrink-0 relative">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl">image</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-3 h-3 rounded-full ${getStatusColor(item.category)}`}></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.category}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-lg leading-tight mb-2">{item.name}</h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit font-mono">{item.sku}</span>
                </div>
              </div>

              <div className="px-6 py-5 border-t border-slate-100 border-dashed">
                <div className="flex justify-between items-end mb-3">
                  <span className="font-bold text-slate-700 text-sm">Tingkat Stok ({Math.round(progress)}%)</span>
                  <span className="font-black text-[#4a2d21] text-base">{item.quantity} <span className="text-sm text-slate-500">{item.unit === "Kilogram" ? "kg" : item.unit}</span></span>
                </div>
                <div className="w-full h-3 bg-[#f4ece3] rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full rounded-full ${progress < 20 ? 'bg-red-500' : 'bg-[#4a2d21]'}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="px-6 py-5 mt-auto border-t border-slate-100 border-dashed flex justify-between items-center bg-[#fafcf5]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Gudang Penyimpanan</span>
                  <span className="font-black text-slate-800 text-sm">{item.warehouse}</span>
                </div>
                <button
                  onClick={() => handleQuickAdd(item)}
                  className="bg-[#f4ece3] hover:bg-[#e8dccb] text-[#4a2d21] px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">add_box</span>
                  Isi (+10)
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayedItems.length === 0 && (
        <div className="py-20 flex justify-center items-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-200 border-dashed">
          Tidak ada barang ditemukan.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex justify-between items-center mt-2 shadow-sm">
          <span className="font-bold text-slate-600 text-sm">
            Menampilkan {displayedItems.length} dari {filtered.length} barang
          </span>
          <div className="flex items-center gap-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-5 py-2.5 bg-[#f4ece3] hover:bg-[#e8dccb] disabled:opacity-50 disabled:hover:bg-[#f4ece3] text-[#4a2d21] font-black text-sm rounded-xl transition-colors"
            >
              Sebelumnya
            </button>
            <span className="font-black text-slate-800 text-sm">
              Hal {page} / {totalPages || 1}
            </span>
            <button
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(p => p + 1)}
              className="px-5 py-2.5 bg-[#f4ece3] hover:bg-[#e8dccb] disabled:opacity-50 disabled:hover:bg-[#f4ece3] text-[#4a2d21] font-black text-sm rounded-xl transition-colors"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      {/* Modal QR Scanner */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-6">
            <div className="flex justify-between w-full items-center">
              <h3 className="font-extrabold text-2xl text-[#4a2d21]">Scan QR Code</h3>
              <button onClick={() => setIsScanning(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-sm font-bold text-slate-500 text-center">Arahkan kamera ke QR Code atau Barcode pada kemasan barang.</p>

            {/* Mock Camera View */}
            <div className="relative w-full aspect-square bg-slate-800 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center border-4 border-slate-100">
              {/* Corner markers */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-[#4a2d21] rounded-tl-xl"></div>
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-[#4a2d21] rounded-tr-xl"></div>
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-[#4a2d21] rounded-bl-xl"></div>
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-[#4a2d21] rounded-br-xl"></div>

              {/* Scanning Laser Animation */}
              <div className="absolute w-[80%] h-0.5 bg-red-500 shadow-[0_0_15px_4px_rgba(239,68,68,0.5)] animate-[bounce_2s_infinite]"></div>

              <span className="material-symbols-outlined text-slate-500 text-6xl opacity-30">qr_code_scanner</span>
            </div>

            <button
              onClick={handleSimulateScan}
              className="w-full py-4 bg-[#4a2d21] hover:bg-[#382016] text-white rounded-2xl font-black text-sm shadow-md transition-colors mt-2"
            >
              Simulasikan Scan Berhasil (Oat Milk)
            </button>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="font-extrabold text-2xl text-slate-800">{editingItem ? "Edit Stok Barang" : "Tambah Stok Barang"}</h3>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Nama Barang</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" placeholder="Contoh: Biji Kopi Arabica" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">SKU</label>
                <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} disabled={!!editingItem} className="w-full bg-[#fcfaf8] border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-600 focus:outline-none disabled:opacity-70" placeholder="SKU-XXXX" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Kategori</label>
                <div className="relative">
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
                    <option value="Bahan Baku Minuman">Bahan Baku Minuman</option>
                    <option value="Bahan Pendukung Minuman">Bahan Pendukung Minuman</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Kemasan">Kemasan</option>
                    <option value="Bahan Baku Makanan">Bahan Baku Makanan</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Bakmie">Bakmie</option>
                    <option value="Mie Indomie">Mie Indomie</option>
                    <option value="Buah">Buah</option>
                    <option value="Daging">Daging</option>
                    <option value="Garnis">Garnis</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-500 pointer-events-none">expand_more</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Jumlah Awal / Saat Ini</label>
                <input type="number" step="any" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Satuan (Unit)</label>
                <div className="relative">
                  <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
                    <option value="Kilogram">Kilogram</option>
                    <option value="Gram">Gram</option>
                    <option value="Liter">Liter</option>
                    <option value="Ml">Ml</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-500 pointer-events-none">expand_more</span>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Gudang / Penyimpanan</label>
                <input value={form.warehouse} onChange={e => setForm(p => ({ ...p, warehouse: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" placeholder="Contoh: Gudang Belakang" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">URL Gambar (Opsional)</label>
                <input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" placeholder="https://..." />
              </div>
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <label className="text-[10px] uppercase tracking-widest font-bold text-amber-700 mb-1 block">⚡ Kalkulator Harga Pokok (HPP) Resep</label>
                <p className="text-[10px] text-amber-600 mb-3">Masukkan total harga beli dan jumlah untuk menghitung harga per satuan (gram/ml) otomatis.</p>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-amber-700 mb-1 block">Harga Beli Total (Rp)</label>
                    <input
                      type="number" step="any"
                      value={calcPrice}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setCalcPrice(val || "");
                        if (val && calcQty) {
                          const multiplier = (form.unit === "Kilogram" || form.unit === "Liter") ? 1000 : 1;
                          setForm(p => ({ ...p, unitCost: val / (Number(calcQty) * multiplier) }));
                        }
                      }}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Misal: 240000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-700 mb-1 block">Untuk Berapa {form.unit}?</label>
                    <input
                      type="number" step="any"
                      value={calcQty}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setCalcQty(val || "");
                        if (val && calcPrice) {
                          const multiplier = (form.unit === "Kilogram" || form.unit === "Liter") ? 1000 : 1;
                          setForm(p => ({ ...p, unitCost: Number(calcPrice) / (val * multiplier) }));
                        }
                      }}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Misal: 1"
                    />
                  </div>
                </div>

                <div className="bg-white border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Harga per {form.unit === "Kilogram" ? "Gram" : form.unit === "Liter" ? "Ml" : form.unit}:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      step="any"
                      value={form.unitCost ?? ''}
                      onChange={e => setForm(p => ({ ...p, unitCost: Number(e.target.value) }))}
                      className="bg-transparent border-none text-right font-black text-slate-800 focus:outline-none w-24"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-[#fcfaf8] hover:bg-[#f4ece3] rounded-2xl font-black text-sm text-slate-600 transition-colors">Batal</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-[#4a2d21] hover:bg-[#382016] text-white rounded-2xl font-black text-sm shadow-md transition-colors">Simpan Data</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Print Modal */}
      {showQrModal && selectedQrItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h3 className="font-black text-xl text-slate-800 mb-2">Cetak Label QR</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6 text-center">Scan stiker ini menggunakan Kamera HP di fitur Ambil Stok.</p>

            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-300 mb-6 flex flex-col items-center gap-4" id="print-qr-area">
              <QRCodeSVG value={selectedQrItem.sku} size={200} level="H" includeMargin={true} />
              <div className="text-center">
                <p className="font-bold text-slate-800">{selectedQrItem.name}</p>
                <p className="text-slate-500 font-mono text-sm">{selectedQrItem.sku}</p>
              </div>
            </div>

            <div className="flex gap-4 w-full">
              <button onClick={() => setShowQrModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">Batal</button>
              <button
                onClick={() => {
                  const printContent = document.getElementById('print-qr-area')?.innerHTML;
                  if (printContent) {
                    const printWindow = window.open('', '', 'width=400,height=600');
                    if (printWindow) {
                      printWindow.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:20px;">${printContent}</body></html>`);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                    }
                  }
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Cetak
              </button>
            </div>
          </div>
        </div>
      )}
      {/* History Modal */}
      {showHistoryModal && selectedHistoryItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-xl text-slate-800">Riwayat Edit Stok</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3 mb-6 p-4 bg-[#fcfaf8] border border-slate-200 rounded-2xl">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                {selectedHistoryItem.image ? (
                  <img src={selectedHistoryItem.image} alt={selectedHistoryItem.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><span className="material-symbols-outlined text-2xl">image</span></div>
                )}
              </div>
              <div>
                <p className="font-bold text-slate-800">{selectedHistoryItem.name}</p>
                <p className="text-xs font-mono text-slate-500">{selectedHistoryItem.sku}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
              {wasteLogs.filter(w => w.sku === selectedHistoryItem.sku && w.reason === "Penyesuaian Stok (Edit)").length > 0 ? (
                wasteLogs.filter(w => w.sku === selectedHistoryItem.sku && w.reason === "Penyesuaian Stok (Edit)").slice().reverse().map((log, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 text-sm">Oleh: {log.user || "Sistem"}</span>
                      <span className="text-[10px] font-bold text-slate-400">{log.date || ''} &middot; {log.time}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed bg-[#f4ece3]/50 p-2 rounded-lg border border-slate-100 font-medium">
                      {log.notes}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-200 rounded-2xl">
                  Belum ada riwayat edit stok.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
