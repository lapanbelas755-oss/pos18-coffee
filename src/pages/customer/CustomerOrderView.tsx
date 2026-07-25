import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "react-router-dom";
import { Product, CartItem, Order, LoyaltyMember, LoyaltySettings } from "../../types";
import { supabase } from "../../lib/supabase";
import { calculateItemUnitPrice } from "../../utils/pricing";
import { loyaltyService } from "../../modules/loyalty/loyaltyService";

export default function CustomerOrderView() {
  const { tableId } = useParams();
  const [tableName, setTableName] = useState<string | null>(null);

  useEffect(() => {
    if (tableId) {
      supabase.from('tables').select('name').eq('id', tableId).single()
        .then(({ data, error }) => {
          if (data && !error) setTableName(data.name);
        });
    }
  }, [tableId]);

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(`cart_${tableId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [customerName, setCustomerName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [kdsHistory, setKdsHistory] = useState<any[]>([]);
  const [pendingOrdersHistory, setPendingOrdersHistory] = useState<any[]>([]);
  const [paymentStep, setPaymentStep] = useState<"cart" | "qris" | "success">("cart");
  const [orderTotal, setOrderTotal] = useState(0);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [qrisError, setQrisError] = useState<string | null>(null);
  const [qrisOrderId, setQrisOrderId] = useState<string | null>(null);
  const [isLoadingQris, setIsLoadingQris] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning" | "error">("warning");
  const [qrisTimer, setQrisTimer] = useState<number>(900);

  // Loyalty Member States
  const [loyaltyMember, setLoyaltyMember] = useState<LoyaltyMember | null>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
  const [memberPhoneInput, setMemberPhoneInput] = useState("");
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [memberMessage, setMemberMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0);
  const [lastTotalBalance, setLastTotalBalance] = useState<number>(0);

  useEffect(() => {
    loyaltyService.getSettings().then((settings) => {
      if (settings) setLoyaltySettings(settings);
    });
  }, []);

  const handleSearchMember = async () => {
    if (!memberPhoneInput.trim()) {
      setMemberMessage({ text: "Masukkan nomor WhatsApp Anda.", type: "error" });
      return;
    }
    setIsSearchingMember(true);
    setMemberMessage(null);
    try {
      const member = await loyaltyService.searchMember(memberPhoneInput.trim());
      if (member) {
        setLoyaltyMember(member);
        if (!customerName) setCustomerName(member.full_name);
        setMemberMessage({ text: `Selamat datang kembali, ${member.full_name}!`, type: "success" });
        setShowCreateMember(false);
      } else {
        setLoyaltyMember(null);
        setShowCreateMember(true);
        setNewMemberName(customerName || "");
        setMemberMessage({ text: "Nomor belum terdaftar. Silakan lengkapi nama untuk mendaftar.", type: "info" });
      }
    } catch (e) {
      setMemberMessage({ text: "Terjadi kesalahan saat mencari member.", type: "error" });
    } finally {
      setIsSearchingMember(false);
    }
  };

  const handleCreateMember = async () => {
    if (!newMemberName.trim() || !memberPhoneInput.trim()) {
      setMemberMessage({ text: "Nama dan Nomor WhatsApp wajib diisi.", type: "error" });
      return;
    }
    setIsSearchingMember(true);
    try {
      const newMember = await loyaltyService.createMember(newMemberName.trim(), memberPhoneInput.trim());
      if (newMember) {
        setLoyaltyMember(newMember);
        setCustomerName(newMember.full_name);
        setShowCreateMember(false);
        setMemberMessage({ text: `Member berhasil dibuat! Selamat datang, ${newMember.full_name}.`, type: "success" });
      }
    } catch (e: any) {
      setMemberMessage({ text: `Gagal mendaftar: ${e.message}`, type: "error" });
    } finally {
      setIsSearchingMember(false);
    }
  };

  useEffect(() => {
    let timerInterval: any;
    if (paymentStep === "qris" && qrisUrl && qrisTimer > 0) {
      timerInterval = setInterval(() => {
        setQrisTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [paymentStep, qrisUrl, qrisTimer]);

  const showToast = (msg: string, type: "success" | "warning" | "error" = "warning") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const getApiUrl = () => {
    return (import.meta as any).env.VITE_API_URL ||
      (window.location.protocol === "https:" ? window.location.origin : "http://localhost:3002");
  };

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*').order('id');
      if (data) {
        setProducts(data.map(p => ({ ...p, priceModifiers: p.price_modifiers } as Product)));
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem(`cart_${tableId}`, JSON.stringify(cart));
  }, [cart, tableId]);

  // Realtime History fetching (KDS and Pending Orders)
  useEffect(() => {
    if (!tableId) return;

    const fetchHistory = async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayISO = startOfToday.toISOString();

      const { data: kdsData } = await supabase.from('kds_orders')
        .select('*')
        .eq('table', tableId)
        .or(`status.neq.done,created_at.gte.${startOfTodayISO}`) // Show active OR done today
        .order('created_at', { ascending: false });
      if (kdsData) setKdsHistory(kdsData);

      const { data: ordData } = await supabase.from('orders')
        .select('*')
        .eq('table', tableId)
        .eq('status', 'Pending') // Only waiting for cashier
        .gte('created_at', startOfTodayISO) // Only show today's pending orders
        .order('created_at', { ascending: false });
      if (ordData) setPendingOrdersHistory(ordData);
    };

    fetchHistory();

    const subKds = supabase.channel('customer_kds')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kds_orders', filter: `table=eq.${tableId}` }, (payload) => {
        if (payload.old.status !== 'done' && payload.new.status === 'done') {
          // Play audio chime
          const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
          audio.volume = 0.8;
          audio.play().catch(e => console.error(e));

          // Speak Indonesian Notification
          if (window.speechSynthesis) {
            // Cancel current speech to prevent queue build up
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance("Pesanan Anda telah selesai. Waiter akan segera mengantarkan.");
            utterance.lang = 'id-ID';
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        }
        fetchHistory();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kds_orders', filter: `table=eq.${tableId}` }, fetchHistory)
      .subscribe();

    const subOrd = supabase.channel('customer_ord')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `table=eq.${tableId}` }, fetchHistory)
      .subscribe();

    return () => {
      supabase.removeChannel(subKds);
      supabase.removeChannel(subOrd);
    };
  }, [tableId]);

  const categories = ["Semua", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter(
    (p) => {
      const matchesCategory = selectedCategory === "Semua" || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }
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
          selectedMood: product.moods && product.moods.length > 0 ? product.moods[0] : "",
          notes: "",
        },
      ];
    });
  };
  const handleUpdateQuantity = (itemId: string, change: number) => {
    setCart((prev) => {
      const updated = prev.map((item) => {
        if (item.id === itemId) {
          const nextQty = item.quantity + change;
          if (nextQty <= 0) return null;
          return { ...item, quantity: nextQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];

      if (updated.length === 0) {
        setIsCheckoutModalOpen(false);
      }
      return updated;
    });
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  const handleUpdateMood = (itemId: string, mood: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selectedMood: mood } : item
      )
    );
  };

  const handleCheckout = async () => {
    if (!customerName) {
      showToast("Mohon isi nama Anda terlebih dahulu.", "warning");
      return;
    }
    if (cart.length === 0) {
      showToast("Keranjang masih kosong.", "warning");
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0);
    const total = subtotal; // Removed 11% tax
    setOrderTotal(total);

    setIsLoadingQris(true);
    setQrisError(null);
    setQrisUrl(null);
    setQrisOrderId(null);
    setQrisTimer(900); // Reset timer to 15 mins (900 secs)
    setPaymentStep("qris");
    setIsCheckoutModalOpen(false);

    try {
      const apiUrl = getApiUrl();
      const cartItems = cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: calculateItemUnitPrice(item),
          notes: item.selectedMood ? `${item.selectedMood}${item.notes ? ` | ${item.notes}` : ''}` : (item.notes || '')
        }));
      const response = await fetch(`${apiUrl}/api/qris`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: `ONL-${Math.floor(1000 + Math.random() * 9000)}`,
          gross_amount: Math.round(total),
          customer_name: customerName,
          table_id: tableId || null,
          items: cartItems
        })
      });
      const data = await response.json();
      if (response.ok && data.qr_url) {
        setQrisUrl(data.qr_url);
        setQrisOrderId(data.order_id);
      } else {
        setQrisError(data.error || "Gagal membuat QRIS.");
      }
    } catch (err) {
      console.error(err);
      setQrisError("Gagal menghubungi server pembayaran.");
    } finally {
      setIsLoadingQris(false);
    }
  };

  // Auto-poll QRIS status
  useEffect(() => {
    let interval: any;
    if (paymentStep === "qris" && qrisOrderId) {
      interval = setInterval(async () => {
        try {
          const apiUrl = getApiUrl();
          const res = await fetch(`${apiUrl}/api/qris/status/${qrisOrderId}`);
          const data = await res.json();
          if (data.success && (data.status === 'settlement' || data.status === 'capture')) {
            clearInterval(interval);
            handlePaymentSuccess();
          }
        } catch (e) {
          console.error("Gagal mengecek status QRIS:", e);
        }
      }, 5000); // Cek setiap 5 detik
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentStep, qrisOrderId]);

  const handlePaymentSuccess = async () => {
    const ticketId = `ONL-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toLocaleString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const newOrder: any = {
      id: ticketId,
      queue: "OL",
      staff: "Online",
      table: tableId || "Unknown",
      pager: "-",
      type: "Online",
      payment: "QRIS (Paid)",
      status: "Pending",
      total: orderTotal,
      time: nowStr,
      items: cart,
      customer_name: customerName,
      member_id: loyaltyMember?.id || null,
      created_at: new Date().toISOString()
    };

    // 1. Insert order to DB
    const { member_id, ...dbOrderPayload } = newOrder;
    const { error: orderErr } = await supabase.from('orders').insert([dbOrderPayload]);
    if (orderErr) console.error("Order insert error:", orderErr);

    // 2. Insert KDS tickets (barista + kitchen + kasir)
    const kdsPayloads: any[] = [];

    const baristaItems = cart.map((item, idx) => ({
      id: `qr-${ticketId}-B-${idx}`,
      name: `${item.quantity}x ${item.product.name}`,
      notes: item.selectedMood ? `${item.selectedMood}${item.notes ? ` | ${item.notes}` : ''}` : (item.notes || ''),
      checked: false
    }));
    kdsPayloads.push({
      id: `${ticketId}-B`,
      type: "Online (QR)",
      table: tableId || null,
      time_in_seconds: 0,
      status: "incoming",
      station: "barista",
      items: baristaItems,
      customer_name: customerName || "Tamu"
    });

    const kitchenItems = cart.map((item, idx) => ({
      id: `qr-${ticketId}-K-${idx}`,
      name: `${item.quantity}x ${item.product.name}`,
      notes: item.notes || '',
      checked: false
    }));
    kdsPayloads.push({
      id: `${ticketId}-K`,
      type: "Online (QR)",
      table: tableId || null,
      time_in_seconds: 0,
      status: "incoming",
      station: "kitchen",
      items: kitchenItems,
      customer_name: customerName || "Tamu"
    });

    const kasirItems = cart.map((item, idx) => ({
      id: `qr-${ticketId}-KSR-${idx}`,
      name: `${item.quantity}x ${item.product.name}`,
      checked: false
    }));
    kdsPayloads.push({
      id: `${ticketId}-KSR`,
      type: "Online (QR)",
      table: tableId || null,
      time_in_seconds: 0,
      status: "incoming",
      station: "kasir",
      items: kasirItems,
      customer_name: customerName || "Tamu"
    });

    const { error: kdsErr } = await supabase.from('kds_orders').insert(kdsPayloads);
    if (kdsErr) console.error("KDS insert error:", kdsErr);

    // 3. Award loyalty points if member logged in
    if (loyaltyMember) {
      try {
        const awardRes = await loyaltyService.calculateAndAwardPoint(ticketId, orderTotal, loyaltyMember.id);
        if (awardRes && awardRes.success) {
          setLastEarnedPoints(awardRes.pointsEarned);
          setLastTotalBalance(awardRes.newBalance);
        }
      } catch (e) {
        console.error("Error awarding points:", e);
      }
    }

    // 4. Notify POS via BroadcastChannel (cross-tab) AND localStorage (same-tab fallback)
    try {
      const bc = new BroadcastChannel("pos_online_orders");
      bc.postMessage({ type: "new_order", order: newOrder });
      bc.close();
    } catch (e) {}
    const pendingOrders = JSON.parse(localStorage.getItem("pending_online_orders") || "[]");
    pendingOrders.push({ ...newOrder, customerName: customerName });
    localStorage.setItem("pending_online_orders", JSON.stringify(pendingOrders));
    window.dispatchEvent(new Event("storage"));

    setCart([]);
    localStorage.removeItem(`cart_${tableId}`);
    setPaymentStep("success");
    
    // Auto-redirect to order status after 4 seconds
    setTimeout(() => {
      setPaymentStep("cart");
      setIsHistoryModalOpen(true);
    }, 4000);
  };

  if (paymentStep === "success") {
    return (
      <div className="h-[100dvh] bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 opacity-10"></div>
        
        <div className="bg-white p-8 rounded-[32px] shadow-[0_20px_50px_-12px_rgba(16,185,129,0.3)] border border-emerald-100 mb-6 flex flex-col items-center w-full max-w-[320px] relative z-10 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <span className="material-symbols-outlined text-6xl text-emerald-600">check_circle</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2 tracking-tight">Pembayaran Berhasil!</h2>
          <p className="text-sm font-medium text-slate-500 mb-4 px-2">Terima kasih, Kak {customerName || 'Pelanggan'}. Pesanan Anda sedang diproses.</p>

          {loyaltyMember && (
            <div className="w-full bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 text-center shadow-sm">
              <span className="text-[10px] font-bold text-orange-800 block uppercase tracking-wider mb-1">Perolehan Poin</span>
              <p className="text-3xl font-black text-orange-600 mb-1">+{lastEarnedPoints} Point</p>
              <p className="text-xs font-semibold text-slate-600">Total Point Anda sekarang: <span className="font-extrabold text-orange-700">{lastTotalBalance} Point</span></p>
            </div>
          )}

          <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Dibayar</p>
            <p className="text-xl font-black text-emerald-600">Rp{orderTotal.toLocaleString("id-ID")}</p>
          </div>
          
          <button
            onClick={() => {
              setPaymentStep("cart");
              setIsHistoryModalOpen(true);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 text-sm cursor-pointer active:scale-95"
          >
            Lihat Status Pesanan
          </button>
        </div>
        
        <p className="text-xs font-bold text-slate-400 animate-pulse relative z-10">
          Mengarahkan ke Status Pesanan...
        </p>
      </div>
    );
  }

  if (paymentStep === "qris") {
    return (
      <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto relative">
        {/* Custom Toast Alert */}
        {toastMessage && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] w-max max-w-[90%] animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border ${toastType === "error"
                ? "bg-red-600 border-red-500 text-white"
                : toastType === "success"
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-[#212121] border-[#333] text-white"
              }`}>
              <span className="material-symbols-outlined shrink-0 text-[20px] font-medium">
                {toastType === "error" ? "error" : toastType === "success" ? "check_circle" : "info"}
              </span>
              <span className="text-[13px] font-semibold tracking-wide">{toastMessage}</span>
            </div>
          </div>
        )}
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-[#1a4b9c] via-[#1e5bbb] to-[#3a75d5] rounded-b-[60px] shadow-lg -z-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 rounded-b-[60px]"></div>
        </div>

        <div className="z-10 w-full flex flex-col items-center mt-6">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/30">
            <span className="material-symbols-outlined text-3xl text-white">qr_code_scanner</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight drop-shadow-md">Scan QRIS</h2>
          <div className="bg-white p-8 rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 mb-6 flex flex-col items-center w-full max-w-[320px] relative overflow-hidden">
            {/* Top decorative elements */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>

            {isLoadingQris ? (
              <div className="w-[180px] h-[180px] flex flex-col items-center justify-center text-slate-400 gap-2 mb-6">
                <span className="material-symbols-outlined text-4xl animate-spin text-[#1a4b9c]">sync</span>
                <span className="text-xs font-bold">Membuat Kode QRIS...</span>
              </div>
            ) : qrisError ? (
              <div className="w-[180px] h-[180px] flex flex-col items-center justify-center text-red-500 gap-2 mb-6 px-4 text-center">
                <span className="material-symbols-outlined text-4xl">error</span>
                <span className="text-[10px] font-bold leading-normal">{qrisError}</span>
              </div>
            ) : qrisTimer <= 0 ? (
              <div className="w-[180px] h-[180px] flex flex-col items-center justify-center text-slate-500 gap-2 mb-6 px-4 text-center">
                <span className="material-symbols-outlined text-4xl text-amber-500">lock_clock</span>
                <span className="text-xs font-black text-slate-700">QRIS Kedaluwarsa</span>
                <span className="text-[9px] font-medium text-slate-400">Silakan kembali dan checkout ulang</span>
              </div>
            ) : qrisUrl ? (
              <div className="flex flex-col items-center">
                <div className="mb-4 bg-white p-2 rounded-2xl border-2 border-dashed border-slate-200">
                  <img src={qrisUrl} alt="QRIS Midtrans" className="w-[180px] h-[180px] object-contain mix-blend-multiply" />
                </div>
                {/* Timer Display */}
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-[10px] font-bold text-amber-800 mb-4 animate-pulse">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  <span>Sisa Waktu: {Math.floor(qrisTimer / 60)}:{(qrisTimer % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
            ) : (
              <div className="mb-6 bg-white p-2 rounded-2xl border-2 border-dashed border-slate-200">
                <QRCodeSVG value={`QRIS-DYNAMIC-${orderTotal}-${Date.now()}`} size={180} level="H" includeMargin={true} />
              </div>
            )}

            <div className="w-full pt-6 border-t border-dashed border-slate-200 flex flex-col items-center">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Total Tagihan</span>
              <span className="text-4xl font-black text-[#1a4b9c] tracking-tighter">Rp{orderTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Text Policy Warning Note */}
          <div className="max-w-[320px] bg-amber-50 border border-amber-200 p-3 rounded-2xl text-left mb-6 text-[10px] text-amber-800 font-bold leading-normal flex gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">warning</span>
            <span>Pesanan akan dibuat ketika pembayaran berhasil. Pesanan yang sudah dibayar tidak dapat ditukar atau dibatalkan.</span>
          </div>

          <button
            onClick={handlePaymentSuccess}
            className="w-full max-w-[320px] bg-gradient-to-r from-emerald-400 to-emerald-600 text-white px-8 py-4 rounded-[20px] font-extrabold shadow-[0_10px_30px_-10px_rgba(16,185,129,0.8)] hover:from-emerald-500 hover:to-emerald-700 transition-all active:scale-95 mb-5 text-lg flex items-center justify-center gap-2"
          >
            <span>Selesai Bayar</span>
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </button>

          <button
            onClick={() => { setPaymentStep("cart"); setIsCheckoutModalOpen(true); }}
            className="text-slate-500 font-bold hover:text-slate-800 transition-colors flex items-center gap-2 text-sm bg-white/50 backdrop-blur-sm px-6 py-2.5 rounded-full"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Batalkan Transaksi
          </button>
        </div>
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + calculateItemUnitPrice(item) * item.quantity, 0);

  // Calculate unique active orders count for the badge
  const uniqueActiveOrders = new Set();
  pendingOrdersHistory.forEach(ord => uniqueActiveOrders.add(ord.id));
  kdsHistory.filter(k => k.status !== 'done').forEach(kds => {
    const baseId = kds.id.split('-').slice(0, 2).join('-');
    uniqueActiveOrders.add(baseId);
  });
  const activeOrderCount = uniqueActiveOrders.size;

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#f8f9fa] flex flex-col pb-28 font-sans antialiased relative max-w-md mx-auto shadow-2xl">
      {/* Custom Toast Alert */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] w-max max-w-[90%] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border ${toastType === "error"
              ? "bg-red-600 border-red-500 text-white"
              : toastType === "success"
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-[#212121] border-[#333] text-white"
            }`}>
            <span className="material-symbols-outlined shrink-0 text-[20px] font-medium">
              {toastType === "error" ? "error" : toastType === "success" ? "check_circle" : "info"}
            </span>
            <span className="text-[13px] font-semibold tracking-wide">{toastMessage}</span>
          </div>
        </div>
      )}
      {/* Top action bar */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setIsSearchActive(!isSearchActive)}
          className="w-10 h-10 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors shadow-lg"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className="w-10 h-10 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors shadow-lg relative"
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          {activeOrderCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#1a4b9c] text-[10px] font-bold text-white flex items-center justify-center shadow-md">
              {activeOrderCount}
            </span>
          )}
        </button>
      </div>

      {/* Premium Hero Header */}
      <div className="relative h-64 bg-slate-900 shrink-0">
        <img
          src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1000"
          alt="Cafe Vibe"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8f9fa] via-transparent to-black/60"></div>

        <div className="absolute top-10 left-6 z-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Lapanbelas Coffee</h1>
          <p className="text-white/90 font-medium text-sm mt-1 drop-shadow-md">Self-Ordering</p>
        </div>

        <div className="absolute top-10 right-6 z-10 flex gap-2">
          {/* Action buttons are moved to the top right container above */}
        </div>
      </div>

      {/* Table Number Box */}
      {tableId && (
        <div className="px-4 -mt-6 mb-4 relative z-20">
          <div className="bg-[#fff5f0] border border-[#ffe0d1] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-[#ff7b42] font-bold uppercase tracking-wider mb-0.5">Lokasi Pesanan</p>
              <p className="text-lg text-[#cc4910] font-black">{tableName ? `Meja ${tableName.replace(/meja /i, '')}` : `Meja ${tableId}`}</p>
            </div>
            <span className="material-symbols-outlined text-[#ffcbb3] text-4xl">table_restaurant</span>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      {isSearchActive && (
        <div className="px-4 mt-0 mb-4 relative z-20 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center px-4 py-3">
            <span className="material-symbols-outlined text-slate-400 mr-2">search</span>
            <input
              type="text"
              placeholder="Cari minuman, makanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-800"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <span className="material-symbols-outlined text-slate-400 hover:text-slate-600">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sticky Categories */}
      <div className="sticky top-0 z-30 bg-[#f8f9fa]/90 backdrop-blur-md px-4 py-3 pb-4 shadow-[0_10px_20px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex overflow-x-auto gap-3 no-scrollbar snap-x">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`snap-center shrink-0 px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm border ${selectedCategory === cat
                  ? "bg-[#1a4b9c] text-white border-[#1a4b9c] shadow-blue-900/20"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 px-4 mt-2">
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => handleAddToCart(product)}
              className="bg-white rounded-[24px] p-3 flex flex-col border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.15)] transition-all group cursor-pointer active:scale-95"
            >
              <div className="aspect-square bg-slate-100 rounded-[18px] mb-3 overflow-hidden relative">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
              </div>
              <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight mb-1">{product.name}</h3>
              <p className="text-[10px] text-slate-400 mb-2 line-clamp-1">{product.category}</p>

              <div className="mt-auto pt-2 flex items-center justify-between">
                <span className="font-extrabold text-[#1a4b9c] text-sm tracking-tight">
                  Rp{product.price.toLocaleString("id-ID")}
                </span>
                <button
                  className="w-9 h-9 rounded-full bg-[#1a4b9c] text-white flex items-center justify-center hover:bg-[#153a7a] transition-all shadow-md shadow-blue-900/20"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
            <p className="text-sm font-medium">Menu tidak ditemukan</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent z-40 max-w-md mx-auto">
          <button
            onClick={() => setIsCheckoutModalOpen(true)}
            className="w-full bg-[#1a4b9c] text-white p-4 rounded-[20px] shadow-[0_10px_40px_-10px_rgba(26,75,156,0.6)] flex items-center justify-between hover:bg-[#153a7a] transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm backdrop-blur-sm border border-white/30 group-hover:bg-white/30 transition-colors">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium opacity-80">Keranjang</span>
                <span className="font-bold">Lihat Pesanan</span>
              </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              Rp{subtotal.toLocaleString("id-ID")}
            </span>
          </button>
        </div>
      )}

      {/* Order History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] mt-auto shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center p-6 bg-white border-b border-slate-100 relative z-10 shadow-sm">
              <div>
                <h2 className="font-extrabold text-xl text-slate-800 tracking-tight">Status Pesanan</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Pantau pesanan Anda</p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
              {kdsHistory.length === 0 && pendingOrdersHistory.length === 0 ? (
                <div className="text-center text-slate-400 py-10">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                  <p className="text-sm font-medium">Belum ada pesanan aktif.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Render Pending Orders first (Waiting for Cashier) */}
                  {pendingOrdersHistory.map((ord, idx) => {
                    const ticketNo = ord.id;
                    return (
                      <div key={`ord-${idx}`} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Antrian</div>
                            <div className="text-lg font-black text-slate-800">{ticketNo}</div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 bg-slate-100`}>
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            Menunggu Kasir
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-1">Dikerjakan oleh: <span className="text-slate-800">Kasir</span></div>
                          <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc marker:text-slate-300">
                            {ord.items?.map((itm: any, i: number) => (
                              <li key={i}>{itm.quantity}x {itm.product.name}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}

                  {/* Render KDS Orders */}
                  {kdsHistory.map((kds, idx) => {
                    const ticketNo = kds.id.split('-').slice(0, 2).join('-');
                    const stationLabel = kds.station === 'kitchen' ? 'Dapur' : kds.station === 'barista' ? 'Barista' : 'Kasir';

                    let statusLabel = "Menunggu";
                    let statusColor = "text-slate-500 bg-slate-100";
                    let statusIcon = "schedule";

                    if (kds.status === 'working') {
                      statusLabel = "Sedang Dibuat";
                      statusColor = "text-blue-600 bg-blue-100";
                      statusIcon = "skillet";
                    } else if (kds.status === 'done') {
                      statusLabel = "Siap/Selesai";
                      statusColor = "text-emerald-600 bg-emerald-100";
                      statusIcon = "check_circle";
                    }

                    return (
                      <div key={`kds-${idx}`} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Antrian</div>
                            <div className="text-lg font-black text-slate-800">{ticketNo}</div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusColor}`}>
                            <span className="material-symbols-outlined text-[14px]">{statusIcon}</span>
                            {statusLabel}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-1">Dikerjakan oleh: <span className="text-slate-800">{stationLabel}</span></div>
                          <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc marker:text-slate-300">
                            {kds.items?.map((itm: any, i: number) => (
                              <li key={i}>{itm.name}</li>
                            ))}
                          </ul>
                        </div>
                        {kds.status === 'done' && (
                          <div className="mt-2 text-xs font-extrabold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl flex items-center gap-1.5 border border-emerald-100">
                            <span className="material-symbols-outlined text-[16px]">delivery_dining</span>
                            <span>Pesanan selesai, waiters akan segera antarkan!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Premium Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] mt-auto shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 bg-white border-b border-slate-100 relative z-10 shadow-sm">
              <div>
                <h2 className="font-extrabold text-xl text-slate-800 tracking-tight">Rincian Pesanan</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Meja {tableId}</p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">

              {/* Order Items */}
              <div className="space-y-4 mb-8">
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.product.name}</h4>
                        {item.product.moods && item.product.moods.length > 0 ? (
                          <div className="flex items-center gap-2 mt-2">
                            {item.product.moods.includes("Hot") && (
                              <button
                                onClick={() => handleUpdateMood(item.id, "Hot")}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${item.selectedMood === "Hot"
                                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                  }`}
                              >
                                🔥 Hot
                              </button>
                            )}
                            {item.product.moods.includes("Cold") && (
                              <button
                                onClick={() => handleUpdateMood(item.id, "Cold")}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${item.selectedMood === "Cold"
                                    ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                  }`}
                              >
                                ❄️ Ice (+2K)
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">{item.selectedSize}, {item.selectedIce}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-800 text-sm">Rp{(calculateItemUnitPrice(item) * item.quantity).toLocaleString("id-ID")}</p>

                        {/* Quantity Adjusters */}
                        <div className="inline-flex items-center gap-2 bg-slate-100 rounded-lg p-1 mt-1.5">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-5 h-5 bg-white text-slate-600 rounded-md font-bold text-xs flex items-center justify-center shadow-sm active:scale-90"
                          >
                            -
                          </button>
                          <span className="text-[10px] text-slate-700 font-extrabold px-1 min-w-[12px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-5 h-5 bg-[#1a4b9c] text-white rounded-md font-bold text-xs flex items-center justify-center shadow-sm active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Item Note Input */}
                    <div className="pt-2 border-t border-slate-50 flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">edit_note</span>
                      <input
                        type="text"
                        placeholder="Tambahkan catatan (misal: less sugar, dll)..."
                        value={item.notes || ""}
                        onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                        className="flex-1 bg-slate-50 text-xs py-1.5 px-3 rounded-lg focus:outline-none border border-slate-200 focus:border-[#1a4b9c] focus:bg-white text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Member Identification Section */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Pilihan Member / Loyalty
                  </label>
                  {loyaltyMember && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoyaltyMember(null);
                        setMemberPhoneInput("");
                        setMemberMessage(null);
                        setShowCreateMember(false);
                      }}
                      className="text-[11px] text-red-500 font-bold hover:underline"
                    >
                      Ganti Member
                    </button>
                  )}
                </div>

                {!loyaltyMember ? (
                  <div>
                    {!showCreateMember ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-slate-400 text-[18px]">smartphone</span>
                            <input
                              type="tel"
                              value={memberPhoneInput}
                              onChange={(e) => setMemberPhoneInput(e.target.value)}
                              placeholder="No. WhatsApp Member..."
                              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3 py-3 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#1a4b9c] text-slate-800"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSearchMember}
                            disabled={isSearchingMember}
                            className="bg-[#1a4b9c] text-white px-4 py-3 rounded-2xl text-xs font-bold hover:bg-[#153a7a] transition-all disabled:opacity-50 shrink-0"
                          >
                            {isSearchingMember ? "Cari..." : "Cek Member"}
                          </button>
                        </div>

                        {memberMessage && (
                          <div className={`p-3 rounded-xl text-xs font-semibold ${
                            memberMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            memberMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {memberMessage.text}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Registration Form */
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-900">Daftar Member Baru</span>
                          <button type="button" onClick={() => setShowCreateMember(false)} className="text-xs text-slate-400 font-bold hover:text-slate-600">Batal</button>
                        </div>
                        <input
                          type="text"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="Nama Lengkap..."
                          className="w-full bg-white border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1a4b9c]"
                        />
                        <button
                          type="button"
                          onClick={handleCreateMember}
                          disabled={isSearchingMember}
                          className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                        >
                          {isSearchingMember ? "Mendaftarkan..." : "Daftar & Sambungkan Member"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Connected Member Banner */
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-200 text-2xl">stars</span>
                        <div>
                          <p className="text-[10px] font-medium text-amber-100 uppercase tracking-wider">Selamat Datang 👋</p>
                          <h4 className="font-extrabold text-sm text-white leading-tight">{loyaltyMember.full_name}</h4>
                        </div>
                      </div>
                      <span className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase">
                        {loyaltyMember.level}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/20 flex justify-between items-center text-xs">
                      <span className="text-amber-100 font-medium">Point Saat Ini:</span>
                      <span className="font-black text-sm text-white">{loyaltyMember.total_point} Point</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Loyalty Summary */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-6 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ringkasan Pembayaran</h4>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">Subtotal</span>
                  <span className="font-bold text-slate-800">Rp{subtotal.toLocaleString("id-ID")}</span>
                </div>

                {/* Loyalty Calculation Preview */}
                {loyaltySettings && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs text-orange-700 bg-orange-50 p-2.5 rounded-xl border border-orange-100 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-orange-500 text-[16px]">military_tech</span>
                        <span>Estimasi Poin Diperoleh</span>
                      </span>
                      <span className="font-extrabold text-sm text-orange-600">
                        +{Math.floor(subtotal / loyaltySettings.point_per_amount)} Point
                      </span>
                    </div>

                    {loyaltyMember && (
                      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                        <span>Total Poin Setelah Pembayaran:</span>
                        <span className="font-bold text-slate-700">
                          {loyaltyMember.total_point + Math.floor(subtotal / loyaltySettings.point_per_amount)} Point
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-800">Total Bayar</span>
                  <span className="font-black text-2xl text-[#1a4b9c] tracking-tight">
                    Rp{subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Customer Info Form */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Data Pemesan</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-4 text-slate-400">person</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Masukkan nama Anda..."
                    className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 rounded-2xl font-medium focus:outline-none focus:border-[#1a4b9c] focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Checkout Action */}
            <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
              <button
                onClick={handleCheckout}
                className="w-full bg-[#1a4b9c] text-white py-4 rounded-[20px] font-extrabold text-lg shadow-[0_8px_30px_-10px_rgba(26,75,156,0.6)] hover:bg-[#153a7a] transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                Lanjut Pembayaran
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
