import React, { useState, useEffect } from "react";
import { Order } from "../../types";

export default function TvQueueApp() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Function to load orders from localStorage
    const loadOrders = () => {
      try {
        const storedOrders = JSON.parse(localStorage.getItem("tv_queue_orders") || "[]");
        setOrders(storedOrders);
      } catch (e) {
        console.error("Failed to parse TV Queue orders", e);
      }
    };

    // Initial load
    loadOrders();

    // Listen for storage events (when POS updates the localStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "tv_queue_orders") {
        loadOrders();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also set up an interval just in case storage events are missed 
    // or if the user is testing in the same window
    const interval = setInterval(loadOrders, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Filter orders
  // Sedang Disiapkan (Preparing): Unpaid / Pending
  // Silakan Ambil (Ready): Ready
  const preparingOrders = orders.filter(o => o.status === "Pending" || o.status === "Unpaid");
  const readyOrders = orders.filter(o => o.status === "Ready" || o.status === "Selesai").slice(0, 10); // Show max 10 ready orders so it doesn't overflow infinitely

  const getDisplayName = (order: Order) => {
    if (order.customerName) return order.customerName;
    if (order.queue) return `Antrian ${order.queue}`;
    return order.id;
  };

  return (
    <div className="h-screen w-full bg-slate-900 text-white flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <header className="bg-slate-950 px-8 py-6 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-4xl text-[#4d3227]">coffee</span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">LapanbelasCoffee</h1>
            <p className="text-slate-400 text-sm font-bold tracking-widest mt-1 uppercase">Order Status Display</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-300">
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Preparing */}
        <div className="flex-1 flex flex-col border-r border-slate-800">
          <div className="bg-slate-800/50 py-4 px-8 text-center shrink-0">
            <h2 className="text-3xl font-extrabold tracking-widest text-slate-300">SEDANG DISIAPKAN</h2>
            <p className="text-slate-400 font-medium">Preparing</p>
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto hide-scrollbar">
            <div className="grid grid-cols-2 gap-6">
              {preparingOrders.map(order => (
                <div key={order.id} className="bg-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center border border-slate-700 shadow-lg animate-in fade-in zoom-in duration-300">
                  <span className="text-4xl font-extrabold text-slate-200 text-center line-clamp-1 w-full break-all">
                    {getDisplayName(order)}
                  </span>
                  {order.table && order.type !== "Take Out" && (
                    <span className="mt-3 bg-slate-700 px-4 py-1.5 rounded-full text-slate-300 font-bold text-sm">
                      Meja {order.table}
                    </span>
                  )}
                </div>
              ))}
              {preparingOrders.length === 0 && (
                <div className="col-span-2 text-center py-20 text-slate-500 font-medium text-xl">
                  Tidak ada antrian saat ini
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ready */}
        <div className="flex-1 flex flex-col">
          <div className="bg-[#4d3227]/20 py-4 px-8 text-center shrink-0">
            <h2 className="text-3xl font-extrabold tracking-widest text-green-400">SILAKAN AMBIL</h2>
            <p className="text-green-500/70 font-medium">Please Collect</p>
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto hide-scrollbar relative">
            <div className="grid grid-cols-1 gap-6">
              {readyOrders.map((order, idx) => (
                <div key={order.id} className={`rounded-2xl p-6 flex items-center justify-between border shadow-2xl animate-in slide-in-from-left duration-500 ${
                  idx === 0 
                    ? "bg-green-500/20 border-green-500/50 scale-100" 
                    : "bg-slate-800 border-slate-700 scale-95 opacity-80"
                }`}>
                  <div className="flex flex-col">
                    <span className={`font-extrabold ${idx === 0 ? "text-6xl text-green-400" : "text-4xl text-slate-200"}`}>
                      {getDisplayName(order)}
                    </span>
                    {order.table && (
                      <span className="mt-2 text-slate-400 font-bold text-lg">
                        Meja {order.table}
                      </span>
                    )}
                  </div>
                  
                  {idx === 0 && (
                    <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                      <span className="material-symbols-outlined text-5xl text-white">notifications_active</span>
                    </div>
                  )}
                </div>
              ))}
              {readyOrders.length === 0 && (
                <div className="text-center py-20 text-slate-500 font-medium text-xl">
                  Belum ada pesanan yang siap
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Footer ticker (Optional) */}
      <div className="bg-slate-950 p-3 text-center text-slate-500 text-sm font-medium border-t border-slate-800 shrink-0">
        Terima kasih telah mengunjungi LapanbelasCoffee. Harap siapkan struk pembayaran saat mengambil pesanan.
      </div>

    </div>
  );
}
