import React, { useState } from "react";
import { CartItem, Promo } from "../../types";
import { usePOSContext } from "../../layouts/POSLayout";
import { usePosStore } from "../../store/posStore";
import { useAuthStore } from "../../store/authStore";
import { calculateItemUnitPrice } from "../../utils/pricing";

import { useNavigate } from "react-router-dom";

interface CartPanelProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  orderType: "Dine In" | "Take Out";
  setOrderType: (val: "Dine In" | "Take Out") => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  onCheckout: (customerName?: string, promo?: Promo | null) => void;
  onSaveOrder?: (customerName?: string) => void;
  onCancel?: () => void;
  activeTableId?: string | null;
  activeTableName?: string;
}

export default function CartPanel({
  cart,
  setCart,
  orderType,
  setOrderType,
  customerName,
  setCustomerName,
  onCheckout,
  onSaveOrder = () => {},
  onCancel,
  activeTableId = null,
  activeTableName,
}: CartPanelProps) {
  const { setSidebarOpen } = usePOSContext();
  const { promos, triggerToast, connectedPrinters } = usePosStore();
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();

  const subtotal = cart.reduce((sum, item) => sum + (calculateItemUnitPrice(item) * item.quantity), 0);
  const total = subtotal;

  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  const handleQtyChange = (itemId: string, delta: number) => {
    setCart(prev => prev
      .map(item => item.id === itemId ? { ...item, quantity: item.quantity + delta } : item)
      .filter(item => item.quantity > 0)
    );
  };

  const handleRemove = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Hapus semua item dari keranjang?")) {
      setCart([]);
    }
  };

  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setCart(prev => prev.map(item => item.id === editingItem.id ? editingItem : item));
    setEditingItem(null);
  };

  return (
    <div className="w-[320px] lg:w-[380px] bg-white h-full flex flex-col flex-shrink-0 shadow-[4px_0_15px_rgba(0,0,0,0.05)] z-10">
      
      {/* Top Header Section */}
      <div className="bg-primary text-white p-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-1 pl-2">
          <img src="/logo.png" alt="POS18 Logo" className="w-8 h-8 object-contain rounded-md" />
          <span className="font-bold text-sm tracking-tight">POS18 Coffee</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/pos/shift")}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Shift
          </button>
          {connectedPrinters.kasir && (
            <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full border border-green-500/50" title="Printer Kasir Terhubung">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-primary text-white px-4 pb-3 pt-1 flex justify-between items-end">
        <h2 className="font-bold text-base leading-tight">LapanbelasCoffee</h2>
        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <span className="text-xs text-slate-300 block">Kasir</span>
            <span className="font-bold">{currentUser?.name.split(' ')[0] || 'Kasir'}</span>
          </div>
        </div>
      </div>

      {/* Order Type Tabs */}
      <div className="bg-primary p-2 flex gap-1">
        {(["Dine In", "Take Out"] as const).map(type => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${
              orderType === type ? "bg-white text-primary" : "bg-primary text-white hover:bg-white/10 border border-white/20"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Customer Name Input */}
      <div className="p-3 border-b border-slate-200 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Nama Pelanggan (opsional)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="flex-1 bg-slate-100 border-none px-3 py-2.5 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
        />
        <button className="bg-slate-100 p-2.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors">
          <span className="material-symbols-outlined text-xl">person_search</span>
        </button>
      </div>

      {/* Cart List Header */}
      <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-100 bg-slate-50">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Pesanan {orderType} {activeTableId && <span className="text-primary font-extrabold ml-1">({activeTableName || `Meja ${activeTableId}`})</span>}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">{cart.length} item</span>
          {cart.length > 0 && (
            <button
              onClick={() => onCancel?.()}
              className="text-[10px] bg-red-100 text-red-600 hover:bg-red-500 hover:text-white font-bold px-3 py-1 rounded-md transition-colors border border-red-200 hover:border-red-500 shadow-sm ml-2"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto bg-slate-50 relative custom-scrollbar">
        {cart.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-4">
            <span className="material-symbols-outlined text-6xl">shopping_cart</span>
            <p className="text-sm font-medium">Keranjang Kosong</p>
            <p className="text-xs text-center px-8">Klik produk di sebelah kanan untuk menambahkan pesanan</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="font-bold text-[15px] text-slate-800 truncate leading-tight">{item.product.name}</h4>
                      <span className="text-primary font-bold text-sm whitespace-nowrap">
                        Rp {(calculateItemUnitPrice(item) * item.quantity).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 mb-2">
                      {(() => {
                        const isDrink = ["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE"].includes((item.product.category || "").toUpperCase());
                        const parts = [];
                        if (isDrink) {
                          if (item.selectedMood) parts.push(item.selectedMood === "Cold" || item.selectedMood === "Ice" ? "Dingin" : "Panas");
                        }
                        return parts.filter(Boolean).join(" · ");
                      })()}
                    </p>
                    {item.notes && <p className="text-[11px] font-medium text-slate-400 italic mb-2 break-words">"{item.notes}"</p>}
                  </div>

                  {/* Actions (Qty, Notes, Delete) */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 bg-[#f5efe9] p-1 rounded-xl">
                      <button
                        onClick={() => handleQtyChange(item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#4a2d21] hover:bg-[#e8ded5] transition-colors font-black text-sm shadow-sm"
                      >
                        −
                      </button>
                      <span className="font-black text-sm text-slate-800 w-6 text-center">x{item.quantity}</span>
                      <button
                        onClick={() => handleQtyChange(item.id, +1)}
                        className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#4a2d21] hover:bg-[#e8ded5] transition-colors font-black text-sm shadow-sm"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="flex items-center gap-1.5 bg-[#f5efe9] hover:bg-[#e8ded5] text-[#4a2d21] px-3 py-1.5 rounded-xl transition-colors"
                      >
                        <span className="text-sm font-bold">Catatan</span>
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      <div className="p-4 bg-white border-t border-slate-200 space-y-3">
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex justify-between items-center text-sm font-bold text-slate-500">
            <span>Subtotal</span>
            <span>Rp {subtotal.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
            <span className="text-sm font-bold text-slate-700">Total Pembayaran</span>
            <span className="text-xl font-extrabold text-[#4d3227]">
              Rp {total.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {cart.length > 0 && (
            <button
              onClick={() => onSaveOrder?.(customerName)}
              className="w-full py-2.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl font-bold uppercase tracking-wide transition-all text-sm"
            >
              Simpan Pesanan
            </button>
          )}
          <button
            onClick={() => {
              if (cart.length === 0) return;
              onCheckout(customerName);
            }}
            disabled={cart.length === 0}
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wide transition-all text-sm ${
              cart.length > 0
                ? "bg-primary text-white hover:brightness-110 active:scale-95 shadow-lg shadow-primary/30 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Bayar Sekarang
          </button>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-extrabold text-slate-800 truncate">{editingItem.product.name}</h2>
              <button onClick={() => setEditingItem(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveItemEdit} className="p-5 space-y-4">
              


              {/* Mood Selection (Coffee/Drinks Only) */}
              {(editingItem.product.category === "COFFEE" || editingItem.product.category === "NON-COFFEE" || editingItem.product.category === "TEA" || editingItem.product.category === "SIGNATURE") && editingItem.product.moods && editingItem.product.moods.length > 0 && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipe Minuman</label>
                    <div className="grid grid-cols-2 gap-2">
                      {editingItem.product.moods.map((mood) => (
                        <button 
                          key={mood}
                          type="button"
                          onClick={() => setEditingItem({...editingItem, selectedMood: mood})}
                          className={`py-2 px-2 flex flex-col items-center justify-center rounded-xl text-sm font-bold border-2 transition-all gap-1 ${editingItem.selectedMood === mood ? (mood === "Cold" || mood === "Ice" ? "border-blue-600 bg-blue-600 text-white" : "border-[#4a2d21] bg-[#4a2d21] text-white") : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                        >
                          <span>{mood === "Cold" || mood === "Ice" ? "Ice (Cold)" : mood}</span>
                          {editingItem.product.priceModifiers?.[mood] ? (
                            <span className={`text-[10px] leading-none ${editingItem.selectedMood === mood ? "text-white/80" : (mood === "Cold" || mood === "Ice" ? "text-blue-600" : "text-[#4a2d21]")}`}>
                              +Rp{(editingItem.product.priceModifiers[mood]).toLocaleString('id-ID')}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan Pesanan</label>
                <textarea 
                  value={editingItem.notes || ""}
                  onChange={e => setEditingItem({...editingItem, notes: e.target.value})}
                  placeholder="Cth: Jangan terlalu manis, ekstra shot..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]/20 focus:border-[#4a2d21] transition-all resize-none text-sm"
                  rows={2}
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full py-3.5 rounded-xl font-bold bg-[#4a2d21] text-white hover:bg-[#382016] shadow-md transition-all active:scale-95"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
