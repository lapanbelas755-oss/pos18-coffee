import React, { createContext, useContext, useState, ReactNode } from 'react';
import { initialProducts, initialKdsOrders, initialTables, initialOrders } from '../data';
import { CartItem, KdsOrder, Order, TableData, Product, Promo } from '../types';

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "warning" | "info";
}

export type KdsRouteType = "barista" | "kitchen" | "none";

interface PosState {
  products: Product[];
  setProducts: (fn: (prev: Product[]) => Product[]) => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  kdsOrders: KdsOrder[];
  setKdsOrders: React.Dispatch<React.SetStateAction<KdsOrder[]>>;
  tables: TableData[];
  setTables: (fn: (prev: TableData[]) => TableData[]) => void;
  posOrders: Order[];
  setPosOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  activeTableId: string | null;
  setActiveTableId: React.Dispatch<React.SetStateAction<string | null>>;
  dailyPrepCount: number;
  setDailyPrepCount: React.Dispatch<React.SetStateAction<number>>;
  toasts: ToastNotification[];
  triggerToast: (message: string, type?: "success" | "warning" | "info") => void;
  removeToast: (id: string) => void;
  kdsRouting: Record<string, KdsRouteType>;
  setKdsRouting: React.Dispatch<React.SetStateAction<Record<string, KdsRouteType>>>;
  promos: Promo[];
  setPromos: (fn: (prev: Promo[]) => Promo[]) => void;
  connectedPrinters: { kasir: boolean; barista: boolean; dapur: boolean };
  setPrinterConnected: (role: "kasir" | "barista" | "dapur", status: boolean) => void;
}

const PosContext = createContext<PosState | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [kdsOrders, setKdsOrders] = useState<KdsOrder[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [posOrders, setPosOrders] = useState<Order[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [dailyPrepCount, setDailyPrepCount] = useState(75);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [connectedPrinters, setConnectedPrintersState] = useState({ kasir: false, barista: false, dapur: false });
  const setPrinterConnected = (role: "kasir" | "barista" | "dapur", status: boolean) => {
    setConnectedPrintersState(prev => ({ ...prev, [role]: status }));
  };
  const [kdsRouting, setKdsRouting] = useState<Record<string, KdsRouteType>>(() => {
    const saved = localStorage.getItem('pos_kds_routing');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Default mapping: Kopi/Non-Kopi -> barista, Makanan/Snack -> kitchen, etc.
    const initialMap: Record<string, KdsRouteType> = {};
    initialProducts.forEach(p => {
      if (!initialMap[p.category]) {
        if (p.category.toLowerCase().includes('kopi') || p.category.toLowerCase().includes('minuman')) {
          initialMap[p.category] = 'barista';
        } else if (p.category.toLowerCase().includes('makanan') || p.category.toLowerCase().includes('snack') || p.category.toLowerCase().includes('roti')) {
          initialMap[p.category] = 'kitchen';
        } else {
          initialMap[p.category] = 'barista'; // default
        }
      }
    });
    return initialMap;
  });

  const [promos, setPromosState] = useState<Promo[]>(() => {
    const saved = localStorage.getItem('pos_promos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const setPromos = (fn: (prev: Promo[]) => Promo[]) => {
    setPromosState((prev) => {
      const next = fn(prev);
      localStorage.setItem('pos_promos', JSON.stringify(next));
      return next;
    });
  };

  // Persist promos whenever it changes
  React.useEffect(() => {
    localStorage.setItem('pos_promos', JSON.stringify(promos));
  }, [promos]);

  // Persist kdsRouting whenever it changes
  React.useEffect(() => {
    localStorage.setItem('pos_kds_routing', JSON.stringify(kdsRouting));
  }, [kdsRouting]);

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
    <PosContext.Provider value={{
      products,
      cart, setCart,
      kdsOrders, setKdsOrders,
      tables, setTables,
      posOrders, setPosOrders,
      activeTableId, setActiveTableId,
      dailyPrepCount, setDailyPrepCount,
      toasts, triggerToast, removeToast,
      kdsRouting, setKdsRouting,
      promos, setPromos,
      connectedPrinters, setPrinterConnected,
      setProducts
    }}>
      {children}
    </PosContext.Provider>
  );
}

export function usePosStore() {
  const context = useContext(PosContext);
  if (!context) throw new Error("usePosStore must be used within PosProvider");
  return context;
}
