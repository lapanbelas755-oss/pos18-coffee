import React, { useState, useEffect } from "react";
import { Product, CartItem, TableData, Promo } from "../../types";
import CartPanel from "../../components/pos/CartPanel";
import ProductMenu from "../../components/pos/ProductMenu";
import TableGrid from "../../components/pos/TableGrid";

interface POSDashboardProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onPrintBills: (customerName?: string, promo?: Promo | null) => void;
  onSaveOrder?: (customerName?: string) => void;
  viewMode?: "menu" | "table";
  tables?: TableData[];
  setTables?: React.Dispatch<React.SetStateAction<TableData[]>>;
  activeTableId?: string | null;
  setActiveTableId?: (id: string | null) => void;
  onNotify?: (msg: string, type: "success"|"error"|"warning"|"info") => void;
}

export default function POSDashboard({
  products,
  cart,
  setCart,
  onPrintBills,
  onSaveOrder = () => {},
  viewMode = "menu",
  tables = [],
  setTables,
  activeTableId = null,
  setActiveTableId = () => {},
  onNotify
}: POSDashboardProps) {
  const [orderType, setOrderType] = useState<"Dine In" | "Take Out">("Dine In");
  const [customerName, setCustomerName] = useState("");

  // Auto-clear customerName when cart is empty
  useEffect(() => {
    if (cart.length === 0) setCustomerName("");
  }, [cart.length]);

  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [search, setSearch] = useState("");

  const handleOrderTypeChange = (type: "Dine In" | "Take Out") => {
    setOrderType(type);
    setActiveTableId(null); // Reset meja setiap ganti tipe pesanan
  };

  const computedViewMode = (orderType === "Dine In" && !activeTableId) ? "table" : "menu";

  const handleAddToCart = (product: Product) => {
    if ((product.stock ?? 999) <= 0) return;

    // Buat key unik berdasarkan produk + tipe pesanan saja (tanpa duplikasi per modifier)
    const cartItemId = `${product.id}-${orderType}`;

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
        selectedSize: product.sizes[0] || "M",
        selectedSugar: product.sugars[0] || "Normal",
        selectedIce: product.ices[0] || "Normal",
        selectedMood: product.moods[0] || "Cold",
        notes: ""
      }];
    });
  };

  return (
    <div className="flex h-full w-full bg-slate-100 overflow-hidden">
      {/* Left: Cart & Customer Info */}
      <CartPanel
        cart={cart}
        setCart={setCart}
        orderType={orderType}
        setOrderType={handleOrderTypeChange}
        customerName={customerName}
        setCustomerName={setCustomerName}
        onCheckout={onPrintBills}
        onSaveOrder={onSaveOrder}
        activeTableId={activeTableId}
        activeTableName={activeTableId ? tables.find(t => t.id === activeTableId)?.name : undefined}
      />

      {/* Right: Menu or Table Grid */}
      {computedViewMode === "menu" ? (
        <ProductMenu
          products={products}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          search={search}
          setSearch={setSearch}
          onAddToCart={handleAddToCart}
        />
      ) : (
        <TableGrid 
          tables={tables}
          setTables={setTables}
          activeTableId={activeTableId}
          setActiveTableId={setActiveTableId}
          setCart={setCart}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}
