import React, { useState, useEffect } from "react";
import { Product } from "../../types";
import { supabase } from "../../lib/supabase";

interface POSItemViewProps {
  products: Product[];
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
  onUpdateProduct?: (updated: Product) => void;
}

interface EditForm {
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

export default function POSItemView({ products, onNotify, onUpdateProduct }: POSItemViewProps) {
  const [activeTab, setActiveTab] = useState("Daftar Item");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [activeDropdown, setActiveDropdown] = useState<string | number | null>(null);

  // Edit modal state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", category: "", price: 0, stock: 0, description: "", image: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-menu-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const categories = ["Semua Kategori", ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "Semua Kategori" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const openEditModal = (product: Product) => {
    setEditProduct(product);
    setEditForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock ?? 0,
      description: product.description || "",
      image: product.image || "",
    });
    setActiveDropdown(null);
  };

  const closeEditModal = () => {
    setEditProduct(null);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editForm.name,
          category: editForm.category,
          price: editForm.price,
          stock: editForm.stock,
          description: editForm.description,
          image: editForm.image,
        })
        .eq('id', editProduct.id);

      if (error) throw error;

      const updated: Product = { ...editProduct, ...editForm };
      onUpdateProduct?.(updated);
      onNotify(`Item "${editForm.name}" berhasil diperbarui`, "success");
      closeEditModal();
    } catch (err: any) {
      onNotify("Gagal menyimpan: " + (err.message || "Unknown error"), "warning");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">

      {/* Header */}
      <div className="bg-[#4d3227] text-white flex items-center justify-between px-6 py-4 shadow-md z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">Item</span>
          </div>
          <div className="w-px h-6 bg-white/20"></div>
          <div className="flex gap-6">
            <span className="font-bold border-b-2 border-white pb-1">Daftar Item</span>
          </div>
        </div>
        <button
          onClick={() => onNotify("Menu ini dalam pengembangan. Anda dapat menambah item melalui Admin Dashboard.", "info")}
          className="bg-white text-[#4d3227] px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-100 transition-colors"
        >
          Tambah Item
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Secondary Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col pt-4">
          <button
            onClick={() => setActiveTab("Daftar Item")}
            className={`flex items-center gap-3 px-6 py-4 transition-colors ${activeTab === "Daftar Item"
                ? "bg-slate-50 text-[#4d3227] font-bold border-r-4 border-[#4d3227]"
                : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            <span className="material-symbols-outlined text-xl">list_alt</span>
            Daftar Item
          </button>
          <button
            onClick={() => setActiveTab("Kategori")}
            className={`flex items-center gap-3 px-6 py-4 transition-colors ${activeTab === "Kategori"
                ? "bg-slate-50 text-[#4d3227] font-bold border-r-4 border-[#4d3227]"
                : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            <span className="material-symbols-outlined text-xl">category</span>
            Kategori
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-t-xl border border-slate-200 flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder="Pencarian Item"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227]"
              />
            </div>

            <div className="ml-auto flex gap-4">
              <div className="relative">
                <select className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-slate-600 focus:outline-none focus:border-[#4d3227] min-w-[160px]">
                  <option>Semua Status</option>
                  <option>Aktif</option>
                  <option>Non-aktif</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
              </div>

              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-slate-600 focus:outline-none focus:border-[#4d3227] min-w-[160px]"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#5c3e31] text-white">
                    <th className="px-6 py-3 font-semibold text-sm">Nama Item</th>
                    <th className="px-6 py-3 font-semibold text-sm">Kategori</th>
                    <th className="px-6 py-3 font-semibold text-sm">Sinkronisasi</th>
                    <th className="px-6 py-3 font-semibold text-sm">Status</th>
                    <th className="px-6 py-3 font-semibold text-sm">Harga Dasar</th>
                    <th className="px-6 py-3 font-semibold text-sm">Stok</th>
                    <th className="px-6 py-3 font-semibold text-sm w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                          <span className="font-medium text-slate-700">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500 uppercase tracking-wide">
                        {product.category}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        Ideshop, Idepos, <br /> Idekiosk
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className="text-sm font-medium text-emerald-600">Aktif</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 font-medium">
                        Rp {product.price.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {product.stock ?? "-"}
                      </td>
                      <td className="px-6 py-3 relative action-menu-container">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === product.id ? null : product.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>

                        {activeDropdown === product.id && (
                          <div className="absolute right-10 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                            <button
                              onClick={() => openEditModal(product)}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px] text-[#4d3227]">edit</span>
                              Edit Item
                            </button>
                            <div className="my-1 border-t border-slate-100"></div>
                            <button
                              onClick={() => {
                                setActiveDropdown(null);
                                onNotify("Fitur Hapus dalam pengembangan", "info");
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              Hapus Item
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        Tidak ada item yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

            {/* Modal Header */}
            <div className="bg-[#4d3227] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-[22px]">edit</span>
                <h2 className="text-white font-bold text-lg">Edit Item</h2>
              </div>
              <button
                onClick={closeEditModal}
                className="text-white/70 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">

              {/* Preview gambar */}
              {editForm.image && (
                <div className="flex justify-center mb-2">
                  <img
                    src={editForm.image}
                    alt="Preview"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-[#4d3227]/20 shadow"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Nama Item</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227] text-sm"
                  placeholder="Nama item..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Kategori</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227] text-sm"
                  placeholder="Kategori..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Harga (Rp)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227] text-sm"
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Stok</label>
                  <input
                    type="number"
                    value={editForm.stock}
                    onChange={e => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227] text-sm"
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Deskripsi</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227] text-sm resize-none"
                  placeholder="Deskripsi item..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">URL Gambar</label>
                <input
                  type="text"
                  value={editForm.image}
                  onChange={e => setEditForm({ ...editForm, image: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227] text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={closeEditModal}
                className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-[#4d3227] text-white text-sm font-bold hover:bg-[#3d2820] transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      1    </div>
  );
}
