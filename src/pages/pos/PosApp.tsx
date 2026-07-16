import React, { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import POSLayout from "../../layouts/POSLayout";
import { initialProducts, initialKdsOrders, initialStockItems, initialRecipes, initialWasteLogs, initialTransactions, initialTables, initialOrders } from "../../data";
import { CartItem, KdsOrder, StockItem, RecipeItem, WasteLog, Transaction, TableData, Order, Product, Promo } from "../../types";
import POSDashboard from "./POSDashboard";
import POSItemView from "./POSItemView";
import POSOnlineView from "./POSOnlineView";
import POSOrdersHistoryView from "./POSOrdersHistoryView";
import POSShiftView from "./POSShiftView";
import POSPromoView from "./POSPromoView";
import POSBiayaView from "./POSBiayaView";
import POSTableManagementView from "./POSTableManagementView";
import POSSettingsView from "./POSSettingsView";
import POSLogoutView from "./POSLogoutView";
import KDSView from "../../components/KDSView";
import PaymentModal from "../../components/pos/PaymentModal";
import { supabase } from "../../lib/supabase";
import { calculateItemUnitPrice } from "../../utils/pricing";
import { calculateMaxServings } from "../../utils/inventory";
import { printerManager } from "../../lib/bluetoothPrinter";
import { buildReceiptData, buildKdsTicketData } from "../../utils/escpos";
import { usePosStore } from "../../store/posStore";
import { useAuthStore } from "../../store/authStore";
import { sendTelegramNotification } from "../../utils/telegram";

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "warning" | "info";
}

export default function PosApp() {
  const { setPromos, isPrinterConnected } = usePosStore();
  const { currentUser } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [kdsOrders, setKdsOrders] = useState<KdsOrder[]>([]);

  // Note: Since Admin and POS are isolated, these are POS's local copy of stock, recipes, transactions.
  // In a real app with a backend, they would fetch from an API.
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [tables, setTables] = useState<TableData[]>([]);
  const [posOrders, setPosOrders] = useState<Order[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  const [dailyPrepCount, setDailyPrepCount] = useState(75);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<KdsOrder | null>(null);

  useEffect(() => {
    // 1. Fetch Initial Data
    const fetchInitialData = async () => {
      const { data: tablesData } = await supabase.from('tables').select('*').order('id');
      if (tablesData && tablesData.length > 0) setTables(tablesData);

      const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (ordersData && ordersData.length > 0) setPosOrders(ordersData);

      const { data: kdsData } = await supabase.from('kds_orders').select('*').order('created_at', { ascending: false });
      if (kdsData && kdsData.length > 0) setKdsOrders(kdsData);

      const { data: productsData } = await supabase.from('products').select('*').order('id');
      if (productsData && productsData.length > 0) {
        setProducts(productsData.map(p => ({ ...p, priceModifiers: p.price_modifiers })));
      }

      const { data: stockData } = await supabase.from('stock_items').select('*').order('sku');
      if (stockData && stockData.length > 0) {
        setStockItems(stockData.map(s => ({ ...s, stockLevel: s.stock_level, minStock: s.min_stock, unitCost: s.unit_cost })));
      }

      const { data: recipesData } = await supabase.from('recipes').select('*').order('id');
      if (recipesData && recipesData.length > 0) {
        setRecipes(recipesData.map(r => ({
          ...r,
          cogs: r.cogs,
          sellPrice: r.sell_price,
          profitMargin: r.profit_margin,
          lastUpdated: r.last_updated,
        })));
      }
    };
    fetchInitialData();

    // 2. Realtime Subscriptions
    const tablesSub = supabase.channel('tables-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, payload => {
        if (payload.eventType === 'UPDATE') {
          setTables(prev => prev.map(t => t.id === payload.new.id ? payload.new as TableData : t));
        } else if (payload.eventType === 'INSERT') {
          setTables(prev => {
            if (prev.find(t => t.id === payload.new.id)) return prev.map(t => t.id === payload.new.id ? payload.new as TableData : t);
            return [...prev, payload.new as TableData].sort((a, b) => a.id.localeCompare(b.id));
          });
        }
      }).subscribe();

    const ordersSub = supabase.channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        if (payload.eventType === 'INSERT') {
          setPosOrders(prev => {
            if (prev.find(o => o.id === payload.new.id)) return prev;
            return [payload.new as Order, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          setPosOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
        }
      }).subscribe();

    const kdsSub = supabase.channel('kds-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kds_orders' }, payload => {
        if (payload.eventType === 'INSERT') {
          setKdsOrders(prev => {
            if (prev.find(k => k.id === payload.new.id)) return prev;
            return [payload.new as KdsOrder, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          setKdsOrders(prev => prev.map(k => k.id === payload.new.id ? payload.new as KdsOrder : k));
        }
      }).subscribe();

    const productsSub = supabase.channel('products-pos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
        if (payload.eventType === 'INSERT') {
          setProducts(prev => {
            if (prev.find(p => p.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, priceModifiers: payload.new.price_modifiers } as Product];
          });
        } else if (payload.eventType === 'UPDATE') {
          setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...payload.new, priceModifiers: payload.new.price_modifiers } as Product : p));
        } else if (payload.eventType === 'DELETE') {
          setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      }).subscribe();

    const handleStorageChange = (e: StorageEvent | CustomEvent | any) => {
      if (e.key === "pending_online_orders" || e.type === "storage") {
        const pending = JSON.parse(localStorage.getItem("pending_online_orders") || "[]");
        if (pending.length > 0) {
          setPosOrders(prev => [...pending, ...prev]);
          localStorage.removeItem("pending_online_orders");
          const msg = pending.length === 1
            ? `Pesanan Online baru dari Meja ${pending[0].table} (Rp${pending[0].total.toLocaleString('id-ID')})`
            : `Masuk ${pending.length} pesanan online baru!`;
          triggerToast(msg, "success");
        }
      }
    };

    handleStorageChange({ key: "pending_online_orders" });
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      supabase.removeChannel(tablesSub);
      supabase.removeChannel(ordersSub);
      supabase.removeChannel(kdsSub);
      supabase.removeChannel(productsSub);
    };
  }, []);

  // Broadcast posOrders to TV Queue Display
  useEffect(() => {
    localStorage.setItem("tv_queue_orders", JSON.stringify(posOrders));
    window.dispatchEvent(new Event("storage"));
  }, [posOrders]);

  const computedProducts = useMemo(() => {
    const normalizeName = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '');
    return products.map(prod => {
      const normalizedProdName = normalizeName(prod.name);
      const recipe = recipes.find(r => {
        const normalizedRecipeName = normalizeName(r.name);
        return normalizedRecipeName === normalizedProdName ||
          normalizedProdName.includes(normalizedRecipeName) ||
          normalizedRecipeName.includes(normalizedProdName);
      });
      if (recipe) {
        const res = calculateMaxServings(recipe, stockItems);
        return { ...prod, stock: res.maxServings };
      }
      return prod;
    });
  }, [products, recipes, stockItems]);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutCustomerName, setCheckoutCustomerName] = useState<string | undefined>();
  const [checkoutPromo, setCheckoutPromo] = useState<Promo | null>(null);
  const [printedReceiptDetails, setPrintedReceiptDetails] = useState<{
    orderId: string;
    items: { name: string; qty: number; price: number; notes?: string }[];
    subtotal: number;
    discount: number;
    discountName?: string;
    tax: number;
    total: number;
    customerName?: string;
    paymentMethod?: string;
    amountGiven?: number;
    change?: number;
    queue?: string;
    table?: string;
  } | null>(null);

  const triggerToast = (message: string, type: "success" | "warning" | "info" = "success") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handlePrintBillsCheckout = (method: string, amountGiven?: number, change?: number, itemsToCheckOut: CartItem[] = cart) => {
    if (itemsToCheckOut.length === 0) return;

    // --- CHECK PB1 Tax ---
    let taxRate = 0.11; // Default 11%
    const savedBiaya = localStorage.getItem("pos_biaya_settings");
    if (savedBiaya) {
      try {
        const biayaList = JSON.parse(savedBiaya);
        const pb1 = biayaList.find((b: any) => b.id === "FEE-001"); // Pajak Restoran
        if (pb1 && !pb1.isActive) {
          taxRate = 0; // Tax is turned off
        } else if (pb1 && pb1.isActive) {
          taxRate = pb1.value / 100;
        }
      } catch (e) {
        // use default
      }
    }

    const subtotal = itemsToCheckOut.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0);
    
    let discount = 0;
    if (checkoutPromo) {
      if (checkoutPromo.type === "Persentase") {
        discount = (subtotal * checkoutPromo.value) / 100;
      } else if (checkoutPromo.type === "Nominal") {
        discount = checkoutPromo.value;
      } else if (checkoutPromo.type === "Karyawan") {
        const drink = itemsToCheckOut.find(item => 
          item.product.category.toLowerCase().includes('kopi') || 
          item.product.category.toLowerCase().includes('minuman') || 
          item.product.category.toLowerCase().includes('tea') ||
          item.product.category.toLowerCase().includes('signature') ||
          item.product.category.toLowerCase().includes('coffee')
        );
        if (drink) {
          discount = calculateItemUnitPrice(drink);
        } else {
          discount = 0;
        }
      }
    }
    
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = Math.round(discountedSubtotal * taxRate);
    const total = discountedSubtotal + tax;
    const ticketId = `T-${Math.floor(100 + Math.random() * 899)}`;

    const queue = ticketId.slice(-2);
    const tableName = activeTableId ? tables.find(t => t.id === activeTableId)?.name : undefined;

    const receiptData = {
      orderId: ticketId,
      items: itemsToCheckOut.map(item => {
        const isDrink = ["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE"].includes((item.product.category || "").toUpperCase());
        const nameDesc = isDrink && item.selectedMood ? `${item.product.name} (${item.selectedMood})` : item.product.name;
        return {
          name: nameDesc,
          qty: item.quantity,
          price: calculateItemUnitPrice(item),
          notes: item.notes
        };
      }),
      subtotal, discount, discountName: checkoutPromo ? checkoutPromo.title : undefined, tax, total,
      paymentMethod: method,
      amountGiven,
      change,
      customerName: checkoutCustomerName, // Assign saved name
      queue,
      table: tableName
    };
    
    setPrintedReceiptDetails(receiptData);

    // Bluetooth Printing Logic
    if (isPrinterConnected) {
      const dataToPrint = buildReceiptData(
        receiptData.orderId,
        receiptData.items,
        receiptData.subtotal,
        receiptData.discount,
        receiptData.tax,
        receiptData.total,
        receiptData.paymentMethod || "UNKNOWN",
        receiptData.amountGiven,
        receiptData.change,
        receiptData.customerName,
        receiptData.discountName,
        true, // isPaid
        receiptData.table,
        receiptData.queue
      );
      printerManager.print(dataToPrint);
      // We don't show the modal if physical printer is used
    } else {
      setShowReceiptModal(true);
    }

    const tableAlreadySaved = activeTableId && tables.find(t => t.id === activeTableId)?.status === "Sudah Dipesan";

    if (!tableAlreadySaved) {
      const isKitchenItem = (category: string) => {
        const c = category.toLowerCase();
        return c.includes('food') || c.includes('makanan') || c.includes('snack') || c.includes('pastry');
      };

      const baristaCart = itemsToCheckOut.filter(i => !isKitchenItem(i.product.category));
      const kitchenCart = itemsToCheckOut.filter(i => isKitchenItem(i.product.category));

      const kdsOrdersToInsert: KdsOrder[] = [];
      const dbPayloadsToInsert: any[] = [];
      const finalCustomerName = checkoutCustomerName || (activeTableId ? (tables.find(t => t.id === activeTableId)?.customerName || null) : null);

      if (baristaCart.length > 0) {
        const baristaItems = baristaCart.map((item, idx) => ({
          id: `pos-${ticketId}-B-${idx}`,
          name: `${item.quantity}x ${item.product.name}`,
          notes: (["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE"].includes((item.product.category || "").toUpperCase()))
            ? `${item.selectedSize} · Ice: ${item.selectedIce} · Sugar: ${item.selectedSugar} ${item.notes ? `(${item.notes})` : ""}`
            : `${item.selectedSize} ${item.notes ? `(${item.notes})` : ""}`,
          checked: false
        }));

        kdsOrdersToInsert.push({
          id: `${ticketId}-B`,
          type: activeTableId ? "Dine In" : "Takeaway",
          table: activeTableId || undefined,
          timeInSeconds: 0,
          status: "incoming",
          station: "barista",
          customerName: finalCustomerName,
          items: baristaItems
        });

        dbPayloadsToInsert.push({
          id: `${ticketId}-B`,
          type: activeTableId ? "Dine In" : "Takeaway",
          table: activeTableId || null,
          time_in_seconds: 0,
          status: "incoming",
          station: "barista",
          items: baristaItems,
          customer_name: finalCustomerName
        });

        // Print KDS Ticket if printer connected
        if (isPrinterConnected) {
          const kdsData = buildKdsTicketData(
            ticketId,
            'Barista',
            baristaItems.map(i => ({ name: i.name, qty: 1, notes: i.notes })), // qty is embedded in name here, so pass 1 or extract
            checkoutCustomerName,
            true // already paid
          );
          printerManager.print(kdsData);
        }
      }

      if (kitchenCart.length > 0) {
        const kitchenItems = kitchenCart.map((item, idx) => ({
          id: `pos-${ticketId}-K-${idx}`,
          name: `${item.quantity}x ${item.product.name}`,
          notes: (["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE"].includes((item.product.category || "").toUpperCase()))
            ? `${item.selectedSize} · Ice: ${item.selectedIce} · Sugar: ${item.selectedSugar} ${item.notes ? `(${item.notes})` : ""}`
            : `${item.selectedSize} ${item.notes ? `(${item.notes})` : ""}`,
          checked: false
        }));

        kdsOrdersToInsert.push({
          id: `${ticketId}-K`,
          type: activeTableId ? "Dine In" : "Takeaway",
          table: activeTableId || undefined,
          timeInSeconds: 0,
          status: "incoming",
          station: "kitchen",
          customerName: finalCustomerName,
          items: kitchenItems
        });

        dbPayloadsToInsert.push({
          id: `${ticketId}-K`,
          type: activeTableId ? "Dine In" : "Takeaway",
          table: activeTableId || null,
          time_in_seconds: 0,
          status: "incoming",
          station: "kitchen",
          items: kitchenItems,
          customer_name: finalCustomerName
        });

        // Print KDS Ticket if printer connected
        if (isPrinterConnected) {
          const kdsData = buildKdsTicketData(
            ticketId,
            'Kitchen',
            kitchenItems.map(i => ({ name: i.name, qty: 1, notes: i.notes })),
            checkoutCustomerName,
            true // already paid
          );
          printerManager.print(kdsData);
        }
      }

      // Add Kasir KDS ticket
      const kasirItems = itemsToCheckOut.map((item, idx) => ({
        id: `pos-${ticketId}-KSR-${idx}`,
        name: `${item.quantity}x ${item.product.name}`,
        checked: false
      }));

      kdsOrdersToInsert.push({
        id: `${ticketId}-KSR`,
        type: activeTableId ? "Dine In" : "Takeaway",
        table: activeTableId || undefined,
        timeInSeconds: 0,
        status: "incoming",
        station: "kasir",
        customerName: finalCustomerName,
        items: kasirItems
      });

      dbPayloadsToInsert.push({
        id: `${ticketId}-KSR`,
        type: activeTableId ? "Dine In" : "Takeaway",
        table: activeTableId || null,
        time_in_seconds: 0,
        status: "incoming",
        station: "kasir",
        items: kasirItems,
        customer_name: finalCustomerName
      });

      if (kdsOrdersToInsert.length > 0) {
        setKdsOrders(prev => [...kdsOrdersToInsert, ...prev]);
        supabase.from('kds_orders').insert(dbPayloadsToInsert).then(res => {
          if (res.error) console.error("KDS Insert Error:", res.error);
        });
      }
    }

    // --- Deduct stock bahan baku otomatis berdasarkan gramasi resep ---
    const deductStockByRecipe = async (soldItems: CartItem[]) => {
      // Map: nama bahan (lowercase) → jumlah yg harus dikurangi (total gramasi)
      const deductMap: Record<string, number> = {};

      for (const cartItem of soldItems) {
        // Cocokkan nama produk dgn nama resep (case-insensitive)
        const recipe = recipes.find(r =>
          r.name.toLowerCase().trim() === cartItem.product.name.toLowerCase().trim()
        );
        if (!recipe) continue;

        for (const ing of recipe.ingredients) {
          const gramasi = Number(ing.rawMeasurementVal) || 0;
          if (gramasi <= 0) continue;
          const key = ing.name.toLowerCase().trim();
          deductMap[key] = (deductMap[key] || 0) + gramasi * cartItem.quantity;
        }

        // --- Intercept Cup Stock Deduction based on Mood ---
        if (cartItem.selectedMood) {
          const moodLower = cartItem.selectedMood.toLowerCase();
          if (moodLower === "hot") {
            deductMap["cup 6 oz"] = (deductMap["cup 6 oz"] || 0) + 1 * cartItem.quantity;
          } else if (moodLower === "cold" || moodLower === "ice") {
            deductMap["cup 12 oz"] = (deductMap["cup 12 oz"] || 0) + 1 * cartItem.quantity;
          }
        }
      }

      if (Object.keys(deductMap).length === 0) return;

      // Ambil data stock terbaru dari Supabase
      const { data: latestStocks } = await supabase.from('stock_items').select('*');
      if (!latestStocks) return;

      for (const [ingName, totalDeduct] of Object.entries(deductMap)) {
        // Cari stock item yang namanya cocok
        const stockRow = latestStocks.find(s =>
          s.name.toLowerCase().trim() === ingName ||
          s.name.toLowerCase().trim().includes(ingName) ||
          ingName.includes(s.name.toLowerCase().trim())
        );
        if (!stockRow) continue;

        const newStockLevel = Math.max((stockRow.stock_level || 0) - totalDeduct, 0);
        const newStatus = newStockLevel < (stockRow.min_stock || 500) ? 'Low Stock' : 'Healthy';

        // Update ke Supabase
        await supabase.from('stock_items')
          .update({ stock_level: newStockLevel, status: newStatus })
          .eq('sku', stockRow.sku);
          
        if (newStatus === 'Low Stock' && (stockRow.stock_level || 0) >= (stockRow.min_stock || 500)) {
          const message = `⚠️ *PERINGATAN STOK MINIMAL* ⚠️\n\nBahan Baku: *${stockRow.name}*\nSisa Stok: ${newStockLevel} ${stockRow.unit || ''}\nBatas Minimal: ${stockRow.min_stock || 500} ${stockRow.unit || ''}\nStatus: Perlu Segera Restok!`;
          sendTelegramNotification(message);
        }

        // Update local state juga
        setStockItems(prev => prev.map(s =>
          s.sku === stockRow.sku
            ? { ...s, stockLevel: newStockLevel, status: newStatus as StockItem['status'] }
            : s
        ));
      }
    };

    deductStockByRecipe(itemsToCheckOut);

    // --- Deduct manual stock untuk produk yang TIDAK punya resep (seperti Tahu Walik, Sosis, dll) ---
    const deductManualProductStock = async (soldItems: CartItem[]) => {
      const itemsWithoutRecipe = soldItems.filter(item => {
        const recipe = recipes.find(r => r.name.toLowerCase().trim() === item.product.name.toLowerCase().trim() || item.product.name.toLowerCase().includes(r.name.toLowerCase().split(" ")[0]));
        return !recipe;
      });

      if (itemsWithoutRecipe.length === 0) return;

      const { data: latestProducts } = await supabase.from('products').select('*');
      if (!latestProducts) return;

      for (const item of itemsWithoutRecipe) {
        const dbProduct = latestProducts.find(p => p.id === item.product.id);
        if (!dbProduct) continue;

        const currentStock = dbProduct.stock || 0;
        const newStock = Math.max(currentStock - item.quantity, 0);
        const minStock = 10; // Default min stock for direct products if not defined

        await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id);
        
        if (newStock < minStock && currentStock >= minStock) {
          const message = `⚠️ *PERINGATAN STOK MINIMAL* ⚠️\n\nProduk: *${item.product.name}*\nSisa Stok: ${newStock}\nBatas Minimal: ${minStock}\nStatus: Perlu Segera Restok!`;
          sendTelegramNotification(message);
        }

        setProducts(prev => prev.map(p => p.id === item.product.id ? { ...p, stock: newStock } : p));
      }
    };

    deductManualProductStock(itemsToCheckOut);

    // Hitung total COGS dari item yang terjual
    let totalCogs = 0;
    for (const item of itemsToCheckOut) {
      const recipe = recipes.find(r => r.name.toLowerCase().trim() === item.product.name.toLowerCase().trim() || item.product.name.toLowerCase().includes(r.name.toLowerCase().split(" ")[0]));
      if (recipe) {
        totalCogs += recipe.cogs * item.quantity;
      } else if (item.product.cogs) {
        totalCogs += item.product.cogs * item.quantity;
      }

      // --- Intercept Dynamic Cup Cost ---
      if (item.selectedMood) {
        const moodLower = item.selectedMood.toLowerCase();
        let cupCost = 0;
        if (moodLower === "hot") {
          const cupStock = stockItems.find(s => s.name.toLowerCase().trim().includes("cup 6 oz"));
          if (cupStock && cupStock.unitCost) cupCost = cupStock.unitCost;
        } else if (moodLower === "cold" || moodLower === "ice") {
          const cupStock = stockItems.find(s => s.name.toLowerCase().trim().includes("cup 12 oz"));
          if (cupStock && cupStock.unitCost) cupCost = cupStock.unitCost;
        }
        totalCogs += cupCost * item.quantity;
      }
    }

    const newTx: Transaction = {
      id: `TXN-${Date.now()}`,
      date: new Date().toLocaleDateString("id-ID"),
      title: `Checkout #${ticketId}`,
      category: "Sales",
      status: "Cleared",
      amount: total,
      type: "inflow"
    };

    const cogsTx: Transaction | null = totalCogs > 0 ? {
      id: `TXN-COGS-${Date.now()}`,
      date: new Date().toLocaleDateString("id-ID"),
      title: `COGS Checkout #${ticketId}`,
      category: "Bahan Baku",
      status: "Cleared",
      amount: totalCogs,
      type: "outflow"
    } : null;

    const txsToInsert = cogsTx ? [newTx, cogsTx] : [newTx];

    setTransactions(prev => [...txsToInsert, ...prev]);
    supabase.from('transactions').insert(txsToInsert).then(res => {
      if (res.error) console.error("Transactions Insert Error:", res.error);
    });

    triggerToast(`Pesanan #${ticketId} berhasil dikirim! Pembayaran: ${method}`, "success");

    if (checkoutPromo) {
      setPromos(prev => prev.map(p => {
        if (p.id === checkoutPromo.id) {
          if (p.type === "Karyawan") {
            return { ...p, status: "Terpakai", usage: p.usage + 1 };
          }
          return { ...p, usage: p.usage + 1 };
        }
        return p;
      }));
    }

    const newOrder: Order = {
      id: `INV-${ticketId}`,
      queue: ticketId.slice(-2),
      staff: currentUser?.name.split(' ')[0] || "Kasir",
      table: activeTableId || "-",
      pager: "-",
      customerName: checkoutCustomerName, // Save to order
      type: (activeTableId ? "Dine In" : "Take Out") as Order["type"],
      payment: method,
      amountGiven,
      change,
      status: "Selesai" as Order["status"],
      total,
      time: new Date().toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      items: cart
    };

    setPosOrders(prev => {
      if (activeTableId) {
        const existingIdx = prev.findIndex(o => o.table === activeTableId && o.status === "Unpaid");
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], status: "Selesai", payment: method, amountGiven, change };
          // Supabase Update (Optimistic)
          supabase.from('orders').update({ status: "Selesai", payment: method, amountGiven, change }).eq('id', updated[existingIdx].id).then();
          return updated;
        }
      }
      // Supabase Insert (Optimistic)
      supabase.from('orders').insert([newOrder]).then();
      return [newOrder, ...prev];
    });

    // KDS Optimistic insert handled conditionally above

    if (itemsToCheckOut.length === cart.length) {
      // Semua item dibayar → kosongkan meja
      setCart([]);
      if (activeTableId) {
        setTables(prev => prev.map(t => {
          if (t.id === activeTableId || t.linkedTo === activeTableId) {
            const updated: TableData = { ...t, status: "Kosong", cart: [], current: 0, linkedTo: undefined, customerName: undefined, time: "" };
            supabase.from('tables').update(updated).eq('id', t.id).then();
            return updated;
          }
          return t;
        }));
        setActiveTableId(null);
      }
    } else {
      // Sebagian item dibayar → hapus yang sudah bayar dari cart
      const paidItemIds = new Set(itemsToCheckOut.map(i => i.id));
      // Gunakan cart state terbaru (bukan closure)
      setCart(prev => {
        const remaining = prev.filter(i => !paidItemIds.has(i.id));
        // Sinkronisasi ke tabel sekaligus
        if (activeTableId) {
          setTables(prevTables => prevTables.map(t => {
            if (t.id === activeTableId) {
              const updated: TableData = { ...t, cart: remaining, status: remaining.length > 0 ? "Sudah Dipesan" : "Kosong" };
              supabase.from('tables').update(updated).eq('id', t.id).then();
              return updated;
            }
            return t;
          }));
        }
        return remaining;
      });
    }
  };

  const handleSaveOrderToTable = (customerName?: string) => {
    if (activeTableId && cart.length > 0) {
      // --- CHECK PB1 Tax ---
      let taxRate = 0.11; // Default 11%
      const savedBiaya = localStorage.getItem("pos_biaya_settings");
      if (savedBiaya) {
        try {
          const biayaList = JSON.parse(savedBiaya);
          const pb1 = biayaList.find((b: any) => b.id === "FEE-001");
          if (pb1 && !pb1.isActive) {
            taxRate = 0;
          } else if (pb1 && pb1.isActive) {
            taxRate = pb1.value / 100;
          }
        } catch (e) { }
      }

      const subtotal = cart.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0);
      const tax = Math.round(subtotal * taxRate);
      const total = subtotal + tax;

      setTables(prev => prev.map(t => {
        if (t.id === activeTableId) {
          const updated: TableData = { ...t, status: "Sudah Dipesan", cart: cart, current: 1, customerName: customerName || t.customerName };
          supabase.from('tables').update(updated).eq('id', t.id).then();
          return updated;
        }
        return t;
      }));

      setPosOrders(prev => {
        const existingIdx = prev.findIndex(o => o.table === activeTableId && o.status === "Unpaid");
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], items: cart, total };
          supabase.from('orders').update({ items: cart, total }).eq('id', updated[existingIdx].id).then();
          return updated;
        }

        const ticketId = `T-${Math.floor(100 + Math.random() * 899)}`;
        const newOrder: Order = { id: `INV-${ticketId}`, queue: "-", staff: currentUser?.name.split(' ')[0] || "Kasir", table: activeTableId, pager: "-", type: "Dine In", payment: "Unpaid", status: "Unpaid", total, time: new Date().toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), items: cart };
        supabase.from('orders').insert([newOrder]).then();

        const isKitchenItem = (category: string) => {
          const c = category.toLowerCase();
          return c.includes('food') || c.includes('makanan') || c.includes('snack') || c.includes('pastry');
        };

        const baristaCart = cart.filter(i => !isKitchenItem(i.product.category));
        const kitchenCart = cart.filter(i => isKitchenItem(i.product.category));

        const kdsOrdersToInsert: KdsOrder[] = [];
        const dbPayloadsToInsert: any[] = [];

        if (baristaCart.length > 0) {
          const baristaItems = baristaCart.map((item, idx) => ({
            id: `pos-${ticketId}-B-${idx}`,
            name: `${item.quantity}x ${item.product.name}`,
            notes: (["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE"].includes((item.product.category || "").toUpperCase()))
              ? `${item.selectedSize} · Ice: ${item.selectedIce} · Sugar: ${item.selectedSugar} ${item.notes ? `(${item.notes})` : ""}`
              : `${item.selectedSize} ${item.notes ? `(${item.notes})` : ""}`,
            checked: false
          }));

          kdsOrdersToInsert.push({
            id: `${ticketId}-B`,
            type: "Dine In",
            table: activeTableId || undefined,
            timeInSeconds: 0,
            status: "incoming",
            station: "barista",
            customerName: customerName || null,
            items: baristaItems
          });

          dbPayloadsToInsert.push({
            id: `${ticketId}-B`,
            type: "Dine In",
            table: activeTableId || null,
            time_in_seconds: 0,
            status: "incoming",
            station: "barista",
            items: baristaItems,
            customer_name: customerName || null
          });

          if (isPrinterConnected) {
            const kdsData = buildKdsTicketData(
              ticketId,
              'Barista',
              baristaItems.map(i => ({ name: i.name, qty: 1, notes: i.notes })),
              customerName,
              false // Not paid yet
            );
            printerManager.print(kdsData);
          }
        }

        if (kitchenCart.length > 0) {
          const kitchenItems = kitchenCart.map((item, idx) => ({
            id: `pos-${ticketId}-K-${idx}`,
            name: `${item.quantity}x ${item.product.name}`,
            notes: (["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE"].includes((item.product.category || "").toUpperCase()))
              ? `${item.selectedSize} · Ice: ${item.selectedIce} · Sugar: ${item.selectedSugar} ${item.notes ? `(${item.notes})` : ""}`
              : `${item.selectedSize} ${item.notes ? `(${item.notes})` : ""}`,
            checked: false
          }));

          kdsOrdersToInsert.push({
            id: `${ticketId}-K`,
            type: "Dine In",
            table: activeTableId || undefined,
            timeInSeconds: 0,
            status: "incoming",
            station: "kitchen",
            customerName: customerName || null,
            items: kitchenItems
          });

          dbPayloadsToInsert.push({
            id: `${ticketId}-K`,
            type: "Dine In",
            table: activeTableId || null,
            time_in_seconds: 0,
            status: "incoming",
            station: "kitchen",
            items: kitchenItems,
            customer_name: customerName || null
          });

          if (isPrinterConnected) {
            const kdsData = buildKdsTicketData(
              ticketId,
              'Kitchen',
              kitchenItems.map(i => ({ name: i.name, qty: 1, notes: i.notes })),
              customerName,
              false // Not paid yet
            );
            printerManager.print(kdsData);
        }
          }

        // Add Kasir KDS ticket for "Simpan & Tunda"
        const kasirItems = cart.map((item, idx) => ({
          id: `pos-${ticketId}-KSR-${idx}`,
          name: `${item.quantity}x ${item.product.name}`,
          checked: false
        }));

        kdsOrdersToInsert.push({
          id: `${ticketId}-KSR`,
          type: "Dine In",
          table: activeTableId || undefined,
          timeInSeconds: 0,
          status: "incoming",
          station: "kasir",
          customerName: customerName || null,
          items: kasirItems
        });

        dbPayloadsToInsert.push({
          id: `${ticketId}-KSR`,
          type: "Dine In",
          table: activeTableId || null,
          time_in_seconds: 0,
          status: "incoming",
          station: "kasir",
          items: kasirItems,
          customer_name: customerName || null
        });

        if (kdsOrdersToInsert.length > 0) {
          setKdsOrders(prevKds => [...kdsOrdersToInsert, ...prevKds]);
          supabase.from('kds_orders').insert(dbPayloadsToInsert).then(res => {
            if (res.error) console.error("KDS Insert Error:", res.error);
          });
        }

        return [newOrder, ...prev];
      });
      triggerToast(`Pesanan untuk Meja ${tables.find(t => t.id === activeTableId)?.name || activeTableId} berhasil disimpan (Belum dibayar).`, "info");
      setCart([]);
      setActiveTableId(null);
    }
  };

  const handleRecallLastKdsOrder = () => {
    const recalled = (window as any)._lastCompletedKdsOrder || lastCompletedOrder;
    if (recalled) {
      setKdsOrders(prev => [...prev, recalled]);
      setDailyPrepCount(c => Math.max(c - 1, 0));
      (window as any)._lastCompletedKdsOrder = null;
      setLastCompletedOrder(null);
      triggerToast(`Pesanan #${recalled.id} ditarik kembali ke monitor dapur.`, "info");
    } else {
      triggerToast("Tidak ada pesanan selesai yang tersisa untuk ditarik kembali.", "warning");
    }
  };

  const handleReprintReceipt = (orderId: string) => {
    const order = posOrders.find(o => o.id === orderId);
    if (!order) return;

    const subtotal = order.items.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0);
    const tax = order.total - subtotal;

    setPrintedReceiptDetails({
      orderId: order.id,
      items: order.items.map(item => {
        const isDrink = ["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE"].includes((item.product.category || "").toUpperCase());
        const nameDesc = isDrink && item.selectedMood ? `${item.product.name} (${item.selectedMood})` : item.product.name;
        return {
          name: nameDesc,
          qty: item.quantity,
          price: calculateItemUnitPrice(item),
          notes: item.notes
        };
      }),
      subtotal,
      discount: 0, // Order history currently doesn't save discount info in posStore structure, but we can update it if needed. Mocking 0 for now.
      discountName: undefined,
      tax,
      total: order.total,
      customerName: order.customerName,
      paymentMethod: order.payment,
      amountGiven: order.amountGiven,
      change: order.change,
      queue: order.queue,
      table: order.table && order.table !== "-" ? tables.find(t => t.id === order.table)?.name || order.table : undefined
    });
    setShowReceiptModal(true);
  };

  return (
    <>
      {showPaymentModal && (
        <PaymentModal
          key={`pay-${cart.length}-${cart.reduce((s, i) => s + calculateItemUnitPrice(i) * i.quantity, 0)}`}
          total={(() => {
            const sub = cart.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0);
            let d = 0;
            if (checkoutPromo) {
              if (checkoutPromo.type === "Persentase") {
                d = (sub * checkoutPromo.value) / 100;
              } else if (checkoutPromo.type === "Nominal") {
                d = checkoutPromo.value;
              } else if (checkoutPromo.type === "Karyawan") {
                const drink = cart.find(item => 
                  item.product.category.toLowerCase().includes('kopi') || 
                  item.product.category.toLowerCase().includes('minuman') || 
                  item.product.category.toLowerCase().includes('tea') ||
                  item.product.category.toLowerCase().includes('signature') ||
                  item.product.category.toLowerCase().includes('coffee')
                );
                if (drink) d = calculateItemUnitPrice(drink);
              }
            }
            return Math.max(0, sub - d);
          })()}
          cart={cart}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(method, amountGiven, change) => {
            setShowPaymentModal(false);
            handlePrintBillsCheckout(method, amountGiven, change);
          }}
          onPartialSuccess={(method, paidItems) => {
            setShowPaymentModal(false);
            handlePrintBillsCheckout(method, undefined, undefined, paidItems);
          }}
        />
      )}

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 max-w-lg w-[90%]">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-4 border text-xs font-bold transition-all animate-fade-in ${t.type === "success" ? "bg-emerald-900 text-white border-emerald-800" : t.type === "warning" ? "bg-amber-900 text-white border-amber-800" : "bg-[#4d3227] text-white border-[#3a251d]"}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">{t.type === "success" ? "check_circle" : t.type === "warning" ? "warning" : "info"}</span>
              <span>{t.message}</span>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-white hover:opacity-60 text-base font-extrabold w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">×</button>
          </div>
        ))}
      </div>

      <Routes>
        <Route element={<POSLayout />}>
          <Route index element={
            <POSDashboard products={computedProducts} cart={cart} setCart={setCart} onPrintBills={(name, promo) => { setCheckoutCustomerName(name); setCheckoutPromo(promo || null); setShowPaymentModal(true); }} onSaveOrder={handleSaveOrderToTable} viewMode="menu" tables={tables} setTables={setTables} activeTableId={activeTableId} setActiveTableId={setActiveTableId} onNotify={triggerToast} />
          } />
          <Route path="meja" element={
            <POSTableManagementView tables={tables} setTables={setTables} setActiveTableId={setActiveTableId} onNotify={triggerToast} />
          } />
          <Route path="kds" element={
            <KDSView orders={kdsOrders} setOrders={setKdsOrders} dailyPrepCount={dailyPrepCount} setDailyPrepCount={setDailyPrepCount} onRecallLast={handleRecallLastKdsOrder} canRecall={true} />
          } />
          <Route path="item" element={<POSItemView products={computedProducts} onNotify={triggerToast} onUpdateProduct={(updated) => setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))} />} />
          <Route path="online" element={<POSOnlineView posOrders={posOrders} setPosOrders={setPosOrders} onNotify={triggerToast} />} />
          <Route path="shift" element={<POSShiftView onNotify={triggerToast} posOrders={posOrders} />} />
          <Route path="promo" element={<POSPromoView onNotify={triggerToast} />} />
          <Route path="biaya" element={<POSBiayaView onNotify={triggerToast} />} />
          <Route path="pesanan" element={<POSOrdersHistoryView posOrders={posOrders} setPosOrders={setPosOrders} tables={tables} setTables={setTables} onNotify={triggerToast} onReprint={handleReprintReceipt} />} />
          <Route path="pengaturan" element={<POSSettingsView onNotify={triggerToast} products={computedProducts} />} />
          <Route path="keluar" element={<POSLogoutView />} />
        </Route>
      </Routes>

      {showReceiptModal && printedReceiptDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-slide-up">
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <span className="material-symbols-outlined text-green-500 text-4xl animate-bounce">print</span>
              <h3 className="font-extrabold text-base text-[#4d3227] mt-2">STRUK TAGIHAN DICETAK</h3>
              <p className="text-[10px] text-slate-500 font-medium">Simulasi Struk Fisik</p>
            </div>
            <div className="bg-amber-50/40 p-4 rounded-xl border border-dashed border-amber-900/20 font-mono text-[11px] leading-relaxed text-zinc-800 space-y-3">
              <div className="text-center">
                <p className="font-bold uppercase tracking-wider text-[#4d3227]">LAPANBELAS COFFEE</p>
                <p>POS18 Outlet</p>
              </div>
              <div className="h-[1px] w-full border-t border-dashed border-zinc-400"></div>
              <div>
                <p>ID STRUK: #{printedReceiptDetails.orderId}</p>
                {printedReceiptDetails.queue && <p>ANTRIAN: {printedReceiptDetails.queue}</p>}
                {printedReceiptDetails.table ? (
                  <p>MEJA: {printedReceiptDetails.table}</p>
                ) : (
                  printedReceiptDetails.customerName && (() => {
                    const saved = localStorage.getItem("pos_receipt_settings");
                    let showName = true; // default
                    if (saved) {
                      try {
                        const tpl = JSON.parse(saved);
                        if (tpl.showCustomerName === false) showName = false;
                      } catch (e) { }
                    }
                    return showName ? <p>NAMA: {printedReceiptDetails.customerName}</p> : null;
                  })()
                )}
              </div>
              <div className="h-[1px] w-full border-t border-dashed border-zinc-400"></div>

              {/* Item List */}
              <div className="space-y-2">
                {printedReceiptDetails.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex justify-between items-start">
                      <span className="flex-1 pr-2">{item.qty}x {item.name}</span>
                      <span className="whitespace-nowrap">{(item.price * item.qty).toLocaleString("id-ID")}</span>
                    </div>
                    {item.notes && <span className="text-[9px] text-zinc-500 pl-4">{item.notes}</span>}
                  </div>
                ))}
              </div>

              <div className="h-[1px] w-full border-t border-dashed border-zinc-400"></div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>{printedReceiptDetails.subtotal.toLocaleString("id-ID")}</span>
                </div>
                {printedReceiptDetails.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="uppercase">DISKON {printedReceiptDetails.discountName ? `(${printedReceiptDetails.discountName})` : ''}:</span>
                    <span>-{printedReceiptDetails.discount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {printedReceiptDetails.tax > 0 && (
                  <div className="flex justify-between">
                    <span>PAJAK:</span>
                    <span>{printedReceiptDetails.tax.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-1 pt-1 border-t border-dashed border-zinc-300">
                  <span>TOTAL:</span>
                  <span>{"Rp " + printedReceiptDetails.total.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {printedReceiptDetails.paymentMethod && (
                <>
                  <div className="h-[1px] w-full border-t border-dashed border-zinc-400 mt-2"></div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>PEMBAYARAN:</span>
                      <span>{printedReceiptDetails.paymentMethod.toUpperCase()}</span>
                    </div>
                    {printedReceiptDetails.paymentMethod === "Cash" && printedReceiptDetails.amountGiven !== undefined && (
                      <>
                        <div className="flex justify-between">
                          <span>TUNAI:</span>
                          <span>{printedReceiptDetails.amountGiven.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>KEMBALIAN:</span>
                          <span>{printedReceiptDetails.change?.toLocaleString("id-ID") || 0}</span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setShowReceiptModal(false)} className="w-full bg-[#4d3227] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#3a251d] active:scale-95 transition-all shadow-md cursor-pointer">
              Tutup Simulasi Struk
            </button>
          </div>
        </div>
      )}
    </>
  );
}
