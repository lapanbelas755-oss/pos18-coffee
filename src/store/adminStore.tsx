import React, { createContext, useContext, useState, ReactNode } from 'react';
import { initialProducts, initialStockItems, initialRecipes, initialWasteLogs, initialTransactions, initialKdsOrders } from '../data';
import { Product, StockItem, RecipeItem, WasteLog, Transaction, KdsOrder } from '../types';

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "warning" | "info";
}

interface AdminState {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  recipes: RecipeItem[];
  setRecipes: React.Dispatch<React.SetStateAction<RecipeItem[]>>;
  wasteLogs: WasteLog[];
  setWasteLogs: React.Dispatch<React.SetStateAction<WasteLog[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  kdsOrders: KdsOrder[]; // Admin needs to view KDS orders for Queue Display / Dashboard
  toasts: ToastNotification[];
  triggerToast: (message: string, type?: "success" | "warning" | "info") => void;
  removeToast: (id: string) => void;
}

const AdminContext = createContext<AdminState | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kdsOrders] = useState<KdsOrder[]>([]);
  
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const triggerToast = (message: string, type: "success" | "warning" | "info" = "success") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <AdminContext.Provider value={{
      products, setProducts,
      stockItems, setStockItems,
      recipes, setRecipes,
      wasteLogs, setWasteLogs,
      transactions, setTransactions,
      kdsOrders,
      toasts, triggerToast, removeToast
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminStore() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdminStore must be used within AdminProvider");
  return context;
}
