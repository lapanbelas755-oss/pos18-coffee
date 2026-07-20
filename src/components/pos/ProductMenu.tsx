import React, { useState } from "react";
import { Product } from "../../types";
import { usePosStore } from "../../store/posStore";


interface ProductMenuProps {
  products: Product[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  search: string;
  setSearch: (s: string) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductMenu({
  products,
  selectedCategory,
  setSelectedCategory,
  search,
  setSearch,
  onAddToCart
}: ProductMenuProps) {
  const [showSearch, setShowSearch] = useState(false);
  const { triggerToast } = usePosStore();

  // Ekstrak kategori unik dari produk
  const rawCategories = Array.from(new Set(products.map(p => p.category)));
  const standardOrder = ["COFFEE", "NON-COFFEE", "COFFEE MILK", "SIGNATURE", "TEA", "MILK", "FOOD", "SNACK", "MINERAL"];
  
  const sortedCategories = rawCategories.sort((a, b) => {
    const indexA = standardOrder.indexOf(a.toUpperCase().trim());
    const indexB = standardOrder.indexOf(b.toUpperCase().trim());
    
    // Jika keduanya ada di standardOrder, urutkan berdasarkan posisinya
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // Jika hanya A yang ada, A didahulukan
    if (indexA !== -1) return -1;
    // Jika hanya B yang ada, B didahulukan
    if (indexB !== -1) return 1;
    // Jika keduanya tidak ada, urutkan sesuai abjad
    return a.localeCompare(b);
  });

  const categories = ["Semua", ...sortedCategories];

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === "Semua" || p.category === selectedCategory;
    const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto overflow-y-hidden custom-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap shrink-0 transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-primary/40 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right Tools */}
          <div className="flex items-center gap-2 shrink-0">

            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showSearch ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors relative cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </div>
          </div>
        </div>

        {/* Search Bar (toggled) */}
        {showSearch && (
          <div className="relative">
            <input
              autoFocus
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Subtitel jumlah produk */}
      <div className="px-6 py-2 text-xs text-slate-400 font-medium">
        {filteredProducts.length} produk {selectedCategory !== "Semua" ? `dalam "${selectedCategory}"` : ""}
      </div>

      {/* Product Grid */}
      <div className="flex-1 px-5 pb-5 overflow-y-auto custom-scrollbar">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <span className="material-symbols-outlined text-5xl">search_off</span>
            <p className="text-sm font-medium">Produk tidak ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredProducts.map(prod => {
              const isOutOfStock = prod.stock === 0;
              return (
                <div
                  key={prod.id}
                  onClick={() => !isOutOfStock && onAddToCart(prod)}
                  className={`group bg-white rounded-xl overflow-hidden border border-slate-200 flex flex-col transition-all ${
                    isOutOfStock
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 active:scale-95"
                  }`}
                >
                  <div className="aspect-square w-full relative bg-slate-100 overflow-hidden">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className={`w-full h-full object-cover ${!isOutOfStock && "group-hover:scale-110 transition-transform duration-500"}`}
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-300 text-4xl">image</span>
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                          Stok Habis
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 flex flex-col flex-1">
                    <h3 className="font-bold text-xs text-slate-800 leading-tight mb-1 line-clamp-2">{prod.name}</h3>
                    <p className="font-bold text-xs text-primary mt-auto">
                      {prod.price > 0 ? `Rp ${prod.price.toLocaleString("id-ID")}` : "Harga Fleksibel"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
