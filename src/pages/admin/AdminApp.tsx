import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "warning" | "info";
}

export default function AdminApp() {
  const { currentUser } = useAuthStore();
  
  if (!currentUser?.permissions?.admin) {
    return <Navigate to="/pos" replace />;
  }
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
