import React, { useState } from "react";
import { Product, CartItem, Order, KdsOrder } from "../types";
import { formatRupiah } from "../utils";
import { calculateItemUnitPrice } from "../utils/pricing";

interface POSViewProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onPrintBills: () => void;
}

export default function POSView({ products, cart, setCart, onPrintBills }: POSViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Kopi");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Product customization state (keyed by product ID)
  const [customizations, setCustomizations] = useState<Record<string, {
    size: string;
    sugar: string;
    ice: string;
    mood: string;
  }>>({});

  const getCustomization = (prod: Product) => {
    return customizations[prod.id] || {
      size: prod.sizes[1] || prod.sizes[0] || "M",
      sugar: prod.sugars[1] || prod.sugars[0] || "50%",
      ice: prod.ices[1] || prod.ices[0] || "50%",
      mood: prod.moods[1] || prod.moods[0] || "Cold"
    };
  };

  const updateCustomization = (prodId: string, field: string, val: string) => {
    setCustomizations(prev => ({
      ...prev,
      [prodId]: {
        ...getCustomization(products.find(p => p.id === prodId)!),
        [field]: val
      }
    }));
  };

  const handleAddToCart = (product: Product) => {
    const cust = getCustomization(product);
    const cartItemId = `${product.id}-${cust.size}-${cust.sugar}-${cust.ice}-${cust.mood}`;

    setCart(prev => {
      const exists = prev.find(item => item.id === cartItemId);
      if (exists) {
        return prev.map(item =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        id: cartItemId,
        product,
        quantity: 1,
        selectedSize: cust.size,
        selectedSugar: cust.sugar,
        selectedIce: cust.ice,
        selectedMood: cust.mood,
        notes: ""
      }];
    });
  };

  const handleUpdateQty = (itemId: string, increment: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const nextQty = item.quantity + increment;
        return nextQty > 0 ? { ...item, quantity: nextQty } : item;
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setCart(prev => prev.map(item =>
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  const categories = [
    { name: "Semua", icon: "apps" },
    { name: "Kopi", icon: "coffee" },
    { name: "Jus Segar", icon: "local_drink" },
    { name: "Susu & Matcha", icon: "glass_cup" },
    { name: "Camilan", icon: "cookie" },
    { name: "Makanan Utama", icon: "flatware" },
    { name: "Kue & Dessert", icon: "cake" }
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "Semua" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const subtotal = cart.reduce((acc, item) => acc + calculateItemUnitPrice(item) * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Debit Card" | "E-Wallet">("Debit Card");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Central Menu Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pr-[380px]">
        {/* Header bar within Workspace */}
        <header className="flex items-center justify-between px-6 py-4 h-20 bg-background flex-shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="font-sans text-2xl font-bold text-primary">Menu</h1>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                className="pl-12 pr-6 py-2.5 bg-surface-container border-none rounded-full w-[320px] font-sans text-sm text-on-surface focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Cari kategori atau menu..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-all active:scale-95">
              <span className="material-symbols-outlined">location_on</span>
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-all relative active:scale-95">
              <span className="material-symbols-outlined">notifications</span>
              <div className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border border-background"></div>
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-all active:scale-95">
              <span className="material-symbols-outlined">smart_toy</span>
            </button>
          </div>
        </header>

        {/* Categories Scroller */}
        <section className="px-6 py-3 overflow-x-auto whitespace-nowrap flex gap-4 no-scrollbar flex-shrink-0">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <div
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all ${
                    isActive
                      ? "bg-primary border-primary text-white shadow-[0_4px_12px_rgba(68,40,26,0.15)] scale-105"
                      : "bg-surface-container-lowest border-outline-variant/30 hover:border-primary/50 text-secondary"
                  }`}
                >
                  <span className="material-symbols-outlined">{cat.icon}</span>
                </div>
                <span className={`text-xs font-bold ${isActive ? "text-primary" : "text-secondary"}`}>
                  {cat.name}
                </span>
              </div>
            );
          })}
        </section>

        {/* Coffee Menu Title */}
        <div className="px-6 py-3 flex items-center justify-between flex-shrink-0 mt-2">
          <h2 className="text-xl font-bold text-on-surface">Menu {selectedCategory}</h2>
          <span className="text-xs font-medium text-on-surface-variant">
            {filteredProducts.length} hasil
          </span>
        </div>

        {/* Products Grid Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => {
              const cust = getCustomization(prod);
              return (
                <div
                  key={prod.id}
                  className="bg-surface-container-lowest rounded-[24px] p-5 flex flex-col gap-4 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/20 hover:translate-y-[-4px] hover:shadow-lg transition-all"
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                      <img className="w-full h-full object-cover" src={prod.image} alt={prod.name} referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-base leading-tight text-on-surface tracking-tight">{prod.name}</h3>
                        <span className="font-bold text-primary text-sm whitespace-nowrap">{formatRupiah(prod.price)}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{prod.description}</p>
                    </div>
                  </div>

                  {/* Modifiers Grid */}
                  <div className="grid grid-cols-2 gap-4 border-t border-dashed border-outline-variant/20 pt-3">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1.5 font-bold">Penyajian</p>
                      <div className="flex gap-1.5">
                        {prod.moods.map(m => {
                          const mActive = cust.mood === m;
                          return (
                            <button
                              key={m}
                              onClick={() => updateCustomization(prod.id, "mood", m)}
                              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors text-xs font-bold ${
                                mActive
                                  ? "border-primary bg-primary-fixed text-primary"
                                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                              }`}
                              title={m === "Hot" ? "Panas" : "Dingin"}
                            >
                              <span className="material-symbols-outlined text-[16px]">{m === "Hot" ? "local_fire_department" : "ac_unit"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1.5 font-bold">Ukuran</p>
                      <div className="flex gap-1">
                        {prod.sizes.map(s => {
                          const sActive = cust.size === s;
                          return (
                            <button
                              key={s}
                              onClick={() => updateCustomization(prod.id, "size", s)}
                              className={`w-8 h-8 rounded-full border font-bold text-[11px] flex items-center justify-center transition-colors ${
                                sActive
                                  ? "border-primary bg-primary text-white"
                                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1.5 font-bold">Gula</p>
                      <div className="flex gap-1">
                        {prod.sugars.map(su => {
                          const suActive = cust.sugar === su;
                          return (
                            <button
                              key={su}
                              onClick={() => updateCustomization(prod.id, "sugar", su)}
                              className={`px-2 h-8 rounded-full border font-bold text-[10px] flex items-center justify-center transition-colors ${
                                suActive
                                  ? "border-primary bg-primary text-white"
                                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                              }`}
                            >
                              {su}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1.5 font-bold">Es</p>
                      <div className="flex gap-1">
                        {prod.ices.map(ic => {
                          const icActive = cust.ice === ic;
                          return (
                            <button
                              key={ic}
                              onClick={() => updateCustomization(prod.id, "ice", ic)}
                              className={`px-2 h-8 rounded-full border font-bold text-[10px] flex items-center justify-center transition-colors ${
                                icActive
                                  ? "border-primary bg-primary text-white"
                                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                              }`}
                            >
                              {ic}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddToCart(prod)}
                    className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-sm mt-1 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                    Tambah ke Tagihan
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Bills Side Panel */}
      <aside className="fixed right-0 top-0 h-full w-[380px] bg-surface-container-low border-l border-outline-variant/30 flex flex-col p-6 z-40">
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-on-surface">Tagihan</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">shopping_basket</span>
            <span className="text-xs font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)} Item
            </span>
          </div>
        </div>

        {/* Bill Items list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">production_quantity_limits</span>
              <p className="text-sm font-bold text-primary">Keranjang Anda kosong</p>
              <p className="text-xs text-on-surface-variant mt-1">Pilih menu di sebelah kiri untuk dikustomisasi.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-3 bg-white p-3 rounded-2xl border border-outline-variant/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative group">
                <img
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  src={item.product.image}
                  alt={item.product.name}
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-on-surface truncate pr-2">{item.product.name}</p>
                    <p className="text-xs font-bold text-primary">{formatRupiah(calculateItemUnitPrice(item) * item.quantity)}</p>
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 font-semibold">
                    {item.selectedSize} · {item.selectedMood === "Hot" ? "Panas" : item.selectedMood === "Cold" ? "Dingin" : item.selectedMood} · Es: {item.selectedIce} · Gula: {item.selectedSugar}
                  </p>
                  {item.notes && (
                    <p className="text-[10px] text-amber-800 italic mt-0.5">
                      • {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-5 h-5 rounded bg-surface-container flex items-center justify-center text-xs hover:bg-outline-variant/30 active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-on-surface-variant">x {item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-5 h-5 rounded bg-surface-container flex items-center justify-center text-xs hover:bg-outline-variant/30 active:scale-95 cursor-pointer"
                      >
                        +
                      </button>

                      <button
                        onClick={() => {
                          setEditingNoteId(item.id);
                          setTempNoteText(item.notes);
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[9px] font-bold hover:bg-outline-variant/30 transition-colors cursor-pointer"
                      >
                        Catatan <span className="material-symbols-outlined text-[10px]">edit</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Note Editing Form Overlay Inline */}
        {editingNoteId && (
          <div className="bg-white/95 border border-outline-variant p-4 rounded-xl shadow-md my-2 flex-shrink-0 transition-all">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">Tambah Catatan Item</p>
            <input
              type="text"
              className="w-full bg-surface-container text-xs rounded-lg p-2 border-none focus:ring-1 focus:ring-primary outline-none"
              placeholder="misal: Kurang es, susu hangat..."
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setEditingNoteId(null)}
                className="px-2.5 py-1 text-[10px] bg-surface-container rounded-md hover:bg-outline-variant/30 font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleUpdateNotes(editingNoteId, tempNoteText);
                  setEditingNoteId(null);
                }}
                className="px-2.5 py-1 text-[10px] bg-primary text-white rounded-md hover:opacity-90 font-bold cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        )}

        {/* Subtotal, Tax, Total Summary */}
        <div className="mt-4 pt-4 border-t border-outline-variant/30 space-y-2 flex-shrink-0">
          <div className="flex justify-between text-xs font-bold text-on-surface-variant">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-on-surface-variant">
            <span>Pajak (10% PB1)</span>
            <span>{formatRupiah(tax)}</span>
          </div>
          <div className="h-[1px] w-full border-t border-dashed border-outline-variant my-1"></div>
          <div className="flex justify-between items-end mb-4">
            <span className="font-bold text-sm text-on-surface">Total</span>
            <span className="font-extrabold text-lg text-primary">{formatRupiah(total)}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="mt-auto flex-shrink-0">
          <h3 className="text-xs font-bold text-on-surface mb-3 uppercase tracking-wider">Metode Pembayaran</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod("Cash")}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === "Cash"
                  ? "bg-white border-2 border-primary shadow-[0_4px_12px_rgba(68,40,26,0.15)]"
                  : "bg-surface-container border-outline-variant/20 hover:border-primary/40 text-on-surface-variant"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${paymentMethod === "Cash" ? "text-primary" : ""}`}>payments</span>
              <span className="text-[9px] font-bold">Tunai</span>
            </button>

            <button
              onClick={() => setPaymentMethod("Debit Card")}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === "Debit Card"
                  ? "bg-white border-2 border-primary shadow-[0_4px_12px_rgba(68,40,26,0.15)]"
                  : "bg-surface-container border-outline-variant/20 hover:border-primary/40 text-on-surface-variant"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${paymentMethod === "Debit Card" ? "text-primary" : ""}`}>credit_card</span>
              <span className="text-[9px] font-bold">Debit</span>
            </button>

            <button
              onClick={() => setPaymentMethod("E-Wallet")}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === "E-Wallet"
                  ? "bg-white border-2 border-primary shadow-[0_4px_12px_rgba(68,40,26,0.15)]"
                  : "bg-surface-container border-outline-variant/20 hover:border-primary/40 text-on-surface-variant"
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${paymentMethod === "E-Wallet" ? "text-primary" : ""}`}>qr_code_2</span>
              <span className="text-[9px] font-bold">E-Wallet</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (cart.length > 0) {
                onPrintBills();
              }
            }}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-2xl text-base font-bold mt-4 flex items-center justify-center gap-3 transition-all shadow-lg cursor-pointer ${
              cart.length === 0
                ? "bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none"
                : "bg-primary text-white hover:brightness-110 active:scale-[0.98]"
            }`}
          >
            <span className="material-symbols-outlined">print</span>
            Cetak Tagihan
          </button>
        </div>
      </aside>
    </div>
  );
}
