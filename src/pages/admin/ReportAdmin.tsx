import React, { useState, useMemo } from "react";
import { Order, RecipeItem, StockItem } from "../../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { sendTelegramMessage } from "../../lib/telegram";

interface ReportAdminProps {
  orders?: Order[];
  recipes?: RecipeItem[];
  stockItems?: StockItem[];
}

const COLORS = ['#d34241', '#f1c84b', '#b377ee', '#2ca068', '#3499d8', '#33488f', '#7e64c3', '#e46f33'];

export default function ReportAdmin({ orders = [], recipes = [], stockItems = [] }: ReportAdminProps) {
  // Tanggal default: Tanggal 1 bulan ini hingga hari ini
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [activeTab, setActiveTab] = useState<"Item" | "Category" | "Order" | "Bahan">("Item");
  const [isSending, setIsSending] = useState(false);

  const handleSendDailyReport = async () => {
    setIsSending(true);
    try {
      const totalNetSales = orderData.reduce((s, o) => s + o.netSales, 0);
      const totalCost = orderData.reduce((s, o) => s + o.cost, 0);
      const grossProfit = totalNetSales - totalCost;
      const totalOrders = filteredOrders.length;
      
      const healthyCount = stockItems.filter(s => s.status === 'Healthy').length;
      const lowCount = stockItems.filter(s => s.status === 'Low Stock').length;
      const outCount = stockItems.filter(s => (s.stockLevel || 0) === 0).length;

      const dateRangeStr = startDate === endDate 
        ? new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : `${new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

      const message = `
📊 <b>LAPORAN KASIR & PENJUALAN</b>
📅 <b>Periode:</b> ${dateRangeStr}

💰 <b>FINANSIAL</b>
• <b>Net Sales:</b> Rp ${totalNetSales.toLocaleString('id-ID')}
• <b>Total Modal (COGS):</b> Rp ${totalCost.toLocaleString('id-ID')}
• <b>Laba Kotor:</b> Rp ${grossProfit.toLocaleString('id-ID')}
• <b>Total Transaksi:</b> ${totalOrders} Pesanan

📦 <b>STATUS STOK GUDANG</b>
🟢 <b>Aman (Healthy):</b> ${healthyCount} item
🟡 <b>Menipis (Low):</b> ${lowCount} item
🔴 <b>Habis (Out):</b> ${outCount} item

<i>Laporan ini dibuat otomatis dari sistem POS18 Coffee.</i>
      `.trim();

      const success = await sendTelegramMessage(message);
      if (success) {
        alert("Laporan harian berhasil dikirim ke Telegram!");
      } else {
        alert("Gagal mengirim laporan. Pastikan Token & Chat ID Telegram sudah diset di pengaturan.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat mengirim laporan.");
    } finally {
      setIsSending(false);
    }
  };

  // Helper: normalisasi nama utk perbandingan (hapus spasi, lowercase)
  const normalizeName = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '');

  // Helper untuk COGS - pakai normalizeName agar "sanger 18 double" == "sanger18 double"
  const getProductCOGS = (productName: string, productCogs?: number) => {
    const normalizedProductName = normalizeName(productName);
    const recipe = recipes.find(r => {
      const normalizedRecipeName = normalizeName(r.name);
      return (
        normalizedRecipeName === normalizedProductName ||
        normalizedProductName.includes(normalizedRecipeName) ||
        normalizedRecipeName.includes(normalizedProductName)
      );
    });
    if (recipe && recipe.cogs) return Number(recipe.cogs) || 0;
    // Fallback ke cogs di objek produk itu sendiri (tersimpan di order items)
    if (productCogs) return Number(productCogs) || 0;
    return 0;
  }

  // Filter Data Orders
  const filteredOrders = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);
    
    return orders.filter(o => {
      const d = (o as any).created_at ? new Date((o as any).created_at) : new Date();
      return o.status === "Selesai" && d >= start && d <= end;
    });
  }, [orders, startDate, endDate]);

  // 1. DATA ITEM
  const itemData = useMemo(() => {
    const map: Record<string, any> = {};
    filteredOrders.forEach(o => {
       o.items.forEach(i => {
          const key = i.product.name;
          if(!map[key]) {
             map[key] = {
               name: key,
               category: i.product.category,
               qty: 0,
               netSales: 0,
               cost: 0
             }
          }
          map[key].qty += i.quantity;
          map[key].netSales += i.quantity * (i.product.price || 0);
          map[key].cost += i.quantity * getProductCOGS(key, i.product.cogs);
       });
    });
    return Object.values(map).map(m => ({ ...m, grossProfit: m.netSales - m.cost })).sort((a,b) => b.qty - a.qty);
  }, [filteredOrders, recipes]);

  // 2. DATA CATEGORY (Pie Charts)
  const categoryData = useMemo(() => {
    const catMap: Record<string, Record<string, number>> = {};
    filteredOrders.forEach(o => {
       o.items.forEach(i => {
          const cat = i.product.category || "Lainnya";
          const name = i.product.name;
          if(!catMap[cat]) catMap[cat] = {};
          if(!catMap[cat][name]) catMap[cat][name] = 0;
          catMap[cat][name] += i.quantity;
       });
    });
    
    return Object.entries(catMap).map(([catName, itemsMap]) => {
      const data = Object.entries(itemsMap).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
      const totalOrder = data.reduce((s, d) => s + d.value, 0);
      return { category: catName, data, totalOrder };
    });
  }, [filteredOrders]);

  // 3. DATA ORDER (Invoices)
  const orderData = useMemo(() => {
    return filteredOrders.map(o => {
       let cost = 0;
     o.items.forEach(i => {
          cost += i.quantity * getProductCOGS(i.product.name, i.product.cogs);
       });
       return {
         invoice: o.id,
         type: o.type,
         payment: o.payment,
         time: (o as any).created_at ? new Date((o as any).created_at).toLocaleString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}) : o.time,
         refund: 0,
         discount: 0,
         netSales: o.total,
         cost,
         grossProfit: o.total - cost
       }
    }).sort((a,b) => {
      // Urutkan dari terbaru
      const dateA = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
      const dateB = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
      return dateB - dateA || b.invoice.localeCompare(a.invoice);
    });
  }, [filteredOrders, recipes]);

  // 4. DATA BAHAN BAKU (Lama)
  const bahanData = useMemo(() => {
    const usageMap: Record<string, { used: number, cost: number, unit: string }> = {};
    filteredOrders.forEach(order => {
      order.items.forEach(cartItem => {
         const normalizedProductName = normalizeName(cartItem.product.name);
         const recipe = recipes.find(r => {
           const normalizedRecipeName = normalizeName(r.name);
           return normalizedRecipeName === normalizedProductName || normalizedProductName.includes(normalizedRecipeName) || normalizedRecipeName.includes(normalizedProductName);
         });
         if (recipe) {
            recipe.ingredients.forEach(ing => {
               const key = ing.name.toLowerCase().trim();
               const gramasi = Number(ing.rawMeasurementVal) || 0;
               const stock = stockItems.find(s => s.name.toLowerCase().trim() === key || key.includes(s.name.toLowerCase().trim()));
               const costPerUnit = stock?.unitCost || 0;
               const unit = stock?.unit || ing.measurementUnit || "";

               if (!usageMap[key]) usageMap[key] = { used: 0, cost: 0, unit };
               usageMap[key].used += (gramasi * cartItem.quantity);
               usageMap[key].cost += (gramasi * cartItem.quantity * costPerUnit);
            });
         }
      });
    });
    return Object.entries(usageMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.cost - a.cost);
  }, [filteredOrders, recipes, stockItems]);


  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto h-full pb-10">
      
      {/* Header & Filter */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex-wrap gap-4 sticky top-0 z-30">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Laporan & Analitik</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Data penjualan dan pemakaian operasional.</p>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center gap-3 bg-[#fcfaf8] p-2 rounded-2xl border border-slate-200">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 px-2">Dari Tanggal</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none px-2" />
          </div>
          <span className="text-slate-300">-</span>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 px-2">Sampai Tanggal</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none px-2" />
          </div>
        </div>

        <button 
          onClick={handleSendDailyReport}
          disabled={isSending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          {isSending ? 'Mengirim...' : 'Tutup Kasir & Kirim Laporan'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar">
        {(["Item", "Category", "Order", "Bahan"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
              activeTab === tab 
                ? "bg-[#4a2d21] text-white shadow-md" 
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Laporan {tab === "Bahan" ? "Pemakaian Bahan" : tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: ITEM */}
      {activeTab === "Item" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fafcf5]">
            <h3 className="font-extrabold text-lg text-slate-800">Details Item Sales</h3>
          </div>
          <div className="overflow-auto custom-scrollbar flex-1 max-h-[600px]">
            <table className="w-full text-left text-sm text-slate-700 min-w-[900px]">
              <thead className="bg-[#751A18] text-white sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold text-sm text-center">Item</th>
                  <th className="p-4 font-bold text-sm text-center">Category</th>
                  <th className="p-4 font-bold text-sm text-center">Item Ordered</th>
                  <th className="p-4 font-bold text-sm text-center">Net Sales</th>
                  <th className="p-4 font-bold text-sm text-center">Cost</th>
                  <th className="p-4 font-bold text-sm text-center">Gross Profit</th>
                </tr>
              </thead>
              <tbody>
                {itemData.map((row, i) => (
                  <tr key={row.name} className={`border-b border-slate-100 hover:bg-slate-50 ${i%2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                    <td className="p-4 font-semibold text-slate-800 text-center">{row.name}</td>
                    <td className="p-4 font-medium text-slate-500 uppercase text-xs text-center">{row.category}</td>
                    <td className="p-4 font-bold text-[#4a2d21] text-center">{row.qty}</td>
                    <td className="p-4 font-bold text-slate-800 text-center">IDR {row.netSales.toLocaleString("id-ID")}</td>
                    <td className="p-4 font-medium text-red-600 text-center">IDR {row.cost.toLocaleString("id-ID")}</td>
                    <td className="p-4 font-black text-green-700 text-center">IDR {row.grossProfit.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
                {itemData.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-medium">Tidak ada data di rentang tanggal ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CATEGORY */}
      {activeTab === "Category" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryData.map(cat => (
            <div key={cat.category} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-extrabold text-base text-slate-800 uppercase">{cat.category}</h3>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Order</p>
                  <p className="text-2xl font-black text-[#4a2d21]">{cat.totalOrder}</p>
                </div>
              </div>
              
              <div className="h-[250px] relative -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cat.data}
                      cx="40%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {cat.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} Porsi`, 'Terjual']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                    />
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
          {categoryData.length === 0 && (
             <div className="col-span-full p-10 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-200">Tidak ada data di rentang tanggal ini.</div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ORDER */}
      {activeTab === "Order" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#fafcf5]">
            <h3 className="font-extrabold text-lg text-slate-800">Details Invoices</h3>
          </div>
          <div className="overflow-auto custom-scrollbar flex-1 max-h-[600px]">
            <table className="w-full text-left text-sm text-slate-700 min-w-[1000px]">
              <thead className="bg-[#751A18] text-white sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-bold text-sm text-center">Invoice</th>
                  <th className="p-4 font-bold text-sm text-center">Type</th>
                  <th className="p-4 font-bold text-sm text-center">Payment</th>
                  <th className="p-4 font-bold text-sm text-center">Order Time</th>
                  <th className="p-4 font-bold text-sm text-center">Refund</th>
                  <th className="p-4 font-bold text-sm text-center">Discount</th>
                  <th className="p-4 font-bold text-sm text-center">Net Sales</th>
                  <th className="p-4 font-bold text-sm text-center">Cost</th>
                  <th className="p-4 font-bold text-sm text-center">Gross Profit</th>
                </tr>
              </thead>
              <tbody>
                {orderData.map((row, i) => (
                  <tr key={row.invoice} className={`border-b border-slate-100 hover:bg-slate-50 ${i%2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                    <td className="p-4 font-semibold text-slate-800 text-center">{row.invoice}</td>
                    <td className="p-4 font-medium text-slate-600 text-center">{row.type}</td>
                    <td className="p-4 font-bold text-[#4a2d21] text-center">{row.payment}</td>
                    <td className="p-4 text-xs font-medium text-slate-500 text-center">{row.time}</td>
                    <td className="p-4 text-slate-400 text-center">IDR {row.refund}</td>
                    <td className="p-4 text-slate-400 text-center">IDR {row.discount}</td>
                    <td className="p-4 font-bold text-slate-800 text-center">IDR {row.netSales.toLocaleString("id-ID")}</td>
                    <td className="p-4 font-medium text-red-600 text-center">IDR {row.cost.toLocaleString("id-ID")}</td>
                    <td className="p-4 font-black text-green-700 text-center">IDR {row.grossProfit.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
                {orderData.length === 0 && (
                  <tr><td colSpan={9} className="p-10 text-center text-slate-400 font-medium">Tidak ada data di rentang tanggal ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Order Summary Footer */}
          {orderData.length > 0 && (
            <div className="bg-[#fafcf5] border-t border-slate-200 p-6 flex justify-between items-center text-sm">
              <div className="flex gap-4 items-center">
                <span className="font-bold text-slate-600">Total Order</span>
                <span className="text-2xl font-black text-[#4a2d21]">{orderData.length}</span>
              </div>
              <div className="flex gap-4 items-center">
                <span className="font-bold text-slate-600">Total Sales</span>
                <span className="text-2xl font-black text-slate-800">
                  IDR {orderData.reduce((s,o)=>s+o.netSales, 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <span className="font-bold text-slate-600">Amount Received</span>
                <span className="text-2xl font-black text-green-700">
                  IDR {orderData.reduce((s,o)=>s+o.netSales, 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: BAHAN BAKU */}
      {activeTab === "Bahan" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-[#fafcf5]">
            <h3 className="font-extrabold text-lg text-slate-800">Laporan Pemakaian Bahan Baku</h3>
            <p className="text-sm text-slate-500">Estimasi total bahan yang terpakai dari {startDate} hingga {endDate}.</p>
          </div>
          <div className="overflow-auto custom-scrollbar max-h-[500px]">
            <table className="w-full text-left text-sm text-slate-700 min-w-[800px]">
              <thead className="bg-[#751A18] text-white sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-[11px] uppercase tracking-widest text-center w-1/3">Nama Bahan</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest text-center">Total Terpakai</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest text-center">Estimasi Biaya (HPP)</th>
                </tr>
              </thead>
              <tbody>
                {bahanData.length > 0 ? (
                  bahanData.map((item, idx) => (
                    <tr key={item.name} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                      <td className="p-4 font-black text-slate-800 text-base capitalize text-center">{item.name}</td>
                      <td className="p-4 text-center font-bold text-[#4a2d21]">
                        {item.used} <span className="text-xs text-slate-500 font-medium">{item.unit === "Kilogram" ? "kg" : item.unit}</span>
                      </td>
                      <td className="p-4 text-center font-black text-slate-800 text-base">
                        IDR {Math.round(item.cost).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-slate-400 font-medium">Belum ada pemakaian bahan di rentang tanggal ini.</td>
                  </tr>
                )}
              </tbody>
              {bahanData.length > 0 && (
                <tfoot className="bg-[#4a2d21] text-white">
                  <tr>
                    <td className="p-4 font-extrabold text-base text-center" colSpan={2}>TOTAL ESTIMASI HPP TERPAKAI</td>
                    <td className="p-4 text-center font-black text-lg">
                      IDR {bahanData.reduce((acc, curr) => acc + curr.cost, 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
