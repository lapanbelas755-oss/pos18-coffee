import React, { useState, useEffect } from "react";
import { KdsOrder } from "../types";
import { supabase } from "../lib/supabase";

interface KdsViewProps {
  orders: KdsOrder[];
  setOrders: React.Dispatch<React.SetStateAction<KdsOrder[]>>;
  dailyPrepCount: number;
  setDailyPrepCount: React.Dispatch<React.SetStateAction<number>>;
  onRecallLast: () => void;
  canRecall: boolean;
}

export default function KDSView({
  orders,
  setOrders,
  dailyPrepCount,
  setDailyPrepCount,
  onRecallLast,
  canRecall
}: KdsViewProps) {
  const [sortByWaitTime, setSortByWaitTime] = useState<boolean>(false);
  const [stationFilter, setStationFilter] = useState<"all" | "beverage" | "pastry">("all");

  // Keep ticking the timers in seconds!
  useEffect(() => {
    const timer = setInterval(() => {
      setOrders(prev =>
        prev.map(ord => {
          const nextSecs = ord.timeInSeconds + 1;
          // Dynamically upgrade status based on timer thresholds!
          let nextStatus = ord.status;
          if (nextSecs > 600) {
            nextStatus = "urgent";
          } else if (nextSecs > 240 && ord.status === "incoming") {
            nextStatus = "working";
          }
          return {
            ...ord,
            timeInSeconds: nextSecs,
            status: nextStatus
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [setOrders]);

  const handleToggleItemCheck = (orderId: string, itemId: string) => {
    setOrders(prev => {
      const newOrders = prev.map(ord => {
        if (ord.id === orderId) {
          const updatedItems = ord.items.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          );
          // If checking an item, let's automatically shift from incoming -> working if not already!
          let nextStatus = ord.status;
          if (ord.status === "incoming") {
            nextStatus = "working";
          }
          const updatedOrder = { ...ord, items: updatedItems, status: nextStatus };
          // Optimistic Supabase update
          supabase.from('kds_orders').update({ items: updatedItems, status: nextStatus }).eq('id', orderId).then();
          return updatedOrder;
        }
        return ord;
      });
      return newOrders;
    });
  };

  const handleMarkAsReady = (orderId: string) => {
    const completedOrder = orders.find(o => o.id === orderId);
    if (!completedOrder) return;

    // Trigger complete action
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setDailyPrepCount(c => c + 1);

    // Remove from Supabase
    supabase.from('kds_orders').delete().eq('id', orderId).then();

    // Save to window for simple recall registry
    (window as any)._lastCompletedKdsOrder = completedOrder;
  };

  // Quick helper to format seconds -> m' s'
  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  // Add random realistic order
  const handleAddNewRandomOrder = () => {
    const ticketNum = Math.floor(1000 + Math.random() * 8999).toString();
    const mockOptions = [
      {
        type: "Dine In" as const,
        table: `Meja ${Math.floor(1 + Math.random() * 15).toString().padStart(2, "0")}`,
        items: [
          { id: `kr-${Date.now()}-1`, name: "1x Caramel Frappuccino", checked: false, notes: "Kurang Gula" },
          { id: `kr-${Date.now()}-2`, name: "2x Butter Croissant", checked: false, notes: "Sangat Hangat" }
        ]
      },
      {
        type: "Takeaway" as const,
        items: [
          { id: `kr-${Date.now()}-3`, name: "1x Double Espresso", checked: false, notes: "Panas" },
          { id: `kr-${Date.now()}-4`, name: "1x Peppermint Macchiato", checked: false }
        ]
      },
      {
        type: "Grab Delivery" as const,
        items: [
          { id: `kr-${Date.now()}-5`, name: "3x Signature Cold Brew", checked: false, notes: "Ekstra Vanila" }
        ]
      }
    ];

    const pick = mockOptions[Math.floor(Math.random() * mockOptions.length)];

    const newOrder: KdsOrder = {
      id: ticketNum,
      type: pick.type,
      table: (pick as any).table,
      timeInSeconds: 0,
      status: "incoming",
      items: pick.items
    };

    // Add to Supabase
    supabase.from('kds_orders').insert([newOrder]).then();
    setOrders(prev => [newOrder, ...prev]);
  };

  // Segregate orders by column status
  const incomingOrders = orders.filter(o => o.status === "incoming");
  const workingOrders = orders.filter(o => o.status === "working");
  const urgentOrders = orders.filter(o => o.status === "urgent");

  // Wait time sorter helper
  const processSorted = (arr: KdsOrder[]) => {
    if (sortByWaitTime) {
      return [...arr].sort((a, b) => b.timeInSeconds - a.timeInSeconds);
    }
    return arr;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface-container-low/30 relative">
      {/* KDS Header */}
      <header className="h-20 w-full flex items-center justify-between px-6 py-4 bg-background flex-shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-primary">Dapur - Stasiun Utama</h1>
          <div className="flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Koneksi Aktif</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-on-surface-variant">
          <div className="flex items-center gap-2 mr-4">
            <span className="material-symbols-outlined">timer</span>
            <span className="text-xs font-bold uppercase tracking-wider">Rerata buat: 7m 12s</span>
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-surface-container-low rounded-full transition-all active:scale-90">
              <span className="material-symbols-outlined">location_on</span>
            </button>
            <button className="p-2 hover:bg-surface-container-low rounded-full relative transition-all active:scale-90">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="p-2 hover:bg-surface-container-low rounded-full transition-all active:scale-90">
              <span className="material-symbols-outlined">smart_toy</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface">Chef Michael</p>
              <p className="text-[10px] text-on-surface-variant font-medium">Kepala Stasiun</p>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant bg-surface-variant">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDO8YaFRzesIlA5wabjylRt9nkDFs9teR4yXrU7nO5PsBD1cAwumiKjdnxnPfgH9AIF6iHV1P3pohNbiqTalyysX-Su_JwC6tRGY_x3qmi92bTDvV7sSMT4X8oWO-pdpBMVETDJ80h5d_JW7q5hQXejj3R6h7XVhH2bIyQ51d0RtgN5Xayu2fBYydfTOOBLBCzgAWD8t99azy_jrWsfO2o7qj8f5kQ0cW_5sYM4WLYrv3qSi-lmAUw"
                alt="Chef Michael"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Columns Area */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 custom-scrollbar bg-surface-container-low/50">
        
        {/* COLUMN 1: Antrean Masuk */}
        <div className="flex-shrink-0 w-[340px] flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-on-surface">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
              Antrean Masuk <span className="text-on-surface-variant font-medium">({incomingOrders.length})</span>
            </h2>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar">
            {incomingOrders.length === 0 ? (
              <div className="border border-dashed border-outline-variant/40 rounded-2xl p-6 text-center py-10 text-on-surface-variant/70 text-xs bg-white">
                Tidak ada antrean pesanan
              </div>
            ) : (
              processSorted(incomingOrders).map(ord => (
                <div key={ord.id} className="bg-white rounded-2xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-green-500 flex flex-col gap-4 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">PESANAN #{ord.id}</p>
                      <p className="text-xs text-on-surface-variant font-semibold mt-0.5">{ord.type === "Dine In" ? "Makan di Sini" : ord.type === "Takeaway" ? "Bawa Pulang" : ord.type} {ord.table ? `· ${ord.table}` : ""}</p>
                    </div>
                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded">
                      {formatTime(ord.timeInSeconds)}
                    </span>
                  </div>

                  <ul className="space-y-3 py-2 border-y border-outline-variant/30 text-xs font-medium">
                    {ord.items.map(it => (
                      <li key={it.id} className="flex items-start gap-3 cursor-pointer" onClick={() => handleToggleItemCheck(ord.id, it.id)}>
                        <input
                          type="checkbox"
                          checked={it.checked}
                          onChange={() => {}} // handled by click on li
                          className="mt-0.5 w-4.5 h-4.5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className={it.checked ? "opacity-50 line-through text-on-surface-variant" : "text-on-surface"}>
                          <p className="font-bold text-sm leading-tight">{it.name}</p>
                          {it.notes && <p className="text-[11px] text-on-surface-variant italic mt-0.5 font-normal">• {it.notes}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleMarkAsReady(ord.id)}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Tandai Selesai
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: Sedang Dibuat */}
        <div className="flex-shrink-0 w-[340px] flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-on-surface">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
              Sedang Dibuat <span className="text-on-surface-variant font-medium">({workingOrders.length})</span>
            </h2>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar">
            {workingOrders.length === 0 ? (
              <div className="border border-dashed border-outline-variant/40 rounded-2xl p-6 text-center py-10 text-on-surface-variant/70 text-xs bg-white">
                Tidak ada pembuatan aktif
              </div>
            ) : (
              processSorted(workingOrders).map(ord => (
                <div key={ord.id} className="bg-white rounded-2xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-amber-500 flex flex-col gap-4 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">PESANAN #{ord.id}</p>
                      <p className="text-xs text-on-surface-variant font-semibold mt-0.5">{ord.type === "Dine In" ? "Makan di Sini" : ord.type === "Takeaway" ? "Bawa Pulang" : ord.type} {ord.table ? `· ${ord.table}` : ""}</p>
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded">
                      {formatTime(ord.timeInSeconds)}
                    </span>
                  </div>

                  <ul className="space-y-3 py-2 border-y border-outline-variant/30 text-xs font-medium">
                    {ord.items.map(it => (
                      <li key={it.id} className="flex items-start gap-3 cursor-pointer" onClick={() => handleToggleItemCheck(ord.id, it.id)}>
                        <input
                          type="checkbox"
                          checked={it.checked}
                          onChange={() => {}}
                          className="mt-0.5 w-4.5 h-4.5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                        />
                        <div className={it.checked ? "opacity-50 line-through text-on-surface-variant" : "text-on-surface"}>
                          <p className="font-bold text-sm leading-tight">{it.name}</p>
                          {it.notes && <p className="text-[11px] text-on-surface-variant italic mt-0.5 font-normal">• {it.notes}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleMarkAsReady(ord.id)}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Tandai Selesai
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: Sangat Mendesak */}
        <div className="flex-shrink-0 w-[340px] flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-error">
              <span className="w-2.5 h-2.5 bg-error rounded-full animate-ping"></span>
              Sangat Mendesak <span className="font-extrabold font-sans">({urgentOrders.length})</span>
            </h2>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar">
            {urgentOrders.length === 0 ? (
              <div className="border border-dashed border-outline-variant/40 rounded-2xl p-6 text-center py-10 text-on-surface-variant/70 text-xs bg-white">
                Tidak ada peringatan kritis
              </div>
            ) : (
              processSorted(urgentOrders).map(ord => (
                <div key={ord.id} className="bg-white rounded-2xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border-t-4 border-error flex flex-col gap-4 ring-2 ring-error/10 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-error uppercase tracking-widest">PESANAN #{ord.id}</p>
                      <p className="text-xs text-on-surface-variant font-semibold mt-0.5">{ord.type === "Dine In" ? "Makan di Sini" : ord.type === "Takeaway" ? "Bawa Pulang" : ord.type} {ord.table ? `· ${ord.table}` : ""}</p>
                    </div>
                    <span className="text-[11px] font-bold text-error bg-error/10 px-2.5 py-1 rounded animate-pulse">
                      {formatTime(ord.timeInSeconds)}
                    </span>
                  </div>

                  <ul className="space-y-3 py-2 border-y border-outline-variant/30 text-xs font-medium">
                    {ord.items.map(it => (
                      <li key={it.id} className="flex items-start gap-3 cursor-pointer" onClick={() => handleToggleItemCheck(ord.id, it.id)}>
                        <input
                          type="checkbox"
                          checked={it.checked}
                          onChange={() => {}}
                          className="mt-0.5 w-4.5 h-4.5 rounded border-error text-error focus:ring-error cursor-pointer"
                        />
                        <div className={it.checked ? "opacity-50 line-through text-on-surface-variant" : "text-on-surface"}>
                          <p className="font-bold text-sm leading-tight">{it.name}</p>
                          {it.notes && <p className="text-[11px] text-error/80 italic mt-0.5 font-normal">• {it.notes}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleMarkAsReady(ord.id)}
                    className="w-full bg-error text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Tandai Selesai
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 4: Antrean Siap / Menunggu dalam Slot Kosong */}
        <div className="flex-shrink-0 w-[340px] flex flex-col gap-4 opacity-40">
          <div className="h-full border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-white/20">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">pending_actions</span>
            <p className="font-bold text-xs uppercase tracking-wider text-primary">Antrean Siap</p>
            <p className="text-[10px] text-on-surface-variant mt-1">Menunggu pesanan masuk dari mesin kasir...</p>
          </div>
        </div>
      </div>

      {/* Control Footer */}
      <footer className="h-16 px-6 flex items-center justify-between bg-white border-t border-outline-variant/30 flex-shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setStationFilter("all")}
            className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
              stationFilter === "all" ? "text-primary" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Tampilkan Semua Stasiun
          </button>
          <button
            onClick={() => setSortByWaitTime(!sortByWaitTime)}
            className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ${
              sortByWaitTime ? "text-primary" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-sm">sort</span>
            {sortByWaitTime ? "Waktu Tunggu: Terlama" : "Urutkan Berdasarkan Waktu Tunggu"}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Progres Harian Dapur
            </span>
            <span className="text-[11px] font-bold text-primary mt-0.5">
              {dailyPrepCount}/100 Pesanan
            </span>
          </div>

          <div className="h-2 w-32 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(dailyPrepCount, 100)}%` }}
            ></div>
          </div>

          <button
            onClick={onRecallLast}
            disabled={!canRecall}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              canRecall
                ? "bg-surface-container-high text-primary hover:bg-surface-variant"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            }`}
          >
            Kembalikan Pesanan Terakhir
          </button>
        </div>
      </footer>

      {/* Simulated Quick Action Add Order FAB */}
      <button
        onClick={handleAddNewRandomOrder}
        title="Simulasikan Pesanan Masuk Baru"
        className="fixed bottom-24 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer"
      >
        <span className="material-symbols-outlined">add_task</span>
      </button>
    </div>
  );
}
