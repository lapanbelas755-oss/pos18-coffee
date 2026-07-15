import React, { useState, useMemo } from "react";
import { Order, TableData } from "../../types";
import { supabase } from "../../lib/supabase";
import ManagerAuthModal from "../../components/pos/ManagerAuthModal";
import PaymentModal from "../../components/pos/PaymentModal";

interface POSOrdersHistoryViewProps {
  posOrders: Order[];
  setPosOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  tables: TableData[];
  setTables: React.Dispatch<React.SetStateAction<TableData[]>>;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
  onReprint?: (orderId: string) => void;
}

export default function POSOrdersHistoryView({ posOrders, setPosOrders, tables, setTables, onNotify, onReprint }: POSOrdersHistoryViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [orderToVoid, setOrderToVoid] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return posOrders.filter(o => {
      if (o.type === "Online" && o.status === "Ready") return false;
      const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) || (o.table && o.table.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "Semua Status" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [posOrders, search, statusFilter]);

  const [orderToPay, setOrderToPay] = useState<Order | null>(null);

  const handleBayar = (orderId: string) => {
    const order = posOrders.find(o => o.id === orderId);
    if (!order) return;
    setOrderToPay(order);
  };

  const handlePaymentSuccess = (method: string, amountGiven?: number, change?: number) => {
    if (!orderToPay) return;

    setPosOrders(prev => prev.map(o => o.id === orderToPay.id ? { ...o, status: "Selesai", payment: method, amountGiven, change } : o));

    if (orderToPay.table) {
      setTables(prev => prev.map(t => t.id === orderToPay.table || t.name === orderToPay.table ? { ...t, status: "Kosong", cart: [], current: 0 } : t));
    }
    
    supabase.from('orders').update({ status: "Selesai", payment: method, amountGiven, change }).eq('id', orderToPay.id).then();

    onNotify(`Pembayaran pesanan ${orderToPay.id} berhasil diproses dengan ${method}.`, "success");
    setOrderToPay(null);
  };

  const handleBatal = async (orderId: string) => {
    const order = posOrders.find(o => o.id === orderId);
    if (!order) return;

    await supabase.from('orders').update({ status: "Batal" }).eq('id', orderId);

    setPosOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "Batal" } : o));

    if (order.table) {
      setTables(prev => prev.map(t => t.id === order.table || t.name === order.table ? { ...t, status: "Kosong", cart: [], current: 0 } : t));
    }

    onNotify(`Pesanan ${orderId} telah di-Void.`, "warning");
    setOrderToVoid(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      
      <div className="bg-[#4d3227] text-white flex items-center justify-between px-6 py-4 shadow-md z-10">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg">Pesanan</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined cursor-pointer hover:text-white/80">more_horiz</span>
          <span className="material-symbols-outlined cursor-pointer hover:text-white/80">wifi</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        <div className="bg-white p-4 rounded-t-xl border border-slate-200 flex gap-4 items-center mb-0">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Cari Pesanan" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4d3227]"
            />
          </div>
          
          <div className="ml-auto flex gap-4 items-center">
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-slate-600 focus:outline-none focus:border-[#4d3227] min-w-[160px]"
              >
                <option>Semua Status</option>
                <option>Unpaid</option>
                <option>Selesai</option>
                <option>Batal</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
            </div>
            
            <div className="text-slate-600 text-sm bg-slate-50 border border-slate-200 py-2 px-4 rounded-lg flex items-center gap-4">
              Hari Ini
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#5c3e31] text-white">
                  <th className="px-4 py-3 font-semibold text-sm">ID Pesanan</th>
                  <th className="px-4 py-3 font-semibold text-sm text-center">Antrian</th>
                  <th className="px-4 py-3 font-semibold text-sm">Staf</th>
                  <th className="px-4 py-3 font-semibold text-sm">Nama Meja</th>
                  <th className="px-4 py-3 font-semibold text-sm text-center">Papan/Pager</th>
                  <th className="px-4 py-3 font-semibold text-sm">Tipe</th>
                  <th className="px-4 py-3 font-semibold text-sm">Pembayaran</th>
                  <th className="px-4 py-3 font-semibold text-sm">Status</th>
                  <th className="px-4 py-3 font-semibold text-sm">Total Pesanan</th>
                  <th className="px-4 py-3 font-semibold text-sm">Waktu Pesanan</th>
                  <th className="px-4 py-3 font-semibold text-sm text-center min-w-[100px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-sm text-slate-500 font-medium">{order.id}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 text-center">{order.queue}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{order.staff}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{tables.find(t => t.id === order.table)?.name || order.table || "-"}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 text-center">{order.pager}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{order.type}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{order.payment}</td>
                    <td className="px-4 py-4">
                      {order.status === "Unpaid" ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-800 animate-pulse"></div>
                          <span className="text-sm font-bold text-slate-800">Unpaid</span>
                        </div>
                      ) : order.status === "Batal" ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                          <span className="text-sm font-medium text-red-600">Batal</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className="text-sm font-medium text-emerald-600">Selesai</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 font-bold">
                      Rp{order.total.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">{order.time}</td>
                    <td className="px-4 py-4 text-center">
                      {order.status === "Unpaid" ? (
                        <div className="flex flex-col gap-1.5 justify-center">
                          <button 
                            onClick={() => handleBayar(order.id)}
                            className="bg-[#dca838] hover:bg-amber-500 text-white px-4 py-1.5 rounded-md font-bold text-xs transition-colors w-full shadow-sm"
                          >
                            Bayar
                          </button>
                          {onReprint && (
                            <button 
                              onClick={() => onReprint(order.id)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-md font-bold text-xs transition-colors w-full shadow-sm"
                            >
                              Cetak Resi
                            </button>
                          )}
                          <button 
                            onClick={() => setOrderToVoid(order.id)}
                            className="bg-[#d63f5d] hover:bg-rose-600 text-white px-4 py-1.5 rounded-md font-bold text-xs transition-colors w-full shadow-sm"
                          >
                            Void
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          {onReprint ? (
                            <button 
                              onClick={() => onReprint(order.id)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-md font-bold text-xs transition-colors shadow-sm whitespace-nowrap"
                            >
                              Cetak Resi
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium">—</span>
                          )}
                          <button 
                            onClick={() => setOrderToVoid(order.id)}
                            className="bg-[#d63f5d] hover:bg-rose-600 text-white px-4 py-1.5 rounded-md font-bold text-xs transition-colors shadow-sm whitespace-nowrap"
                          >
                            Void
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-slate-400 font-medium">
                      <span className="material-symbols-outlined text-[48px] block mb-2 opacity-50">receipt_long</span>
                      Tidak ada riwayat pesanan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {orderToVoid && (
        <ManagerAuthModal 
          onSuccess={() => handleBatal(orderToVoid)}
          onCancel={() => setOrderToVoid(null)}
        />
      )}
      
      {orderToPay && (
        <PaymentModal 
          key={`pay-history-${orderToPay.id}`}
          total={orderToPay.total}
          cart={orderToPay.items}
          onClose={() => setOrderToPay(null)}
          onSuccess={handlePaymentSuccess}
          onPartialSuccess={(method, paidItems) => {
            handlePaymentSuccess(method);
          }}
        />
      )}
    </div>
  );
}
