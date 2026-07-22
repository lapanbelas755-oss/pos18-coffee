import React, { useState } from "react";
import CartPanel from "../../components/pos/CartPanel";
import ProductMenu from "../../components/pos/ProductMenu";
import TableGrid from "../../components/pos/TableGrid";
import VariantSelectionModal from "../../components/pos/VariantSelectionModal";
import { CartItem, Product, TableData, Promo } from "../../types";

interface POSDashboardProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onPrintBills: (customerName?: string, promo?: Promo | null) => void;
  onSaveOrder: (tableId: string, tableName: string) => void;
  viewMode: "table" | "menu";
  tables: TableData[];
  setTables: React.Dispatch<React.SetStateAction<TableData[]>>;
  activeTableId: string | null;
  setActiveTableId: React.Dispatch<React.SetStateAction<string | null>>;
  onNotify: (message: string, type?: "success" | "warning" | "info") => void;
}

export default function POSDashboard({
  products,
  cart,
  setCart,
  onPrintBills,
  onSaveOrder,
  tables,
  setTables,
  activeTableId,
  setActiveTableId,
  onNotify
}: POSDashboardProps) {
  const [orderType, setOrderType] = useState<"Dine In" | "Take Out">("Dine In");
  const [customerName, setCustomerName] = useState("");
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  // Synced customerName logic
  React.useEffect(() => {
    if (activeTableId) {
      const selectedTable = tables.find(t => t.id === activeTableId);
      if (selectedTable && selectedTable.customerName) {
        setCustomerName(selectedTable.customerName);
      }
    }
  }, [activeTableId, tables]);

  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [search, setSearch] = useState("");

  const handleOrderTypeChange = (type: "Dine In" | "Take Out") => {
    setOrderType(type);
    setActiveTableId(null);
  };

  const handleCancel = () => {
    setCart([]);
    setCustomerName("");
    setActiveTableId(null);
  };

  const computedViewMode = (orderType === "Dine In" && !activeTableId) ? "table" : "menu";

  const confirmAddToCart = (product: Product, size: string, mood: string, notes: string) => {
    const variantKey = [size, mood, notes].filter(Boolean).join("_") || "def";
    const cartItemId = `${product.id}-${variantKey}-${orderType}`;

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
        selectedSize: size,
        selectedSugar: product.sugars?.[0] || "Normal",
        selectedIce: product.ices?.[0] || "Normal",
        selectedMood: mood,
        notes: notes
      }];
    });
  };

  const handleAddToCart = (product: Product) => {
    if ((product.stock ?? 999) <= 0) return;

    const activeMoods = (product.moods || []).filter(m => Boolean(m && m.trim()));
    const activeSizes = (product.sizes || []).filter(s => Boolean(s && s.trim()));
    const isRealSizes = activeSizes.length > 0 && !(activeSizes.length === 1 && activeSizes[0] === "M" && !product.priceModifiers?.["M"]);

    const needsVariantModal = activeMoods.length > 0 || isRealSizes;

    if (needsVariantModal) {
      setSelectedProductForVariant(product);
    } else {
      confirmAddToCart(product, "", "", "");
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-100 overflow-hidden relative">
      {/* Left: Cart & Customer Info */}
      <CartPanel
        cart={cart}
        setCart={setCart}
        orderType={orderType}
        setOrderType={handleOrderTypeChange}
        customerName={customerName}
        setCustomerName={setCustomerName}
        onCheckout={onPrintBills}
        onSaveOrder={() => activeTableId && onSaveOrder(activeTableId, tables.find(t => t.id === activeTableId)?.name || "Unknown")}
        onCancel={handleCancel}
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

      {/* Variant Selection Modal */}
      {selectedProductForVariant && (
        <VariantSelectionModal
          product={selectedProductForVariant}
          onClose={() => setSelectedProductForVariant(null)}
          onConfirm={(size, mood, notes) => {
            confirmAddToCart(selectedProductForVariant, size, mood, notes);
            setSelectedProductForVariant(null);
          }}
        />
      )}
    </div>
  );
}
