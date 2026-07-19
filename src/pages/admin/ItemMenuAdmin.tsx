import React, { useState } from "react";
import { Product, StockItem, RecipeItem } from "../../types";
import { calculateMaxServings } from "../../utils/inventory";
import { supabase } from "../../lib/supabase";

interface ItemMenuAdminProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  stockItems: StockItem[];
  recipes: RecipeItem[];
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function ItemMenuAdmin({ products, setProducts, stockItems, recipes, onNotify }: ItemMenuAdminProps) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Semua");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<Product>>({
    name: "",
    price: 0,
    category: "COFFEE",
    image: "",
    stock: 0,
    sizes: ["M", "L"],
    sugars: ["Normal", "Less", "No Sugar"],
    ices: ["Normal", "Less", "No Ice"],
    moods: ["Hot", "Cold"]
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Product> | null>(null);
  const [iceAddonPrice, setIceAddonPrice] = useState<number>(0);
  
  // State for dynamic variants (sizes/varians)
  const [variants, setVariants] = useState<{name: string, price: number}[]>([]);

  const categories = ["Semua", ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    const matchCat = filterCat === "Semua" || p.category === filterCat;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const getRecipeForProduct = (product: Product) =>
    recipes.find(r => r.name.toLowerCase().includes(product.name.toLowerCase()) || product.name.toLowerCase().includes(r.name.toLowerCase().split(" ")[0]));

  const getMaxServings = (product: Product) => {
    const recipe = getRecipeForProduct(product);
    if (!recipe) return null;
    return calculateMaxServings(recipe, stockItems);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) {
      onNotify("Nama dan Harga harus diisi!", "warning");
      return;
    }
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: newItem.name || "",
      price: Number(newItem.price),
      cogs: Number(newItem.cogs || 0),
      description: newItem.description || "-",
      image: newItem.image || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400&h=400",
      category: newItem.category || "Coffee",
      stock: newItem.stock || 0,
      sizes: variants.map(v => v.name),
      sugars: newItem.sugars || ["Normal", "Less", "No Sugar"],
      ices: newItem.ices || ["Normal", "Less", "No Ice"],
      moods: newItem.moods || ["Hot", "Cold"],
      priceModifiers: {
        ...(iceAddonPrice > 0 ? { "Cold": iceAddonPrice, "Ice": iceAddonPrice } : {}),
        ...variants.reduce((acc, curr) => {
          if (curr.price > 0) acc[curr.name] = curr.price;
          return acc;
        }, {} as Record<string, number>)
      }
    };
    
    // Save to Supabase
    const { error } = await supabase.from('products').insert([{
      id: newProduct.id,
      name: newProduct.name,
      price: newProduct.price,
      cogs: newProduct.cogs,
      description: newProduct.description,
      image: newProduct.image,
      category: newProduct.category,
      stock: newProduct.stock,
      sizes: newProduct.sizes,
      sugars: newProduct.sugars,
      ices: newProduct.ices,
      moods: newProduct.moods,
      price_modifiers: newProduct.priceModifiers
    }]);

    if (error) {
      onNotify("Gagal menambahkan item ke database", "warning");
      console.error(error);
      return;
    }

    setIsAddModalOpen(false);
    onNotify("Item berhasil ditambahkan!", "success");
    setNewItem({
      name: "", price: 0, cogs: 0, category: "COFFEE", image: "", stock: 0,
      sizes: ["M", "L"], sugars: ["Normal", "Less", "No Sugar"],
      ices: ["Normal", "Less", "No Ice"], moods: ["Hot", "Cold"]
    });
    setIceAddonPrice(0);
    setVariants([]);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus menu "${name}"?`)) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      onNotify("Gagal menghapus item", "warning");
      console.error(error);
    } else {
      onNotify("Item berhasil dihapus!", "success");
    }
  };

  const handleEditClick = (item: Product) => {
    setEditingItem(item);
    setIceAddonPrice(item.priceModifiers?.Ice || 0);
    
    // Load variants from sizes and priceModifiers
    const mods = item.priceModifiers || {};
    const loadedVariants = (item.sizes || []).map(size => ({
      name: size,
      price: mods[size] || 0
    }));
    setVariants(loadedVariants);

    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name || !editingItem.price) {
      onNotify("Nama dan Harga harus diisi!", "warning");
      return;
    }

    const updatedModifiers = {
      ...(iceAddonPrice > 0 ? { "Cold": iceAddonPrice, "Ice": iceAddonPrice } : {}),
      ...variants.reduce((acc, curr) => {
        if (curr.price > 0) acc[curr.name] = curr.price;
        return acc;
      }, {} as Record<string, number>)
    };

    const dbPayload = {
      name: editingItem.name,
      price: Number(editingItem.price),
      cogs: Number(editingItem.cogs || 0),
      description: editingItem.description || "-",
      sizes: variants.map(v => v.name),
      price_modifiers: Object.keys(updatedModifiers).length > 0 ? updatedModifiers : null,
      image: editingItem.image,
      category: editingItem.category,
      stock: editingItem.stock,
      sugars: editingItem.sugars,
      ices: editingItem.ices,
      moods: editingItem.moods
    };

    const { error } = await supabase.from('products').update(dbPayload).eq('id', editingItem.id);

    if (error) {
      onNotify("Gagal mengupdate item", "warning");
      console.error(error);
      return;
    }

    // Sync price and recalculate margin to recipes table
    const recipeMatch = recipes.find(r => r.name.toLowerCase() === dbPayload.name.toLowerCase());
    if (recipeMatch) {
      const newMargin = dbPayload.price > 0 ? Math.round(((dbPayload.price - recipeMatch.cogs) / dbPayload.price) * 100) : 0;
      await supabase.from('recipes').update({ sell_price: dbPayload.price, profit_margin: newMargin }).eq('id', recipeMatch.id);
    }

    setIsEditModalOpen(false);
    onNotify("Item berhasil diupdate!", "success");
    setEditingItem(null);
    setIceAddonPrice(0);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto h-full pb-10">

      {/* Top Bar Actions */}
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex gap-2 flex-wrap flex-1">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilterCat(cat)} 
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${filterCat === cat ? "bg-[#4a2d21] text-white border-[#4a2d21]" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => onNotify("Fitur 'Version History' akan segera hadir!", "info")} className="bg-white text-[#4a2d21] border border-[#4a2d21] hover:bg-[#f4ece3] px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
            Version History
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-[#4a2d21] text-white hover:bg-[#382016] px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">

        {/* Search + Count */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100 gap-4">
          <div className="relative w-full max-w-sm">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari item menu..." className="w-full bg-[#f4ece3] border-none rounded-full py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a2d21] text-slate-800 placeholder:text-slate-500" />
            <span className="material-symbols-outlined absolute left-4 top-3 text-slate-500">search</span>
          </div>
          <span className="text-sm font-bold text-slate-600 bg-[#f4ece3] px-4 py-2 rounded-full">{filtered.length} Item Ditemukan</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-700 min-w-[1100px]">
            <thead className="bg-[#fafafa] text-slate-500 font-bold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-5 text-[11px] uppercase tracking-widest whitespace-nowrap">Nama Item</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">SKU</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Item Code</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Kategori</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Status</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-right">Harga Dasar</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Total Stok</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Maks. Porsi</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const servings = getMaxServings(item);
                const hasRecipe = servings !== null;
                const isOutOfStock = hasRecipe ? servings.maxServings === 0 : (item.stock === 0 || item.stock === undefined);
                
                return (
                  <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#f4ece3] rounded-xl overflow-hidden shrink-0 border border-slate-200">
                          {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                        </div>
                        <span className="font-extrabold text-slate-800 text-base">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 text-xs font-mono text-center">A{String(idx + 1).padStart(3, "0")}</td>
                    <td className="p-4 text-slate-500 text-xs font-mono text-center">A{String(idx + 1).padStart(2, "0")}</td>
                    <td className="p-4">
                      <span className="px-3 py-1.5 bg-[#f4ece3] text-[#4a2d21] font-bold text-xs rounded-lg">{item.category}</span>
                    </td>
                    <td className="p-4 text-center">
                      {isOutOfStock
                        ? <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-100">Stok Habis</span>
                        : <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-100 flex items-center justify-center gap-1.5 w-fit mx-auto"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Aktif</span>
                      }
                    </td>
                    <td className="p-4 text-right font-black text-slate-800 text-base">
                      {item.price > 0 ? `Rp ${item.price.toLocaleString("id-ID")}` : "-"}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-800 text-base">
                      {item.stock !== undefined ? item.stock : "-"}
                    </td>
                    <td className="p-4 text-center">
                      {servings ? (
                        servings.maxServings === 0
                          ? <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">0 porsi</span>
                          : <span className={`text-xs font-bold px-2 py-1 rounded ${servings.maxServings < 5 ? "text-yellow-700 bg-yellow-50" : "text-green-700 bg-green-50"}`}>{servings.maxServings} porsi</span>
                      ) : <span className="text-xs text-slate-300">-</span>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditClick(item)} className="p-2 text-[#4a2d21] hover:bg-[#f4ece3] rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-16 text-center text-slate-400 font-medium">Tidak ada item ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-extrabold text-slate-800">Tambah Menu Baru</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Item</label>
                <input 
                  type="text" 
                  required
                  value={newItem.name} 
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  placeholder="Cth: Iced Latte"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                  <select 
                    value={newItem.category} 
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  >
                    <option value="COFFEE">COFFEE</option>
                    <option value="COFFEE MILK">COFFEE MILK</option>
                    <option value="MILK">MILK</option>
                    <option value="TEA">TEA</option>
                    <option value="SIGNATURE">SIGNATURE</option>
                    <option value="FOOD">FOOD</option>
                    <option value="SNACK">SNACK</option>
                    <option value="MINERAL">MINERAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Harga (Rp)</label>
                  <input 
                    type="number" 
                    required
                    value={newItem.price || ""} 
                    onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                    placeholder="Cth: 25000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Initial Stock</label>
                  <input 
                    type="number" 
                    value={newItem.stock || ""} 
                    onChange={e => setNewItem({...newItem, stock: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">HPP / Modal (Rp)</label>
                  <input 
                    type="number" 
                    value={newItem.cogs || ""} 
                    onChange={e => setNewItem({...newItem, cogs: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                    placeholder="Cth: 12000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Image URL</label>
                <input 
                  type="text" 
                  value={newItem.image} 
                  onChange={e => setNewItem({...newItem, image: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Harga Tambahan Ice/Cold (Opsional)</label>
                <input 
                  type="number" 
                  value={iceAddonPrice || ""} 
                  onChange={e => setIceAddonPrice(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  placeholder="Cth: 2000 (jika ice lebih mahal)"
                />
              </div>

              {/* Varian Dinamis */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-slate-700">Varian / Ukuran Dinamis (Opsional)</label>
                  <button type="button" onClick={() => setVariants([...variants, {name: "", price: 0}])} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100">+ Tambah Varian</button>
                </div>
                {variants.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Belum ada varian (misal: Telur, Ayam, Large, dll)</p>
                )}
                <div className="space-y-2">
                  {variants.map((variant, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Nama (Misal: Telur)"
                        value={variant.name}
                        onChange={e => {
                          const newV = [...variants];
                          newV[idx].name = e.target.value;
                          setVariants(newV);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4a2d21]"
                      />
                      <input 
                        type="number"
                        placeholder="Harga Tambahan (0)"
                        value={variant.price || ""}
                        onChange={e => {
                          const newV = [...variants];
                          newV[idx].price = Number(e.target.value);
                          setVariants(newV);
                        }}
                        className="w-32 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4a2d21]"
                      />
                      <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 rounded-xl font-bold bg-[#4a2d21] text-white hover:bg-[#382016] shadow-md transition-all active:scale-95"
                >
                  Simpan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-extrabold text-slate-800">Edit Menu Item</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Item</label>
                <input 
                  type="text" 
                  required
                  value={editingItem.name || ""} 
                  onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                  <select 
                    value={editingItem.category || "Coffee"} 
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  >
                    <option value="COFFEE">COFFEE</option>
                    <option value="COFFEE MILK">COFFEE MILK</option>
                    <option value="MILK">MILK</option>
                    <option value="TEA">TEA</option>
                    <option value="SIGNATURE">SIGNATURE</option>
                    <option value="FOOD">FOOD</option>
                    <option value="SNACK">SNACK</option>
                    <option value="MINERAL">MINERAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Harga (Rp)</label>
                  <input 
                    type="number" 
                    required
                    value={editingItem.price || ""} 
                    onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Stock</label>
                  <input 
                    type="number" 
                    value={editingItem.stock || ""} 
                    onChange={e => setEditingItem({...editingItem, stock: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">HPP / Modal (Rp)</label>
                  <input 
                    type="number" 
                    value={editingItem.cogs || ""} 
                    onChange={e => setEditingItem({...editingItem, cogs: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Image URL</label>
                <input 
                  type="text" 
                  value={editingItem.image || ""} 
                  onChange={e => setEditingItem({...editingItem, image: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Harga Tambahan Ice/Cold (Opsional)</label>
                <input 
                  type="number" 
                  value={iceAddonPrice || ""} 
                  onChange={e => setIceAddonPrice(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all"
                  placeholder="Cth: 2000 (jika ice lebih mahal)"
                />
              </div>

              {/* Varian Dinamis */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-slate-700">Varian / Ukuran Dinamis (Opsional)</label>
                  <button type="button" onClick={() => setVariants([...variants, {name: "", price: 0}])} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100">+ Tambah Varian</button>
                </div>
                {variants.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Belum ada varian (misal: Telur, Ayam, Large, dll)</p>
                )}
                <div className="space-y-2">
                  {variants.map((variant, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Nama (Misal: Telur)"
                        value={variant.name}
                        onChange={e => {
                          const newV = [...variants];
                          newV[idx].name = e.target.value;
                          setVariants(newV);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4a2d21]"
                      />
                      <input 
                        type="number"
                        placeholder="Harga Tambahan (0)"
                        value={variant.price || ""}
                        onChange={e => {
                          const newV = [...variants];
                          newV[idx].price = Number(e.target.value);
                          setVariants(newV);
                        }}
                        className="w-32 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4a2d21]"
                      />
                      <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 rounded-xl font-bold bg-[#4a2d21] text-white hover:bg-[#382016] shadow-md transition-all active:scale-95"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
