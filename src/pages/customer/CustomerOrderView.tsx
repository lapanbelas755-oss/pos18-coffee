import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "react-router-dom";
import { Product, CartItem, Order } from "../../types";
import { initialProducts } from "../../data";
import { supabase } from "../../lib/supabase";
import { calculateItemUnitPrice } from "../../utils/pricing";

export default function CustomerOrderView() {
  const { tableId } = useParams();
  const [products] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"cart" | "qris" | "success">("cart");
  const [orderTotal, setOrderTotal] = useState(0);
  // Auto load cart from localStorage specific to this table if needed, but for now just fresh cart
  const categories = ["Semua", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter(
    (p) => selectedCategory === "Semua" || p.category === selectedCategory
  );

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.product.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `${product.id}-customer`,
          product,
          quantity: 1,
          selectedSize: product.sizes[0] || "M",
          selectedSugar: product.sugars[0] || "Normal",
          selectedIce: product.ices[0] || "Normal",
          selectedMood: product.moods[0] || "Cold",
          notes: "",
        },
      ];
    });
  };

  const handleCheckout = () => {
    if (!customerName) {
      alert("Mohon isi nama Anda terlebih dahulu.");
      return;
    }
    if (cart.length === 0) {
      alert("Keranjang masih kosong.");
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0);
    const total = subtotal + subtotal * 0.11; // 11% tax
    setOrderTotal(total);

    setPaymentStep("qris");
    setIsCheckoutModalOpen(false);
  };

  const handlePaymentSuccess = () => {
    const newOrder = {
      id: `ONL-${Math.floor(1000 + Math.random() * 9000)}`,
      queue: "OL",
      staff: "Online",
      table: tableId || "Unknown",
      pager: "-",
      type: "Online",
      payment: "QRIS (Paid)",
      status: "Pending",
      total: orderTotal,
      time: new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: cart,
      customerName: customerName,
    };

    const pendingOrders = JSON.parse(localStorage.getItem("pending_online_orders") || "[]");
    pendingOrders.push(newOrder);
    localStorage.setItem("pending_online_orders", JSON.stringify(pendingOrders));

    window.dispatchEvent(new Event("storage"));

    setCart([]);
    setPaymentStep("success");
  };

  if (paymentStep === "qris") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto shadow-2xl relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-[#4d3227] rounded-b-[40px] -z-0"></div>
        
        <div className="z-10 w-full flex flex-col items-center mt-8">
          <h2 className="text-2xl font-extrabold text-white mb-2">Pembayaran QRIS</h2>
          <p className="text-white/80 mb-8 text-sm px-4">Silakan scan QR Code di bawah menggunakan aplikasi M-Banking atau E-Wallet Anda.</p>
          
          <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-slate-100 mb-8 flex flex-col items-center w-full max-w-[320px]">
            <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <QRCodeSVG value={`QRIS-DYNAMIC-${orderTotal}-${Date.now()}`} size={200} level="H" includeMargin={false} />
            </div>
            <div className="w-full pt-6 border-t border-dashed border-slate-200 flex flex-col items-center">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Pembayaran</span>
              <span className="text-3xl font-extrabold text-[#4d3227]">Rp{orderTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <button onClick={handlePaymentSuccess} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-extrabold shadow-lg shadow-emerald-500/30 w-full max-w-[320px] hover:bg-emerald-600 transition-all active:scale-95 mb-4 text-lg">
            Selesai Bayar (Simulasi)
          </button>
          
          <button onClick={() => { setPaymentStep("cart"); setIsCheckoutModalOpen(true); }} className="text-slate-500 font-bold hover:text-slate-700 transition-colors">
            Batalkan & Kembali
          </button>
        </div>
      </div>
    );
  }

  if (paymentStep === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto shadow-2xl">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl">check_circle</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Pesanan Diterima!</h1>
        <p className="text-slate-500 mb-8 max-w-xs">
          Pesanan Anda telah masuk ke kasir dan akan segera diproses. Silakan tunggu di meja Anda.
        </p>
        <button
          onClick={() => setPaymentStep("cart")}
          className="bg-[#4d3227] text-white px-8 py-3 rounded-full font-bold shadow-md w-full max-w-xs"
        >
          Pesan Lagi
        </button>
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 font-sans antialiased relative max-w-md mx-auto shadow-2xl overflow-x-hidden">
      {/* Header */}
      <header className="bg-[#4d3227] text-white p-4 sticky top-0 z-20 shadow-md flex justify-between items-center">
        <div>
          <h1 className="font-extrabold text-lg tracking-tight">LapanbelasCoffee</h1>
          <p className="text-xs opacity-80 mt-0.5">Self-Ordering</p>
        </div>
        <div className="bg-white/20 px-3 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm">
          Meja {tableId}
        </div>
      </header>

      {/* Categories */}
      <div className="bg-white border-b border-slate-200 sticky top-[68px] z-10 overflow-x-auto whitespace-nowrap hide-scrollbar px-2 py-3 shadow-sm">
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-[#4d3227] text-white shadow-md"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl p-3 flex flex-col border border-slate-100 shadow-sm">
              <div className="aspect-square bg-slate-100 rounded-xl mb-3 overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight">{product.name}</h3>
              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="font-extrabold text-primary text-sm">
                  Rp{product.price.toLocaleString("id-ID")}
                </span>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="w-8 h-8 rounded-full bg-[#4d3227] text-white flex items-center justify-center hover:bg-[#3a251d] active:scale-95 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-30 max-w-md mx-auto">
          <button
            onClick={() => setIsCheckoutModalOpen(true)}
            className="w-full bg-[#4d3227] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between hover:bg-[#3a251d] transition-all active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <span className="font-bold">Lihat Keranjang</span>
            </div>
            <span className="font-extrabold text-lg">
              Rp{subtotal.toLocaleString("id-ID")}
            </span>
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl mt-auto shadow-2xl flex flex-col overflow-hidden h-[85vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Keranjang Anda</h2>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4 mb-6">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">{item.product.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{item.selectedSize}, {item.selectedIce}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">Rp{(calculateItemUnitPrice(item) * item.quantity).toLocaleString("id-ID")}</p>
                      <p className="text-xs text-slate-500 font-medium">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                  <span>Subtotal</span>
                  <span>Rp{subtotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 mb-3 pb-3 border-b border-slate-200">
                  <span>Pajak (10%)</span>
                  <span>Rp{(subtotal * 0.1).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-extrabold text-lg text-[#4d3227]">
                  <span>Total Bayar</span>
                  <span>Rp{(subtotal + subtotal * 0.1).toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Pemesan</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama Anda"
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:outline-none focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227]"
                />
              </div>
            </div>

            <div className="p-5 bg-white border-t border-slate-100">
              <button 
                onClick={handleCheckout}
                className="w-full bg-[#4d3227] text-white p-4 rounded-xl font-bold text-lg shadow-xl hover:bg-[#3a251d] transition-all"
              >
                Pesan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
