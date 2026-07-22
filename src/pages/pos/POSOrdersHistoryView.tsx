import React, { useState, useMemo } from "react";
import { Order, TableData } from "../../types";
import { supabase } from "../../lib/supabase";
import ManagerAuthModal from "../../components/pos/ManagerAuthModal";
import PaymentModal from "../../components/pos/PaymentModal";
import { sendTelegramMessage } from "../../lib/telegram";
import { calculateItemUnitPrice } from "../../utils/pricing";

interface POSOrdersHistoryViewProps {
  posOrders: Order[];
  setPosOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  tables: TableData[];
  setTables: React.Dispatch<React.SetStateAction<TableData[]>>;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
  onReprint?: (orderId: string) => void;
  onReprintChecker?: (orderId: string) => void;
}

export default function POSOrdersHistoryView({ posOrders, setPosOrders, tables, setTables, onNotify, onReprint, onReprintChecker }: POSOrdersHistoryViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [dateFilter, setDateFilter] = useState("Hari Ini");
  const [orderToVoid, setOrderToVoid] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    // Determine today's date string in the same format as o.time ("17 Jul 2026")
    const todayStr = new Date().toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    
    return posOrders.filter(o => {
      if (o.type === "Online" && o.status === "Ready") return false;
      
      const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) || (o.table && o.table.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "Semua Status" || o.status === statusFilter;
      const matchDate = dateFilter === "Semua Waktu" || o.time.includes(todayStr);
      
      return matchSearch && matchStatus && matchDate;
    });
  }, [posOrders, search, statusFilter, dateFilter]);

  const [orderToPay, setOrderToPay] = useState<Order | null>(null);

  const handleBayar = (orderId: string) => {
    const order = posOrders.find(o => o.id === orderId);
    if (!order) return;
    setOrderToPay(order);
  };

  const toDbOrder = (o: Order) => {
    const { customerName, amountGiven, change, ...rest } = o;
    return { ...rest, customer_name: customerName || null };
  };

  const handlePaymentSuccess = (method: string, amountGiven?: number, change?: number) => {
    if (!orderToPay) return;

    setPosOrders(prev => prev.map(o => o.id === orderToPay.id ? { ...o, status: "Selesai", payment: method, amountGiven, change } : o));

    if (orderToPay.table) {
      setTables(prev => prev.map(t => {
        if (t.id === orderToPay.table || t.name === orderToPay.table) {
          const updated: TableData = { ...t, status: "Kosong", cart: [], current: 0, customerName: undefined, linkedTo: undefined, time: "" };
          supabase.from('tables').update({
            status: "Kosong", cart: [], current: 0, customer_name: null, linked_to: null, time: ""
          }).eq('id', t.id).then();
          return updated;
        }
        return t;
      }));
    }
    
    supabase.from('orders').update({ status: "Selesai", payment: method }).eq('id', orderToPay.id).then();

    onNotify(`Pembayaran pesanan ${orderToPay.id} berhasil diproses dengan ${method}.`, "success");
    setOrderToPay(null);
  };

  const handlePartialPaymentSuccess = (method: string, paidItems: any[]) => {
    if (!orderToPay) return;

    const paidItemIds = new Set(paidItems.map(i => i.id));
    const remainingItems = orderToPay.items.filter(i => !paidItemIds.has(i.id));

    let taxR = 0;
    try {
      const savedBiaya = localStorage.getItem("pos_biaya_settings");
      if (savedBiaya) {
        const biayaList = JSON.parse(savedBiaya);
        const pb1 = biayaList.find((b: any) => b.id === "FEE-001");
        if (pb1 && !pb1.isActive) taxR = 0;
        else if (pb1 && pb1.isActive) taxR = pb1.value / 100;
      }
    } catch (e) { }

    const paidSubtotal = paidItems.reduce((s, i) => s + (calculateItemUnitPrice(i) * i.quantity), 0);
    const paidTotal = paidSubtotal + Math.round(paidSubtotal * taxR);

    const remainingSubtotal = remainingItems.reduce((s, i) => s + (calculateItemUnitPrice(i) * i.quantity), 0);
    const remainingTotal = remainingSubtotal + Math.round(remainingSubtotal * taxR);

    const timestamp = new Date().toISOString();
    const timeStr = new Date().toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const queueNo = orderToPay.queue || orderToPay.id.replace('INV-', '');
    const paidInvoiceId = `INV-${queueNo}-P${Date.now().toString().slice(-4)}`;
    
    const paidOrderRecord: Order = {
      ...orderToPay,
      id: paidInvoiceId,
      items: paidItems,
      total: paidTotal,
      status: "Selesai",
      payment: method,
      time: timeStr,
      created_at: timestamp
    };

    if (remainingItems.length === 0) {
      setPosOrders(prev => [
        paidOrderRecord,
        ...prev.map(o => o.id === orderToPay.id ? { ...o, status: "Selesai" as const, payment: method } : o)
      ]);

      if (orderToPay.table && orderToPay.table !== "-") {
        setTables(prev => prev.map(t => {
          if (t.id === orderToPay.table || t.name === orderToPay.table) {
            const updated: TableData = { ...t, status: "Kosong", cart: [], current: 0, customerName: undefined, linkedTo: undefined, time: "" };
            supabase.from('tables').update({
              status: "Kosong", cart: [], current: 0, customer_name: null, linked_to: null, time: ""
            }).eq('id', t.id).then();
            return updated;
          }
          return t;
        }));
      }

      supabase.from('orders').update({ status: "Selesai", payment: method }).eq('id', orderToPay.id).then();
      supabase.from('orders').insert([toDbOrder(paidOrderRecord)]).then();
      onNotify(`Pesanan ${orderToPay.id} telah LUNAS seluruhnya.`, "success");
    } else {
      setPosOrders(prev => [
        paidOrderRecord,
        ...prev.map(o => o.id === orderToPay.id ? {
          ...o,
          status: "Partially Paid" as const,
          items: remainingItems,
          total: remainingTotal
        } : o)
      ]);

      if (orderToPay.table && orderToPay.table !== "-") {
        setTables(prev => prev.map(t => {
          if (t.id === orderToPay.table || t.name === orderToPay.table) {
            const updated: TableData = { ...t, status: "Sudah Dipesan", cart: remainingItems };
            supabase.from('tables').update({
              cart: remainingItems, status: "Sudah Dipesan"
            }).eq('id', t.id).then();
            return updated;
          }
          return t;
        }));
      }

      supabase.from('orders').update({
        status: "Partially Paid",
        items: remainingItems,
        total: remainingTotal
      }).eq('id', orderToPay.id).then();

      supabase.from('orders').insert([toDbOrder(paidOrderRecord)]).then();
      onNotify(`Pembayaran sebagian berhasil (Sisa ${remainingItems.length} item belum dibayar).`, "success");
    }

    if (onReprint) {
      setTimeout(() => onReprint(paidInvoiceId), 200);
    }

    setOrderToPay(null);
  };

  const handleBatal = async (orderId: string) => {
    const order = posOrders.find(o => o.id === orderId);
    if (!order) return;

    await supabase.from('orders').update({ status: "Batal" }).eq('id', orderId);

    setPosOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "Batal" } : o));

    if (order.table) {
      setTables(prev => prev.map(t => {
        if (t.id === order.table || t.name === order.table) {
          const updated: TableData = { ...t, status: "Kosong", cart: [], current: 0, customerName: undefined, linkedTo: undefined, time: "" };
          supabase.from('tables').update({
            status: "Kosong", cart: [], current: 0, customer_name: null, linked_to: null, time: ""
          }).eq('id', t.id).then();
          return updated;
        }
        return t;
      }));
    }

    onNotify(`Pesanan ${orderId} telah di-Void.`, "warning");
    
    // Telegram Notification
    const telegramMsg = `🚫 <b>TRANSAKSI VOID</b> 🚫\n\n🆔 <b>Order ID:</b> ${orderId}\n👤 <b>Kasir:</b> ${order.staff || 'System'}\n💵 <b>Total:</b> Rp ${order.total.toLocaleString('id-ID')}\n📝 <b>Catatan:</b> Pesanan telah dibatalkan / di-void.`;
    sendTelegramMessage(telegramMsg);

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
            
            <div className="relative">
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-slate-600 focus:outline-none focus:border-[#4d3227] min-w-[140px]"
              >
                <option>Hari Ini</option>
                <option>Semua Waktu</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">filter_alt</span>
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
                  <th className="px-4 py-3 font-semibold text-sm">Pelanggan</th>
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
                  <tr 
                    key={order.id}
                    onClick={() => setSelectedOrderDetails(order)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 text-sm text-slate-500 font-medium">{order.id}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 text-center">{order.queue}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{order.staff}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 font-bold">{order.customerName || "-"}</td>
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
                      ) : order.status === "Partially Paid" ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                          <span className="text-sm font-bold text-amber-700">Partially Paid</span>
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
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {(order.status === "Unpaid" || order.status === "Partially Paid") ? (
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
                          {onReprintChecker && (
                            <button 
                              onClick={() => onReprintChecker(order.id)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-md font-bold text-xs transition-colors w-full shadow-sm"
                            >
                              Cetak Checker
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
                            <div className="flex flex-col gap-1.5">
                              <button 
                                onClick={() => onReprint(order.id)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-md font-bold text-xs transition-colors shadow-sm whitespace-nowrap"
                              >
                                Cetak Resi
                              </button>
                              {onReprintChecker && (
                                <button 
                                  onClick={() => onReprintChecker(order.id)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-md font-bold text-xs transition-colors shadow-sm whitespace-nowrap"
                                >
                                  Cetak Checker
                                </button>
                              )}
                            </div>
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
          onPartialSuccess={handlePartialPaymentSuccess}
        />
      )}
      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined text-xl">receipt_long</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Detail Pesanan</h3>
                  <p className="text-xs text-slate-500">{selectedOrderDetails.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-6">
              <div className="space-y-4">
                {selectedOrderDetails.items.map((item, idx) => {
                  const unitPrice = calculateItemUnitPrice(item);
                  const itemTotal = unitPrice * item.quantity;
                  return (
                    <div key={idx} className="flex gap-4 items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                        {item.quantity}x
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{item.product.name}</div>
                        {(item.selectedMood || item.notes) && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {item.selectedMood && (
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-amber-600"></span>
                                {item.selectedMood}
                              </span>
                            )}
                            {item.notes && (
                              <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                Note: {item.notes}
                              </span>
                            )}
                          </div>
                        )}
                        <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                          @ Rp {unitPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-700 text-sm">
                          Rp {itemTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order total info */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Subtotal Item</span>
                  <span>
                    Rp {selectedOrderDetails.items.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 mt-1">
                  <span className="text-sm font-extrabold text-slate-700">Total Tagihan</span>
                  <span className="text-lg font-black text-[#4d3227]">
                    Rp {selectedOrderDetails.total.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedOrderDetails(null)}
                className="px-6 py-2 rounded-xl font-bold text-sm bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
