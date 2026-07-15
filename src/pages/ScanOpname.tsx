import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { StockItem, Product } from "../types";

export default function ScanOpname() {
  const { department } = useParams<{ department: string }>();
  const { login, logout, currentUser } = useAuthStore();
  const navigate = useNavigate();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Track physical inputs
  const [actualStocks, setActualStocks] = useState<Record<string, number>>({});
  const [actualProducts, setActualProducts] = useState<Record<string, number>>({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isKitchen = department?.toLowerCase() === "kitchen";
  const isBarista = department?.toLowerCase() === "barista";

  // Categories
  const kitchenCats = ["FOOD", "SNACK", "MAKANAN", "DAGING", "SAYUR", "BUMBU", "FROZEN FOOD", "AYAM", "FROZEN", "BAKMIE", "MIE INDOMIE", "BUAH", "GARNIS"];
  const baristaCats = ["COFFEE", "COFFEE MILK", "MILK", "TEA", "SIGNATURE", "BIJI KOPI", "SUSU", "SYRUP", "POWDER", "BUAH", "GARNIS"];

  useEffect(() => {
    if (currentUser) {
      const role = currentUser.role.toLowerCase();
      const isAdmin = role === "admin" || role === "manajer";
      const hasAccess = isAdmin || (isKitchen && role === "chef") || (isBarista && role === "barista");
      
      if (!hasAccess) {
        logout();
        setError(`Akses ditolak! ${currentUser.role} tidak dapat mengakses Opname ${isKitchen ? 'Dapur' : 'Barista'}.`);
      } else {
        loadData();
      }
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const success = await login(pin);
      if (!success) {
        setError("PIN Salah atau Karyawan tidak ditemukan.");
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const validCats = isKitchen ? kitchenCats : (isBarista ? baristaCats : []);
    
    // Fetch stock items (Bahan Baku)
    const { data: stockData } = await supabase.from('stock_items').select('*');
    if (stockData) {
      const filtered = stockData.filter(s => validCats.includes((s.category || "").toUpperCase()));
      const mapped = filtered.map(s => ({
        ...s, stockLevel: s.stock_level, minStock: s.min_stock, unitCost: s.unit_cost
      })) as StockItem[];
      setStockItems(mapped);
      
      const stMap: Record<string, number> = {};
      mapped.forEach(s => stMap[s.sku] = s.stockLevel);
      setActualStocks(stMap);
    }

    // Fetch products (For Cara 2 without recipes)
    const { data: prodData } = await supabase.from('products').select('*');
    if (prodData) {
      const filteredP = prodData.filter(p => validCats.includes((p.category || "").toUpperCase()));
      const mappedP = filteredP.map(p => ({
        ...p, priceModifiers: p.price_modifiers
      })) as Product[];
      setProducts(mappedP);

      const prMap: Record<string, number> = {};
      mappedP.forEach(p => prMap[p.id] = p.stock || 0);
      setActualProducts(prMap);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update Stock Items
      for (const sku in actualStocks) {
        const item = stockItems.find(s => s.sku === sku);
        if (item && item.stockLevel !== actualStocks[sku]) {
          const newStatus = actualStocks[sku] < (item.minStock || 0) ? 'Low Stock' : 'Healthy';
          await supabase.from('stock_items')
            .update({ stock_level: actualStocks[sku], status: newStatus })
            .eq('sku', sku);
        }
      }

      // Update Products
      for (const pid in actualProducts) {
        const p = products.find(p => p.id === pid);
        if (p && (p.stock || 0) !== actualProducts[pid]) {
          await supabase.from('products')
            .update({ stock: actualProducts[pid] })
            .eq('id', pid);
        }
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Gagal menyimpan stok");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isKitchen && !isBarista) {
    return <div className="p-8 text-center text-red-500 font-bold">Departemen tidak valid.</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#faf6f3] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-[#4a2d21]">Opname {isKitchen ? "Dapur" : "Bar"}</h1>
            <p className="text-sm text-slate-500">Silakan masukkan PIN Anda</p>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN Karyawan"
              className="text-center text-2xl font-black tracking-[0.5em] w-full px-4 py-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21]"
              required
            />
            {error && <p className="text-sm text-red-500 text-center font-bold">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4a2d21] text-white font-bold py-4 rounded-xl shadow-md disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf6f3] flex flex-col">
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="font-black text-lg text-[#4a2d21]">Opname {isKitchen ? "Dapur" : "Bar"}</h1>
          <p className="text-xs text-slate-500 font-bold">Hi, {currentUser.name}</p>
        </div>
        <button 
          onClick={logout}
          className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg"
        >
          Keluar
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="text-center py-10 text-slate-400 font-bold">Memuat data stok...</div>
        ) : (
          <div className="flex flex-col gap-6">
            
            {/* BAHAN BAKU */}
            {stockItems.length > 0 && (
              <div>
                <h2 className="font-bold text-slate-700 mb-3 border-b pb-2 uppercase text-sm tracking-wider">Bahan Baku</h2>
                <div className="flex flex-col gap-3">
                  {stockItems.map(item => (
                    <div key={item.sku} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 leading-tight">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-1">Sistem: {item.stockLevel} {item.unit}</p>
                      </div>
                      <div className="w-24 ml-4">
                        <input
                          type="number"
                          value={actualStocks[item.sku] ?? ""}
                          onChange={(e) => setActualStocks(prev => ({...prev, [item.sku]: Number(e.target.value)}))}
                          className="w-full text-center font-black text-lg bg-slate-50 border border-slate-200 rounded-lg py-2 focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRODUK LANGSUNG */}
            {products.length > 0 && (
              <div>
                <h2 className="font-bold text-slate-700 mb-3 border-b pb-2 uppercase text-sm tracking-wider mt-4">Produk Siap Jual</h2>
                <div className="flex flex-col gap-3">
                  {products.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 leading-tight">{p.name}</p>
                        <p className="text-xs text-slate-400 mt-1">Sistem: {p.stock || 0} Pcs</p>
                      </div>
                      <div className="w-24 ml-4">
                        <input
                          type="number"
                          value={actualProducts[p.id] ?? ""}
                          onChange={(e) => setActualProducts(prev => ({...prev, [p.id]: Number(e.target.value)}))}
                          className="w-full text-center font-black text-lg bg-slate-50 border border-slate-200 rounded-lg py-2 focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stockItems.length === 0 && products.length === 0 && (
              <div className="text-center py-10 text-slate-400 font-medium text-sm">
                Tidak ada barang di departemen ini.
              </div>
            )}

          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={isSaving || loading}
          className={`w-full py-4 rounded-xl font-black text-white shadow-lg transition-all ${
            savedSuccess ? "bg-green-500" : "bg-[#4a2d21] hover:bg-[#3a2218]"
          } disabled:opacity-50`}
        >
          {isSaving ? "Menyimpan..." : savedSuccess ? "✓ Berhasil Disimpan!" : "Simpan & Sesuaikan Stok"}
        </button>
      </div>
    </div>
  );
}
