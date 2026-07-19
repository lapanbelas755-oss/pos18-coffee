import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DisplayItem {
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

interface DisplayData {
  state: "idle" | "order" | "payment" | "success";
  items?: DisplayItem[];
  subtotal?: number;
  discount?: number;
  discountName?: string;
  tax?: number;
  total?: number;
  customerName?: string;
  paymentMethod?: "Cash" | "QRIS";
  qrisUrl?: string | null;
  qrisTimer?: number;
  orderId?: string;
  change?: number;
}

const STORAGE_KEY = "pos_customer_display";
const fmt = (n: number) => n.toLocaleString("id-ID", { minimumFractionDigits: 0 });

// ─── Idle Screen ──────────────────────────────────────────────────────────────
function IdleScreen() {
  const [time, setTime] = useState(new Date());
  const [activePromo, setActivePromo] = useState(0);
  const promos = [
    { emoji: "☕", text: "Nikmati kopi specialty kami yang dipilih langsung dari petani terbaik" },
    { emoji: "🎉", text: "Program loyalitas: Kumpulkan poin setiap transaksi & dapatkan hadiah" },
    { emoji: "📱", text: "Scan QR di meja Anda untuk self-order langsung dari smartphone" },
    { emoji: "✨", text: "Selamat datang di Lapanbelas Coffee — Where Every Cup Tells a Story" },
  ];
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const p = setInterval(() => setActivePromo(i => (i + 1) % promos.length), 4000);
    return () => { clearInterval(t); clearInterval(p); };
  }, []);
  const timeStr = time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = time.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="cd-idle">
      <div className="cd-blob cd-blob-1" /><div className="cd-blob cd-blob-2" /><div className="cd-blob cd-blob-3" />
      <div className="cd-idle-content">
        <div className="cd-logo-ring"><span className="cd-logo-icon">☕</span></div>
        <h1 className="cd-brand">Lapanbelas Coffee</h1>
        <p className="cd-tagline">Where Every Cup Tells a Story</p>
        <div className="cd-clock-box">
          <div className="cd-time">{timeStr}</div>
          <div className="cd-date">{dateStr}</div>
        </div>
        <div className="cd-promo-carousel">
          {promos.map((p, i) => (
            <div key={i} className={`cd-promo-slide ${i === activePromo ? "cd-promo-active" : ""}`}>
              <span className="cd-promo-emoji">{p.emoji}</span>
              <p className="cd-promo-text">{p.text}</p>
            </div>
          ))}
        </div>
        <p className="cd-waiting-hint">Silakan pesan di kasir — tampilan ini akan menampilkan ringkasan pesanan Anda</p>
      </div>
    </div>
  );
}

// ─── Order Screen ──────────────────────────────────────────────────────────────
function OrderScreen({ data }: { data: DisplayData }) {
  return (
    <div className="cd-order">
      <div className="cd-order-header">
        <div className="cd-order-logo">☕</div>
        <div>
          <h2 className="cd-order-title">Ringkasan Pesanan</h2>
          {data.customerName && <p className="cd-order-customer">Halo, <strong>{data.customerName}</strong> 👋</p>}
        </div>
        <div className="cd-order-badge">
          <span className="material-symbols-outlined">receipt_long</span>
          {data.orderId && <span className="cd-order-id">{data.orderId}</span>}
        </div>
      </div>
      <div className="cd-order-body">
        <div className="cd-items-list">
          <div className="cd-items-header">
            <span>Item</span><span>Qty</span><span>Harga</span>
          </div>
          <div className="cd-items-scroll">
            {(data.items || []).map((item, i) => (
              <div key={i} className="cd-item-row">
                <div className="cd-item-name">
                  <span>{item.name}</span>
                  {item.notes && <span className="cd-item-note">{item.notes}</span>}
                </div>
                <span className="cd-item-qty">×{item.qty}</span>
                <span className="cd-item-price">Rp {fmt(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="cd-totals">
          <div className="cd-total-row"><span>Subtotal</span><span>Rp {fmt(data.subtotal || 0)}</span></div>
          {(data.discount || 0) > 0 && (
            <div className="cd-total-row cd-discount-row">
              <span>Diskon {data.discountName ? `(${data.discountName})` : ""}</span>
              <span>- Rp {fmt(data.discount || 0)}</span>
            </div>
          )}
          <div className="cd-total-row"><span>Pajak</span><span>Rp {fmt(data.tax || 0)}</span></div>
          <div className="cd-total-final">
            <span>Total Bayar</span>
            <span>Rp {fmt(data.total || 0)}</span>
          </div>
        </div>
      </div>
      <div className="cd-order-footer">
        <span className="material-symbols-outlined cd-footer-icon">pending</span>
        <span>Menunggu konfirmasi pembayaran...</span>
      </div>
    </div>
  );
}

// ─── Payment Screen ────────────────────────────────────────────────────────────
function PaymentScreen({ data }: { data: DisplayData }) {
  const [timer, setTimer] = useState(data.qrisTimer ?? 900);
  const timerRef = useRef<any>(null);
  useEffect(() => { setTimer(data.qrisTimer ?? 900); }, [data.qrisUrl, data.qrisTimer]);
  useEffect(() => {
    if (data.paymentMethod === "QRIS" && data.qrisUrl && timer > 0) {
      timerRef.current = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [data.paymentMethod, data.qrisUrl, timer]);
  const mins = Math.floor(timer / 60);
  const secs = (timer % 60).toString().padStart(2, "0");
  return (
    <div className="cd-payment">
      <div className="cd-payment-left">
        <div className="cd-pay-brand">☕ Lapanbelas Coffee</div>
        <h2 className="cd-pay-title">Pembayaran</h2>
        <div className="cd-pay-summary">
          {(data.items || []).map((item, i) => (
            <div key={i} className="cd-pay-item">
              <span>{item.name} ×{item.qty}</span>
              <span>Rp {fmt(item.price * item.qty)}</span>
            </div>
          ))}
          {(data.discount || 0) > 0 && (
            <div className="cd-pay-item cd-pay-discount">
              <span>Diskon</span><span>- Rp {fmt(data.discount || 0)}</span>
            </div>
          )}
        </div>
        <div className="cd-pay-total-box">
          <span className="cd-pay-total-label">Total Tagihan</span>
          <span className="cd-pay-total-amount">Rp {fmt(data.total || 0)}</span>
        </div>
        {data.paymentMethod === "Cash" && (
          <div className="cd-pay-cash-info">
            <span className="material-symbols-outlined">payments</span>
            <p>Pembayaran Tunai</p>
            <p className="cd-pay-cash-sub">Serahkan uang kepada kasir</p>
          </div>
        )}
      </div>
      <div className="cd-payment-right">
        {data.paymentMethod === "QRIS" && data.qrisUrl ? (
          <>
            <div className="cd-qris-frame">
              <div className="cd-qris-top-bar">
                <span className="cd-qris-chip">QRIS</span>
                <span className="cd-qris-provider">Midtrans</span>
              </div>
              <div className="cd-qris-img-wrap">
                <img src={data.qrisUrl} alt="QRIS Code" className="cd-qris-img" />
              </div>
              <div className="cd-qris-amount">Rp {fmt(data.total || 0)}</div>
              <div className={`cd-qris-timer ${timer < 60 ? "cd-timer-urgent" : ""}`}>
                <span className="material-symbols-outlined">schedule</span>
                Berlaku {mins}:{secs}
              </div>
            </div>
            <p className="cd-qris-hint">Scan dengan M-Banking atau e-Wallet kesayangan Anda</p>
            <div className="cd-qris-wallets">
              {["GoPay", "OVO", "Dana", "ShopeePay", "LinkAja", "BSI"].map(w => (
                <span key={w} className="cd-wallet-chip">{w}</span>
              ))}
            </div>
          </>
        ) : data.paymentMethod === "QRIS" && !data.qrisUrl ? (
          <div className="cd-qris-loading">
            <div className="cd-spin" />
            <p>Memuat QRIS...</p>
          </div>
        ) : (
          <div className="cd-pay-cash-display">
            <span className="material-symbols-outlined cd-cash-icon">payments</span>
            <p>Bayar Tunai</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ data }: { data: DisplayData }) {
  return (
    <div className="cd-success">
      <div className="cd-blob cd-blob-1" /><div className="cd-blob cd-blob-2" />
      <div className="cd-success-content">
        <div className="cd-success-ring">
          <span className="material-symbols-outlined cd-success-check">check_circle</span>
        </div>
        <h1 className="cd-success-title">Pembayaran Berhasil!</h1>
        {data.customerName && <p className="cd-success-name">Terima kasih, <strong>{data.customerName}</strong> 🙏</p>}
        <p className="cd-success-sub">Pesanan Anda sedang diproses oleh tim kami</p>
        {data.change !== undefined && data.change > 0 && (
          <div className="cd-change-box">
            <span>Kembalian Anda</span>
            <span className="cd-change-amount">Rp {fmt(data.change)}</span>
          </div>
        )}
        <div className="cd-success-order-mini">
          {(data.items || []).map((item, i) => (
            <div key={i} className="cd-success-item">
              <span className="material-symbols-outlined">local_cafe</span>
              <span>{item.name} ×{item.qty}</span>
            </div>
          ))}
        </div>
        <p className="cd-success-footer">Selamat menikmati kopi Anda ☕✨</p>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function CustomerDisplay() {
  const [displayData, setDisplayData] = useState<DisplayData>({ state: "idle" });

  useEffect(() => {
    const CHANNEL_NAME = "pos18_customer_display";
    let bc: BroadcastChannel | null = null;
    let remoteChannel: ReturnType<typeof supabase.channel> | null = null;
    let wakeLock: WakeLockSentinel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let lastRaw = "";

    // ── 1. Screen Wake Lock: cegah tablet/HP sleep ──────────────────────────
    const acquireWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch { /* WakeLock tidak tersedia di semua browser */ }
    };
    acquireWakeLock();

    // Re-acquire saat tab aktif kembali setelah kunci layar
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        acquireWakeLock();
        // Baca ulang localStorage segera saat layar aktif kembali
        read();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // ── 2. BroadcastChannel (same-origin, zero-latency) ─────────────────────
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (e) => { if (e.data) setDisplayData(e.data as DisplayData); };
    } catch { /* fallback */ }

    // ── 3. localStorage polling (fallback, 500ms) ────────────────────────────
    const read = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        // Hanya update state jika data benar-benar berubah (cegah re-render sia-sia)
        if (raw && raw !== lastRaw) {
          lastRaw = raw;
          setDisplayData(JSON.parse(raw) as DisplayData);
        }
      } catch { /* ignore */ }
    };
    read();
    const interval = setInterval(read, 500);

    // ── 4. Supabase Realtime (cross-device, auto-reconnect) ──────────────────
    const connectSupabase = () => {
      if (remoteChannel) {
        supabase.removeChannel(remoteChannel);
      }
      remoteChannel = supabase.channel("public:customer-display")
        .on("broadcast", { event: "display-update" }, ({ payload }) => {
          if (payload) setDisplayData(payload as DisplayData);
        })
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // Auto-reconnect setelah 5 detik saat koneksi bermasalah
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connectSupabase, 5000);
          }
        });
    };
    connectSupabase();

    return () => {
      bc?.close();
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLock?.release().catch(() => {});
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (remoteChannel) supabase.removeChannel(remoteChannel);
      clearInterval(interval);
    };
  }, []);


  const renderScreen = () => {
    switch (displayData.state) {
      case "order":   return <OrderScreen data={displayData} />;
      case "payment": return <PaymentScreen data={displayData} />;
      case "success": return <SuccessScreen data={displayData} />;
      default:        return <IdleScreen />;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="cd-root">
        <div className="cd-screen">{renderScreen()}</div>
        <div className="cd-bottom-bar">
          <span>☕ Lapanbelas Coffee — Customer Display</span>
          <span className="cd-bottom-live"><span className="cd-live-dot" />LIVE</span>
        </div>
      </div>
    </>
  );
}

// ─── Styles (Mobile-First Responsive) ─────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .cd-root {
    font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex; flex-direction: column;
    width: 100vw; height: 100vh;
    background: #0a0a0f; overflow: hidden;
  }
  .cd-screen { flex: 1; overflow: hidden; position: relative; min-height: 0; }

  /* ── Bottom Bar ── */
  .cd-bottom-bar {
    height: 30px; background: rgba(255,255,255,0.04);
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 14px; font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.05em;
    flex-shrink: 0;
  }
  .cd-bottom-live { display: flex; align-items: center; gap: 5px; color: #34d399; font-weight: 700; }
  .cd-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
  @keyframes screenFadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }

  /* ── Blobs ── */
  .cd-blob { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; z-index: 0; }
  .cd-blob-1 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(120,60,30,0.35) 0%, transparent 70%); top: -100px; left: -100px; animation: blobMove1 12s ease-in-out infinite; }
  .cd-blob-2 { width: 250px; height: 250px; background: radial-gradient(circle, rgba(60,30,100,0.25) 0%, transparent 70%); bottom: -80px; right: -80px; animation: blobMove2 15s ease-in-out infinite; }
  .cd-blob-3 { width: 200px; height: 200px; background: radial-gradient(circle, rgba(30,80,120,0.2) 0%, transparent 70%); top: 40%; left: 50%; animation: blobMove3 18s ease-in-out infinite; }
  @keyframes blobMove1 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(30px,20px);} }
  @keyframes blobMove2 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-20px,-15px);} }
  @keyframes blobMove3 { 0%,100%{transform:translate(-50%,-50%);} 50%{transform:translate(-45%,-55%);} }

  /* ══════════════════════════════
     IDLE SCREEN — Mobile First
  ══════════════════════════════ */
  .cd-idle {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0d0907 0%, #120c0a 50%, #0a0a0f 100%);
    position: relative; overflow: hidden;
  }
  .cd-idle-content {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 12px; padding: 20px; width: 100%; max-width: 480px;
  }
  .cd-logo-ring {
    width: 70px; height: 70px; border-radius: 50%;
    background: linear-gradient(135deg, #7c3f1f 0%, #4d3227 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 30px rgba(124,63,31,0.5); animation: logoFloat 4s ease-in-out infinite;
  }
  .cd-logo-icon { font-size: 30px; }
  @keyframes logoFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
  .cd-brand { font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -0.5px; line-height: 1; }
  .cd-tagline { font-size: 12px; color: rgba(255,255,255,0.4); font-style: italic; }
  .cd-clock-box {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px; padding: 10px 20px; backdrop-filter: blur(20px);
  }
  .cd-time { font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
  .cd-date { font-size: 10px; color: rgba(255,255,255,0.45); text-transform: capitalize; margin-top: 2px; }
  .cd-promo-carousel { position: relative; height: 56px; width: 100%; }
  .cd-promo-slide {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    opacity: 0; transform: translateY(8px); transition: all 0.6s ease; padding: 0 8px;
  }
  .cd-promo-active { opacity: 1; transform: translateY(0); }
  .cd-promo-emoji { font-size: 18px; flex-shrink: 0; }
  .cd-promo-text { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500; line-height: 1.4; text-align: left; }
  .cd-waiting-hint { font-size: 10px; color: rgba(255,255,255,0.2); line-height: 1.5; max-width: 260px; }

  @media (min-width: 480px) {
    .cd-logo-ring { width: 90px; height: 90px; }
    .cd-logo-icon { font-size: 40px; }
    .cd-brand { font-size: 36px; }
    .cd-tagline { font-size: 14px; }
    .cd-time { font-size: 44px; }
    .cd-date { font-size: 12px; }
    .cd-promo-carousel { height: 64px; }
    .cd-promo-text { font-size: 13px; }
    .cd-promo-emoji { font-size: 22px; }
    .cd-idle-content { gap: 16px; }
  }
  @media (min-width: 768px) {
    .cd-logo-ring { width: 110px; height: 110px; }
    .cd-logo-icon { font-size: 50px; }
    .cd-brand { font-size: 48px; }
    .cd-tagline { font-size: 17px; }
    .cd-time { font-size: 54px; }
    .cd-promo-text { font-size: 15px; }
    .cd-idle-content { gap: 20px; max-width: 640px; }
    .cd-waiting-hint { font-size: 13px; max-width: 400px; }
  }

  /* ══════════════════════════════
     ORDER SCREEN — Mobile First
  ══════════════════════════════ */
  .cd-order {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, #0d0907 0%, #0a0a0f 100%);
    display: flex; flex-direction: column; animation: screenFadeIn 0.5s ease; overflow: hidden;
  }
  .cd-order-header {
    padding: 12px 14px; flex-shrink: 0;
    background: rgba(124,63,31,0.15); border-bottom: 1px solid rgba(124,63,31,0.3);
    display: flex; align-items: center; gap: 10px;
  }
  .cd-order-logo { font-size: 20px; }
  .cd-order-title { font-size: 16px; font-weight: 800; color: #fff; }
  .cd-order-customer { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 1px; }
  .cd-order-badge {
    margin-left: auto; display: flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    padding: 5px 8px; border-radius: 8px; color: rgba(255,255,255,0.6); font-size: 11px;
  }
  .cd-order-id { font-weight: 700; color: #f4a261; }
  /* Mobile: vertical stack */
  .cd-order-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
  .cd-items-list { flex: 1; padding: 12px 14px; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
  .cd-items-header {
    display: grid; grid-template-columns: 1fr 40px 80px;
    font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.3);
    letter-spacing: 0.08em; text-transform: uppercase;
    padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 6px; flex-shrink: 0;
  }
  .cd-items-header span:last-child { text-align: right; }
  .cd-items-header span:nth-child(2) { text-align: center; }
  .cd-items-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
  .cd-items-scroll::-webkit-scrollbar { width: 3px; }
  .cd-items-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
  .cd-item-row {
    display: grid; grid-template-columns: 1fr 40px 80px;
    align-items: center; padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    animation: itemSlideIn 0.4s ease both;
  }
  @keyframes itemSlideIn { from{opacity:0;transform:translateX(-8px);} to{opacity:1;transform:translateX(0);} }
  .cd-item-name { display: flex; flex-direction: column; gap: 2px; }
  .cd-item-name > span:first-child { font-size: 12px; font-weight: 600; color: #fff; }
  .cd-item-note { font-size: 9px; color: rgba(255,255,255,0.35); }
  .cd-item-qty { text-align: center; font-size: 12px; font-weight: 700; color: #f4a261; }
  .cd-item-price { text-align: right; font-size: 11px; font-weight: 700; color: #fff; }
  /* Totals at bottom on mobile */
  .cd-totals {
    padding: 10px 14px; flex-shrink: 0;
    background: rgba(255,255,255,0.03); border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column; gap: 5px;
  }
  .cd-total-row { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.5); }
  .cd-discount-row { color: #34d399; }
  .cd-total-final {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 12px; margin-top: 4px;
    background: linear-gradient(135deg, rgba(124,63,31,0.3) 0%, rgba(77,50,39,0.3) 100%);
    border: 1px solid rgba(124,63,31,0.4); border-radius: 10px;
    font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7);
  }
  .cd-total-final span:last-child { font-size: 20px; font-weight: 900; color: #f4a261; }
  .cd-order-footer {
    padding: 8px 14px; flex-shrink: 0;
    background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; gap: 6px;
    font-size: 10px; color: rgba(255,255,255,0.35);
  }
  .cd-footer-icon { font-size: 13px; animation: pulse 1.5s infinite; color: #f4a261; }

  /* Tablet: side-by-side */
  @media (min-width: 640px) {
    .cd-order-header { padding: 18px 28px; gap: 14px; }
    .cd-order-logo { font-size: 28px; }
    .cd-order-title { font-size: 22px; }
    .cd-order-customer { font-size: 13px; }
    .cd-order-body { flex-direction: row; }
    .cd-items-list { padding: 18px 28px; }
    .cd-items-header { grid-template-columns: 1fr 56px 106px; font-size: 11px; padding-bottom: 10px; margin-bottom: 10px; }
    .cd-item-row { grid-template-columns: 1fr 56px 106px; padding: 11px 0; }
    .cd-item-name > span:first-child { font-size: 15px; }
    .cd-item-qty { font-size: 14px; }
    .cd-item-price { font-size: 14px; }
    .cd-totals {
      width: 240px; padding: 18px 22px;
      border-top: none; border-left: 1px solid rgba(255,255,255,0.06);
      justify-content: flex-end;
    }
    .cd-total-row { font-size: 13px; }
    .cd-total-final { padding: 12px 14px; }
    .cd-total-final span:last-child { font-size: 22px; }
    .cd-order-footer { padding: 12px 28px; font-size: 12px; }
  }
  @media (min-width: 1024px) {
    .cd-order-header { padding: 22px 40px; }
    .cd-order-title { font-size: 26px; }
    .cd-items-list { padding: 24px 40px; }
    .cd-totals { width: 300px; padding: 24px 30px; }
    .cd-total-final span:last-child { font-size: 24px; }
    .cd-order-footer { padding: 14px 40px; font-size: 13px; }
  }

  /* ══════════════════════════════
     PAYMENT SCREEN — Mobile First
  ══════════════════════════════ */
  .cd-payment {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, #0d0907 0%, #0a0a0f 100%);
    display: flex; flex-direction: column; /* vertical on mobile */
    animation: screenFadeIn 0.5s ease; overflow-y: auto;
  }
  .cd-payment-left {
    padding: 16px 16px 10px; flex-shrink: 0;
    display: flex; flex-direction: column; gap: 12px;
  }
  .cd-pay-brand { font-size: 12px; font-weight: 800; color: rgba(255,255,255,0.4); }
  .cd-pay-title { font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
  .cd-pay-summary { display: flex; flex-direction: column; gap: 0; max-height: 110px; overflow-y: auto; }
  .cd-pay-summary::-webkit-scrollbar { width: 3px; }
  .cd-pay-summary::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
  .cd-pay-item {
    display: flex; justify-content: space-between;
    font-size: 12px; color: rgba(255,255,255,0.55); padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .cd-pay-discount { color: #34d399; }
  .cd-pay-total-box {
    background: linear-gradient(135deg, rgba(124,63,31,0.25) 0%, rgba(77,50,39,0.2) 100%);
    border: 1px solid rgba(124,63,31,0.4); border-radius: 14px;
    padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
  }
  .cd-pay-total-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6); }
  .cd-pay-total-amount { font-size: 24px; font-weight: 900; color: #f4a261; }
  .cd-pay-cash-info {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    padding: 12px; border-radius: 14px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.5); font-size: 12px;
  }
  .cd-pay-cash-info .material-symbols-outlined { font-size: 24px; color: #f4a261; }
  .cd-pay-cash-sub { font-size: 10px; color: rgba(255,255,255,0.3); }
  /* QRIS panel */
  .cd-payment-right {
    flex: 1; padding: 12px 16px 18px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .cd-qris-frame {
    background: #fff; border-radius: 18px; padding: 14px;
    box-shadow: 0 0 40px rgba(124,63,31,0.3), 0 12px 30px rgba(0,0,0,0.5);
    width: 100%; max-width: 240px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    animation: qrisAppear 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes qrisAppear { from{opacity:0;transform:scale(0.8);} to{opacity:1;transform:scale(1);} }
  .cd-qris-top-bar { width: 100%; display: flex; justify-content: space-between; align-items: center; }
  .cd-qris-chip {
    background: linear-gradient(135deg, #7c3f1f, #4d3227);
    color: #fff; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 800; letter-spacing: 1px;
  }
  .cd-qris-provider { font-size: 10px; font-weight: 600; color: #888; }
  .cd-qris-img-wrap { background: #f8f8f8; border-radius: 10px; padding: 6px; border: 2px solid #f0f0f0; }
  .cd-qris-img { width: 140px; height: 140px; object-fit: contain; mix-blend-mode: multiply; }
  .cd-qris-amount { font-size: 18px; font-weight: 900; color: #1a1a1a; }
  .cd-qris-timer {
    display: flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 700; color: #f59e0b;
    background: #fef3c7; padding: 4px 10px; border-radius: 14px; border: 1px solid #fde68a;
  }
  .cd-timer-urgent { color: #ef4444 !important; background: #fee2e2 !important; border-color: #fca5a5 !important; animation: timerPulse 1s infinite; }
  @keyframes timerPulse { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
  .cd-qris-timer .material-symbols-outlined { font-size: 13px; }
  .cd-qris-hint { font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; line-height: 1.5; max-width: 250px; }
  .cd-qris-wallets { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .cd-wallet-chip {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5); font-size: 9px; font-weight: 600;
    padding: 3px 7px; border-radius: 14px;
  }
  .cd-qris-loading { display: flex; flex-direction: column; align-items: center; gap: 10px; color: rgba(255,255,255,0.4); font-size: 12px; }
  .cd-spin { width: 36px; height: 36px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.1); border-top-color: #f4a261; animation: spin 0.8s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg);} }
  .cd-pay-cash-display { display: flex; flex-direction: column; align-items: center; gap: 10px; color: rgba(255,255,255,0.3); font-size: 14px; font-weight: 600; }
  .cd-cash-icon { font-size: 48px; color: rgba(255,255,255,0.15); }

  /* Tablet+: side-by-side */
  @media (min-width: 640px) {
    .cd-payment { flex-direction: row; overflow: hidden; }
    .cd-payment-left {
      flex: 1; padding: 32px 36px 32px 44px; gap: 18px;
      border-right: 1px solid rgba(255,255,255,0.06); border-top: none;
      justify-content: center;
    }
    .cd-pay-brand { font-size: 15px; }
    .cd-pay-title { font-size: 34px; }
    .cd-pay-summary { max-height: 180px; }
    .cd-pay-item { font-size: 14px; }
    .cd-pay-total-box { padding: 16px 20px; }
    .cd-pay-total-label { font-size: 14px; }
    .cd-pay-total-amount { font-size: 30px; }
    .cd-payment-right { width: 300px; padding: 32px; border-top: none; }
    .cd-qris-frame { max-width: 260px; padding: 16px; }
    .cd-qris-img { width: 170px; height: 170px; }
    .cd-qris-amount { font-size: 20px; }
  }
  @media (min-width: 1024px) {
    .cd-payment-left { padding: 48px 48px 48px 60px; gap: 22px; }
    .cd-pay-title { font-size: 42px; }
    .cd-pay-total-amount { font-size: 36px; }
    .cd-payment-right { width: 400px; padding: 44px; }
    .cd-qris-frame { max-width: 320px; padding: 18px; }
    .cd-qris-img { width: 200px; height: 200px; }
    .cd-qris-amount { font-size: 22px; }
    .cd-qris-hint { font-size: 12px; max-width: 300px; }
  }

  /* ══════════════════════════════
     SUCCESS SCREEN — Mobile First
  ══════════════════════════════ */
  .cd-success {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, #052e1c 0%, #0a0a0f 60%, #0d0907 100%);
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden; animation: screenFadeIn 0.5s ease;
  }
  .cd-success .cd-blob-1 { background: radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%); }
  .cd-success .cd-blob-2 { background: radial-gradient(circle, rgba(5,150,105,0.2) 0%, transparent 70%); }
  .cd-success-content {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 12px; padding: 20px; width: 100%;
  }
  .cd-success-ring {
    width: 80px; height: 80px; border-radius: 50%;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 50px rgba(16,185,129,0.5);
    animation: successPop 0.7s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes successPop { from{transform:scale(0);opacity:0;} to{transform:scale(1);opacity:1;} }
  .cd-success-check { font-size: 40px; color: #fff; }
  .cd-success-title { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
  .cd-success-name { font-size: 14px; color: rgba(255,255,255,0.6); }
  .cd-success-sub { font-size: 12px; color: rgba(255,255,255,0.4); }
  .cd-change-box {
    background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
    border-radius: 14px; padding: 12px 24px;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    font-size: 11px; color: rgba(255,255,255,0.5);
  }
  .cd-change-amount { font-size: 24px; font-weight: 900; color: #34d399; }
  .cd-success-order-mini { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 300px; }
  .cd-success-item {
    display: flex; align-items: center; gap: 4px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    padding: 5px 10px; border-radius: 8px;
    font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500;
  }
  .cd-success-item .material-symbols-outlined { font-size: 13px; color: #34d399; }
  .cd-success-footer { font-size: 12px; color: rgba(255,255,255,0.35); }

  @media (min-width: 480px) {
    .cd-success-content { gap: 16px; }
    .cd-success-ring { width: 100px; height: 100px; }
    .cd-success-check { font-size: 50px; }
    .cd-success-title { font-size: 36px; }
    .cd-success-name { font-size: 17px; }
    .cd-change-amount { font-size: 28px; }
  }
  @media (min-width: 768px) {
    .cd-success-ring { width: 130px; height: 130px; }
    .cd-success-check { font-size: 60px; }
    .cd-success-title { font-size: 48px; }
    .cd-success-name { font-size: 20px; }
    .cd-success-sub { font-size: 15px; }
    .cd-change-amount { font-size: 34px; }
    .cd-success-order-mini { max-width: 500px; }
    .cd-success-footer { font-size: 16px; }
  }
  @media (min-width: 1024px) {
    .cd-success-ring { width: 140px; height: 140px; }
    .cd-success-check { font-size: 64px; }
    .cd-success-title { font-size: 54px; }
    .cd-success-name { font-size: 22px; }
    .cd-change-amount { font-size: 36px; }
  }
`;
