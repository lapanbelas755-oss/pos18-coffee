import React, { useState } from "react";
import { Order } from "../../types";
import { supabase } from "../../lib/supabase";
import { usePosStore } from "../../store/posStore";
import { useAuthStore } from "../../store/authStore";
import { printReceipt, buildKasirReceipt } from "../../utils/bluetoothPrinter";
import { calculateItemUnitPrice } from "../../utils/pricing";

interface POSOnlineViewProps {
  posOrders: Order[];
  setPosOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function POSOnlineView({ posOrders, setPosOrders, onNotify }: POSOnlineViewProps) {
  const { connectedPrinters } = usePosStore();
  const { currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState("Online");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  // Only show online orders that are not fully "Selesai" (or show them if filter allows)
  const onlineOrders = posOrders.filter(o => o.type === "Online" && o.status !== "Selesai" && o.status !== "Batal");

  const filteredOrders = onlineOrders.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Semua Status" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleComplete = async (orderId: string) => {
    const order = posOrders.find(o => o.id === orderId);
    if (!order) return;

    // Optimistic UI Update
    setPosOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "Selesai", payment: "QRIS (Paid)" } : o));
    onNotify(`Pesanan ${orderId} sedang disinkronisasi ke Dapur/Barista...`, "info");

    // 1. Update Order Status in Supabase
    await supabase.from('orders').update({ status: 'Selesai' }).eq('id', orderId);

    // 2. Split items for KDS
    const isKitchenItem = (category: string) => {
      const c = (category || "").toLowerCase();
      return c.includes('food') || c.includes('makanan') || c.includes('snack') || c.includes('pastry');
    };

    const baristaCart = order.items.filter(i => !isKitchenItem(i.product.category));
    const kitchenCart = order.items.filter(i => isKitchenItem(i.product.category));

    const dbPayloadsToInsert: any[] = [];
    const ticketId = order.id;

    if (baristaCart.length > 0) {
      const baristaItems = baristaCart.map((item, idx) => ({
        id: `pos-${ticketId}-B-${idx}`,
        name: `${item.quantity}x ${item.product.name}`,
        notes: [item.selectedMood, item.notes].filter(Boolean).join(" - "),
        checked: false
      }));

      dbPayloadsToInsert.push({
        id: `${ticketId}-B`,
        type: order.type,
        table: order.table || undefined,
        time_in_seconds: 0,
        status: 'incoming',
        station: 'barista',
        items: baristaItems,
        customer_name: order.customerName,
        created_at: new Date().toISOString()
      });
    }

    if (kitchenCart.length > 0) {
      const kitchenItems = kitchenCart.map((item, idx) => ({
        id: `pos-${ticketId}-K-${idx}`,
        name: `${item.quantity}x ${item.product.name}`,
        notes: `${item.notes ? `(${item.notes})` : ""}`,
        checked: false
      }));

      dbPayloadsToInsert.push({
        id: `${ticketId}-K`,
        type: order.type,
        table: order.table || undefined,
        time_in_seconds: 0,
        status: 'incoming',
        station: 'kitchen',
        items: kitchenItems,
        customer_name: order.customerName,
        created_at: new Date().toISOString()
      });
    }

    if (dbPayloadsToInsert.length > 0) {
      await supabase.from('kds_orders').insert(dbPayloadsToInsert);
    }

    // 3. Print Kasir Receipt automatically if connected
    if (connectedPrinters.kasir) {
      try {
        let storeName = "Lb coffee";
        let storeAddress = "Aceh Tamiang";
        const savedProfile = localStorage.getItem("pos_store_profile");
        if (savedProfile) {
          try {
            const p = JSON.parse(savedProfile);
            if (p.namaToko) storeName = p.namaToko;
            if (p.alamatLengkap) storeAddress = p.alamatLengkap;
          } catch (e) { }
        }

        const dataToPrint = buildKasirReceipt({
          storeName,
          storeAddress,
          cashierName: currentUser?.name.split(' ')[0] || "Kasir",
          tableNo: order.table ? `Meja ${order.table}` : "Online",
          items: order.items.map(i => ({
            name: i.product.name,
            qty: i.quantity,
            price: calculateItemUnitPrice(i)
          })),
          total: order.total,
          paid: order.total,
          change: 0,
          paymentMethod: order.payment || "QRIS (Paid)",
        });
        await printReceipt(dataToPrint, "Kasir");
      } catch (printErr) {
        console.error("Gagal print struk online:", printErr);
      }
    }

    onNotify(`Pesanan online ${orderId} telah masuk ke KDS!`, "success");
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">

      {/* Header (Blue) */}
      <div className="bg-[#4d3227] text-white flex items-center justify-between px-6 py-4 shadow-md z-10">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg">Pemesanan Online</span>
        </div>
        <button
          onClick={() => onNotify("Sinkronisasi pesanan online...", "info")}
          className="bg-white text-[#4d3227] p-2 rounded-lg shadow-sm hover:bg-slate-100 transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined">sync</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {["Idefood", "Online", "Pesanan Terjadwal"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm transition-colors ${activeTab === tab
                  ? "text-[#4d3227] border-b-2 border-[#4d3227]"
                  : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-t-xl border border-slate-200 flex gap-4 items-center">
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
                <option>Ready</option>
                <option>Pending</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
            </div>

            <div className="text-slate-600 text-sm bg-slate-50 border border-slate-200 py-2 px-4 rounded-lg flex items-center gap-4">
              Hari Ini
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#5c3e31] text-white">
                  <th className="px-4 py-3 font-semibold text-sm">ID Pesanan</th>
                  <th className="px-4 py-3 font-semibold text-sm">Antrian</th>
                  <th className="px-4 py-3 font-semibold text-sm">Staf</th>
                  <th className="px-4 py-3 font-semibold text-sm">Nama Meja</th>
                  <th className="px-4 py-3 font-semibold text-sm">Pelanggan</th>
                  <th className="px-4 py-3 font-semibold text-sm">Tipe</th>
                  <th className="px-4 py-3 font-semibold text-sm">Pembayaran</th>
                  <th className="px-4 py-3 font-semibold text-sm">Status</th>
                  <th className="px-4 py-3 font-semibold text-sm">Total Pesanan</th>
                  <th className="px-4 py-3 font-semibold text-sm">Waktu Pesanan</th>
                  <th className="px-4 py-3 font-semibold text-sm text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">{order.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{order.queue}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{order.staff}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{order.table || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-bold">{order.customerName && !order.customerName.startsWith('table-') ? order.customerName : "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{order.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{order.payment}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-sm font-bold text-blue-600">{order.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-bold">
                      Rp{order.total.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{order.time}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleComplete(order.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md font-bold text-xs transition-colors shadow-sm"
                      >
                        Complete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-slate-400">Belum ada pesanan online baru.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
