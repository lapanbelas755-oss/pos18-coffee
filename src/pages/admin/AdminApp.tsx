import React, { useState, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import { initialStockItems, initialRecipes, initialWasteLogs, initialTransactions, initialKdsOrders, initialOrders } from "../../data";
import { Product, StockItem, RecipeItem, WasteLog, Transaction, KdsOrder, Order, TableData } from "../../types";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

import DashboardAdmin from "./DashboardAdmin";
import ItemMenuAdmin from "./ItemMenuAdmin";
import OrderAdmin from "./OrderAdmin";
import InventoryAdmin from "./InventoryAdmin";
import FinanceAdmin from "./FinanceAdmin";
import RecipeAdmin from "./RecipeAdmin";
import QueueDisplayAdmin from "./QueueDisplayAdmin";

import ReportAdmin from "./ReportAdmin";
import EmployeeAdmin from "./EmployeeAdmin";

function AdminPinLogin({ onAuthorized }: { onAuthorized: () => void }) {
  const navigate = useNavigate();
  const { employees } = useAuthStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleKey = useCallback((digit: string) => {
    if (pin.length >= 4) return;
    setError('');
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      const user = employees.find(e => e.pin === nextPin && e.status === 'Aktif');
      if (!user) {
        setError('PIN tidak dikenali atau akun nonaktif');
        setShake(true);
        setTimeout(() => { setShake(false); setPin(''); }, 600);
        return;
      }

      if (user.role !== 'Manajer' && user.role !== 'Admin') {
        setError('Akses ditolak. Hanya Manajer atau Owner yang diizinkan.');
        setShake(true);
        setTimeout(() => { setShake(false); setPin(''); }, 600);
        return;
      }

      onAuthorized();
    }
  }, [pin, employees, onAuthorized]);

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-800 to-amber-950 rounded-2xl flex items-center justify-center shadow-xl">
          <span className="text-white font-black text-xl">18</span>
        </div>
        <p className="text-slate-800 font-extrabold text-sm tracking-wide">POS18 Coffee</p>
      </div>

      <div className={`bg-white border border-slate-200/80 rounded-3xl p-8 w-full max-w-sm shadow-2xl transition-all ${shake ? 'animate-shake' : ''}`}>
        <div className="flex flex-col items-center mb-6 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-2">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <h2 className="text-slate-800 font-black text-lg">Akses Area Admin</h2>
          <p className="text-slate-500 text-xs text-center mt-1">Masukkan PIN khusus Owner atau Manajer</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {dots.map((filled, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${filled ? 'bg-amber-600 border-amber-600 scale-125' : 'bg-transparent border-slate-300'}`} />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-500 text-xs font-bold mb-4 px-2">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} onClick={() => handleKey(d)}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 font-bold text-lg transition-all duration-100 border border-slate-200/50 shadow-sm">
              {d}
            </button>
          ))}
          <button onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-500 font-bold transition-all duration-100 flex items-center justify-center border border-slate-200/50 shadow-sm">
            <span className="material-symbols-outlined text-lg">backspace</span>
          </button>
          <button onClick={() => handleKey('0')}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 font-bold text-lg transition-all duration-100 border border-slate-200/50 shadow-sm">
            0
          </button>
          <button onClick={() => {}} disabled={true}
            className="h-14 rounded-2xl bg-slate-100 text-slate-400 active:scale-95 font-bold transition-all duration-100 flex items-center justify-center cursor-not-allowed">
            <span className="material-symbols-outlined text-xl">lock</span>
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex justify-center">
          <button onClick={() => navigate('/pos')} className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Kembali ke POS
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "warning" | "info";
}

export default function AdminApp() {
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(() => {
    return localStorage.getItem("admin_authorized") === "true";
  });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kdsOrders] = useState<KdsOrder[]>([]);
  const [posOrders, setPosOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const triggerToast = (message: string, type: "success" | "warning" | "info" = "success") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  React.useEffect(() => {
    // --- Helper: fetch all data on mount ---
    const fetchAll = async () => {
      const [productsRes, transactionsRes, stockRes, wasteRes, recipesRes, ordersRes, tablesRes] = await Promise.all([
        supabase.from('products').select('*').order('id'),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('stock_items').select('*').order('sku'),
        supabase.from('waste_logs').select('*').order('id'),
        supabase.from('recipes').select('*').order('id'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('tables').select('*').order('id'),
      ]);

      if (productsRes.data) {
        setProducts(productsRes.data.map(p => ({ ...p, priceModifiers: p.price_modifiers })));
      }
      if (transactionsRes.data) setTransactions(transactionsRes.data);
      if (stockRes.data) {
        setStockItems(stockRes.data.map(s => ({ ...s, stockLevel: s.stock_level, minStock: s.min_stock, unitCost: s.unit_cost })));
      }
      if (wasteRes.data) setWasteLogs(wasteRes.data);
      if (recipesRes.data) {
        setRecipes(recipesRes.data.map(r => ({
          ...r,
          cogs: r.cogs,
          sellPrice: r.sell_price,
          profitMargin: r.profit_margin,
          lastUpdated: r.last_updated,
        })));
      }
      if (ordersRes.data) {
        setPosOrders(ordersRes.data);
      }
      if (tablesRes.data) {
        setTables(tablesRes.data);
      }
    };
    fetchAll();

    // --- Realtime subscriptions ---
    const productsSub = supabase.channel('products-admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchAll())
      .subscribe();

    const transactionsSub = supabase.channel('transactions-admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchAll())
      .subscribe();

    const stockSub = supabase.channel('stock-admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => fetchAll())
      .subscribe();

    const wasteSub = supabase.channel('waste-admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waste_logs' }, () => fetchAll())
      .subscribe();

    const recipesSub = supabase.channel('recipes-admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => fetchAll())
      .subscribe();

    const ordersSub = supabase.channel('orders-admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(productsSub);
      supabase.removeChannel(transactionsSub);
      supabase.removeChannel(stockSub);
      supabase.removeChannel(wasteSub);
      supabase.removeChannel(recipesSub);
      supabase.removeChannel(ordersSub);
    };
  }, []);

  if (!isAdminAuthorized) {
    return (
      <AdminPinLogin onAuthorized={() => {
        setIsAdminAuthorized(true);
        localStorage.setItem("admin_authorized", "true");
      }} />
    );
  }

  return (
    <>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 max-w-lg w-[90%]">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-4 border text-xs font-bold transition-all animate-fade-in ${t.type === "success" ? "bg-emerald-900 text-white border-emerald-800" : t.type === "warning" ? "bg-amber-900 text-white border-amber-800" : "bg-[#4d3227] text-white border-[#3a251d]"}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">{t.type === "success" ? "check_circle" : t.type === "warning" ? "warning" : "info"}</span>
              <span>{t.message}</span>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-white hover:opacity-60 text-base font-extrabold w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">×</button>
          </div>
        ))}
      </div>

      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardAdmin transactions={transactions} products={products} posOrders={posOrders} />} />
          <Route path="menu" element={<ItemMenuAdmin products={products} setProducts={setProducts} stockItems={stockItems} recipes={recipes} onNotify={triggerToast} />} />
          <Route path="orders" element={<OrderAdmin posOrders={posOrders} tables={tables} />} />
          <Route path="inventory" element={<InventoryAdmin stockItems={stockItems} setStockItems={setStockItems} wasteLogs={wasteLogs} setWasteLogs={setWasteLogs} onNotify={triggerToast} />} />
          <Route path="finance" element={<FinanceAdmin transactions={transactions} setTransactions={setTransactions} onNotify={triggerToast} />} />
          <Route path="recipes" element={<RecipeAdmin recipes={recipes} setRecipes={setRecipes} stockItems={stockItems} onNotify={triggerToast} />} />
          <Route path="queue-display" element={<QueueDisplayAdmin />} />
          <Route path="report" element={<ReportAdmin orders={posOrders} recipes={recipes} stockItems={stockItems} />} />
          <Route path="employees" element={<EmployeeAdmin />} />
        </Route>
      </Routes>
    </>
  );
}
