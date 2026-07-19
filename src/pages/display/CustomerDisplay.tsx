import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "pos_customer_display";

const fmt = (n: number) =>
  n.toLocaleString("id-ID", { minimumFractionDigits: 0 });

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
      {/* Animated background blobs */}
      <div className="cd-blob cd-blob-1" />
      <div className="cd-blob cd-blob-2" />
      <div className="cd-blob cd-blob-3" />

      <div className="cd-idle-content">
        {/* Logo */}
        <div className="cd-logo-ring">
          <span className="cd-logo-icon">☕</span>
        </div>
        <h1 className="cd-brand">Lapanbelas Coffee</h1>
        <p className="cd-tagline">Where Every Cup Tells a Story</p>

        {/* Clock */}
        <div className="cd-clock-box">
          <div className="cd-time">{timeStr}</div>
          <div className="cd-date">{dateStr}</div>
        </div>

        {/* Rotating promo */}
        <div className="cd-promo-carousel">
          {promos.map((p, i) => (
            <div
              key={i}
              className={`cd-promo-slide ${i === activePromo ? "cd-promo-active" : ""}`}
            >
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

// ─── Order Summary Screen ──────────────────────────────────────────────────────
function OrderScreen({ data }: { data: DisplayData }) {
  return (
    <div className="cd-order">
      <div className="cd-order-header">
        <div className="cd-order-logo">☕</div>
        <div>
          <h2 className="cd-order-title">Ringkasan Pesanan</h2>
          {data.customerName && (
            <p className="cd-order-customer">Halo, <strong>{data.customerName}</strong> 👋</p>
          )}
        </div>
        <div className="cd-order-badge">
          <span className="material-symbols-outlined">receipt_long</span>
          {data.orderId && <span className="cd-order-id">{data.orderId}</span>}
        </div>
      </div>

      <div className="cd-order-body">
        {/* Items list */}
        <div className="cd-items-list">
          <div className="cd-items-header">
            <span>Item</span>
            <span>Qty</span>
            <span>Harga</span>
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

        {/* Totals */}
        <div className="cd-totals">
          <div className="cd-total-row">
            <span>Subtotal</span>
            <span>Rp {fmt(data.subtotal || 0)}</span>
          </div>
          {(data.discount || 0) > 0 && (
            <div className="cd-total-row cd-discount-row">
              <span>Diskon {data.discountName ? `(${data.discountName})` : ""}</span>
              <span>- Rp {fmt(data.discount || 0)}</span>
            </div>
          )}
          <div className="cd-total-row">
            <span>Pajak</span>
            <span>Rp {fmt(data.tax || 0)}</span>
          </div>
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

  useEffect(() => {
    setTimer(data.qrisTimer ?? 900);
  }, [data.qrisUrl, data.qrisTimer]);

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

        {/* Order mini summary */}
        <div className="cd-pay-summary">
          {(data.items || []).map((item, i) => (
            <div key={i} className="cd-pay-item">
              <span>{item.name} ×{item.qty}</span>
              <span>Rp {fmt(item.price * item.qty)}</span>
            </div>
          ))}
          {(data.discount || 0) > 0 && (
            <div className="cd-pay-item cd-pay-discount">
              <span>Diskon</span>
              <span>- Rp {fmt(data.discount || 0)}</span>
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
            <p className="cd-qris-hint">
              Scan dengan aplikasi M-Banking atau e-Wallet kesayangan Anda
            </p>
            <div className="cd-qris-wallets">
              {["GoPay", "OVO", "Dana", "ShopeePay", "LinkAja", "BSI Mobile"].map(w => (
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
      <div className="cd-blob cd-blob-1" />
      <div className="cd-blob cd-blob-2" />

      <div className="cd-success-content">
        <div className="cd-success-ring">
          <span className="material-symbols-outlined cd-success-check">check_circle</span>
        </div>
        <h1 className="cd-success-title">Pembayaran Berhasil!</h1>
        {data.customerName && (
          <p className="cd-success-name">Terima kasih, <strong>{data.customerName}</strong> 🙏</p>
        )}
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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CustomerDisplay() {
  const [displayData, setDisplayData] = useState<DisplayData>({ state: "idle" });

  useEffect(() => {
    const CHANNEL_NAME = "pos18_customer_display";

    // 1. BroadcastChannel — primary (instan, same-origin lintas tab)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (e) => {
        if (e.data) setDisplayData(e.data as DisplayData);
      };
    } catch { /* tidak tersedia di browser lama */ }

    // 2. localStorage polling — fallback
    const read = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: DisplayData = JSON.parse(raw);
          setDisplayData(parsed);
        }
      } catch { /* ignore */ }
    };

    read();
    const interval = setInterval(read, 500);

    // 3. Supabase Realtime — primary untuk lintas perangkat (Skenario B)
    const remoteChannel = supabase.channel('public:customer-display')
      .on('broadcast', { event: 'display-update' }, ({ payload }) => {
        if (payload) setDisplayData(payload as DisplayData);
      })
      .subscribe();

    return () => {
      bc?.close();
      supabase.removeChannel(remoteChannel);
      clearInterval(interval);
    };
  }, []);

  const renderScreen = () => {
    switch (displayData.state) {
      case "order": return <OrderScreen data={displayData} />;
      case "payment": return <PaymentScreen data={displayData} />;
      case "success": return <SuccessScreen data={displayData} />;
      default: return <IdleScreen />;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="cd-root">
        <div className="cd-screen">
          {renderScreen()}
        </div>
        {/* Bottom bar */}
        <div className="cd-bottom-bar">
          <span>☕ Lapanbelas Coffee — Customer Display</span>
          <span className="cd-bottom-live">
            <span className="cd-live-dot" />
            LIVE
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .cd-root {
    font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background: #0a0a0f;
    overflow: hidden;
  }

  .cd-screen {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  /* ── Bottom Bar ── */
  .cd-bottom-bar {
    height: 36px;
    background: rgba(255,255,255,0.04);
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.05em;
  }
  .cd-bottom-live { display: flex; align-items: center; gap: 6px; color: #34d399; font-weight: 700; }
  .cd-live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #34d399;
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

  /* ── Shared blobs ── */
  .cd-blob { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
  .cd-blob-1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(120,60,30,0.35) 0%, transparent 70%); top: -200px; left: -200px; animation: blobMove1 12s ease-in-out infinite; }
  .cd-blob-2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(60,30,100,0.25) 0%, transparent 70%); bottom: -150px; right: -150px; animation: blobMove2 15s ease-in-out infinite; }
  .cd-blob-3 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(30,80,120,0.2) 0%, transparent 70%); top: 40%; left: 50%; animation: blobMove3 18s ease-in-out infinite; }
  @keyframes blobMove1 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(60px,40px);} }
  @keyframes blobMove2 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-50px,-30px);} }
  @keyframes blobMove3 { 0%,100%{transform:translate(-50%,-50%);} 50%{transform:translate(-45%,-55%);} }

  /* ══════════════════════════════
     IDLE SCREEN
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
    gap: 20px; padding: 40px;
  }
  .cd-logo-ring {
    width: 120px; height: 120px; border-radius: 50%;
    background: linear-gradient(135deg, #7c3f1f 0%, #4d3227 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 60px rgba(124,63,31,0.5), 0 0 120px rgba(124,63,31,0.2);
    animation: logoFloat 4s ease-in-out infinite;
  }
  .cd-logo-icon { font-size: 52px; }
  @keyframes logoFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }

  .cd-brand { font-size: 52px; font-weight: 900; color: #fff; letter-spacing: -1.5px; line-height: 1; }
  .cd-tagline { font-size: 18px; color: rgba(255,255,255,0.4); font-style: italic; letter-spacing: 0.1em; }

  .cd-clock-box {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px; padding: 16px 40px;
    backdrop-filter: blur(20px);
  }
  .cd-time { font-size: 56px; font-weight: 800; color: #fff; letter-spacing: -2px; font-variant-numeric: tabular-nums; }
  .cd-date { font-size: 14px; color: rgba(255,255,255,0.45); text-transform: capitalize; margin-top: 4px; }

  .cd-promo-carousel { position: relative; height: 80px; width: 600px; }
  .cd-promo-slide {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    opacity: 0; transform: translateY(12px);
    transition: all 0.6s ease;
  }
  .cd-promo-active { opacity: 1; transform: translateY(0); }
  .cd-promo-emoji { font-size: 28px; }
  .cd-promo-text { font-size: 16px; color: rgba(255,255,255,0.6); font-weight: 500; max-width: 500px; line-height: 1.5; }

  .cd-waiting-hint { font-size: 13px; color: rgba(255,255,255,0.2); margin-top: 8px; max-width: 480px; line-height: 1.6; }

  /* ══════════════════════════════
     ORDER SCREEN
  ══════════════════════════════ */
  .cd-order {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, #0d0907 0%, #0a0a0f 100%);
    display: flex; flex-direction: column;
    animation: screenFadeIn 0.5s ease;
  }
  @keyframes screenFadeIn { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }

  .cd-order-header {
    padding: 24px 40px;
    background: rgba(124,63,31,0.15);
    border-bottom: 1px solid rgba(124,63,31,0.3);
    display: flex; align-items: center; gap: 20px;
  }
  .cd-order-logo { font-size: 36px; }
  .cd-order-title { font-size: 28px; font-weight: 800; color: #fff; }
  .cd-order-customer { font-size: 15px; color: rgba(255,255,255,0.6); margin-top: 4px; }
  .cd-order-badge {
    margin-left: auto;
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    padding: 8px 16px; border-radius: 12px; color: rgba(255,255,255,0.6); font-size: 14px;
  }
  .cd-order-id { font-weight: 700; color: #f4a261; }

  .cd-order-body { flex: 1; display: flex; gap: 0; overflow: hidden; }

  .cd-items-list { flex: 1; padding: 28px 40px; overflow: hidden; display: flex; flex-direction: column; }
  .cd-items-header {
    display: grid; grid-template-columns: 1fr 60px 120px;
    font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.3);
    letter-spacing: 0.1em; text-transform: uppercase;
    padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px;
  }
  .cd-items-header span:last-child { text-align: right; }
  .cd-items-header span:nth-child(2) { text-align: center; }

  .cd-items-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
  .cd-items-scroll::-webkit-scrollbar { width: 4px; }
  .cd-items-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

  .cd-item-row {
    display: grid; grid-template-columns: 1fr 60px 120px;
    align-items: center; padding: 14px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    animation: itemSlideIn 0.4s ease both;
  }
  @keyframes itemSlideIn { from{opacity:0;transform:translateX(-12px);} to{opacity:1;transform:translateX(0);} }
  .cd-item-name { display: flex; flex-direction: column; gap: 3px; }
  .cd-item-name > span:first-child { font-size: 17px; font-weight: 600; color: #fff; }
  .cd-item-note { font-size: 12px; color: rgba(255,255,255,0.35); }
  .cd-item-qty { text-align: center; font-size: 16px; font-weight: 700; color: #f4a261; }
  .cd-item-price { text-align: right; font-size: 16px; font-weight: 700; color: #fff; }

  .cd-totals {
    width: 320px; padding: 28px 32px;
    background: rgba(255,255,255,0.03);
    border-left: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column; gap: 10px; justify-content: flex-end;
  }
  .cd-total-row { display: flex; justify-content: space-between; font-size: 15px; color: rgba(255,255,255,0.5); }
  .cd-discount-row { color: #34d399; }
  .cd-total-final {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px; margin-top: 8px;
    background: linear-gradient(135deg, rgba(124,63,31,0.3) 0%, rgba(77,50,39,0.3) 100%);
    border: 1px solid rgba(124,63,31,0.4); border-radius: 16px;
    font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7);
  }
  .cd-total-final span:last-child { font-size: 26px; font-weight: 900; color: #f4a261; }

  .cd-order-footer {
    padding: 16px 40px;
    background: rgba(255,255,255,0.02);
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; color: rgba(255,255,255,0.35);
  }
  .cd-footer-icon { font-size: 18px; animation: pulse 1.5s infinite; color: #f4a261; }

  /* ══════════════════════════════
     PAYMENT SCREEN
  ══════════════════════════════ */
  .cd-payment {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, #0d0907 0%, #0a0a0f 100%);
    display: flex;
    animation: screenFadeIn 0.5s ease;
  }

  .cd-payment-left {
    flex: 1; padding: 48px 48px 48px 60px;
    display: flex; flex-direction: column; gap: 24px;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  .cd-pay-brand { font-size: 18px; font-weight: 800; color: rgba(255,255,255,0.4); letter-spacing: -0.5px; }
  .cd-pay-title { font-size: 44px; font-weight: 900; color: #fff; letter-spacing: -1.5px; }

  .cd-pay-summary {
    flex: 1; display: flex; flex-direction: column; gap: 10px;
    overflow-y: auto;
  }
  .cd-pay-summary::-webkit-scrollbar { width: 4px; }
  .cd-pay-summary::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

  .cd-pay-item {
    display: flex; justify-content: space-between;
    font-size: 16px; color: rgba(255,255,255,0.55); padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .cd-pay-discount { color: #34d399; }

  .cd-pay-total-box {
    background: linear-gradient(135deg, rgba(124,63,31,0.25) 0%, rgba(77,50,39,0.2) 100%);
    border: 1px solid rgba(124,63,31,0.4); border-radius: 20px;
    padding: 24px 28px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .cd-pay-total-label { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.6); }
  .cd-pay-total-amount { font-size: 38px; font-weight: 900; color: #f4a261; letter-spacing: -1px; }

  .cd-pay-cash-info {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    padding: 24px; border-radius: 20px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.5); font-size: 15px;
  }
  .cd-pay-cash-info .material-symbols-outlined { font-size: 36px; color: #f4a261; }
  .cd-pay-cash-sub { font-size: 12px; color: rgba(255,255,255,0.3); }

  .cd-payment-right {
    width: 420px; padding: 48px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;
  }

  .cd-qris-frame {
    background: #fff; border-radius: 28px; padding: 20px;
    box-shadow: 0 0 80px rgba(124,63,31,0.3), 0 20px 60px rgba(0,0,0,0.5);
    width: 100%; max-width: 340px;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    animation: qrisAppear 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes qrisAppear { from{opacity:0;transform:scale(0.8);} to{opacity:1;transform:scale(1);} }

  .cd-qris-top-bar { width: 100%; display: flex; justify-content: space-between; align-items: center; }
  .cd-qris-chip {
    background: linear-gradient(135deg, #7c3f1f, #4d3227);
    color: #fff; padding: 4px 12px; border-radius: 8px; font-size: 13px; font-weight: 800; letter-spacing: 1px;
  }
  .cd-qris-provider { font-size: 12px; font-weight: 600; color: #888; }

  .cd-qris-img-wrap {
    background: #f8f8f8; border-radius: 16px; padding: 12px;
    border: 2px solid #f0f0f0;
  }
  .cd-qris-img { width: 220px; height: 220px; object-fit: contain; mix-blend-mode: multiply; }

  .cd-qris-amount { font-size: 24px; font-weight: 900; color: #1a1a1a; }
  .cd-qris-timer {
    display: flex; align-items: center; gap: 6px;
    font-size: 13px; font-weight: 700; color: #f59e0b;
    background: #fef3c7; padding: 6px 14px; border-radius: 20px; border: 1px solid #fde68a;
    transition: all 0.3s;
  }
  .cd-timer-urgent { color: #ef4444 !important; background: #fee2e2 !important; border-color: #fca5a5 !important; animation: timerPulse 1s infinite; }
  @keyframes timerPulse { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
  .cd-qris-timer .material-symbols-outlined { font-size: 16px; }

  .cd-qris-hint { font-size: 13px; color: rgba(255,255,255,0.4); text-align: center; line-height: 1.6; max-width: 340px; }
  .cd-qris-wallets { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
  .cd-wallet-chip {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 600;
    padding: 4px 10px; border-radius: 20px;
  }

  .cd-qris-loading {
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    color: rgba(255,255,255,0.4); font-size: 14px;
  }
  .cd-spin {
    width: 48px; height: 48px; border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.1); border-top-color: #f4a261;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to{transform:rotate(360deg);} }

  .cd-pay-cash-display {
    display: flex; flex-direction: column; align-items: center; gap: 16px;
    color: rgba(255,255,255,0.3); font-size: 18px; font-weight: 600;
  }
  .cd-cash-icon { font-size: 72px; color: rgba(255,255,255,0.15); }

  /* ══════════════════════════════
     SUCCESS SCREEN
  ══════════════════════════════ */
  .cd-success {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, #052e1c 0%, #0a0a0f 60%, #0d0907 100%);
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
    animation: screenFadeIn 0.5s ease;
  }
  .cd-success .cd-blob-1 { background: radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%); }
  .cd-success .cd-blob-2 { background: radial-gradient(circle, rgba(5,150,105,0.2) 0%, transparent 70%); }

  .cd-success-content {
    position: relative; z-index: 10;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 20px; padding: 40px;
  }
  .cd-success-ring {
    width: 140px; height: 140px; border-radius: 50%;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 80px rgba(16,185,129,0.5), 0 0 160px rgba(16,185,129,0.2);
    animation: successPop 0.7s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes successPop { from{transform:scale(0);opacity:0;} to{transform:scale(1);opacity:1;} }
  .cd-success-check { font-size: 64px; color: #fff; }

  .cd-success-title { font-size: 56px; font-weight: 900; color: #fff; letter-spacing: -2px; }
  .cd-success-name { font-size: 22px; color: rgba(255,255,255,0.6); }
  .cd-success-sub { font-size: 16px; color: rgba(255,255,255,0.4); }

  .cd-change-box {
    background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
    border-radius: 20px; padding: 20px 40px;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    font-size: 14px; color: rgba(255,255,255,0.5);
  }
  .cd-change-amount { font-size: 36px; font-weight: 900; color: #34d399; }

  .cd-success-order-mini {
    display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; max-width: 600px;
  }
  .cd-success-item {
    display: flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    padding: 8px 16px; border-radius: 12px;
    font-size: 14px; color: rgba(255,255,255,0.6); font-weight: 500;
  }
  .cd-success-item .material-symbols-outlined { font-size: 16px; color: #34d399; }

  .cd-success-footer { font-size: 18px; color: rgba(255,255,255,0.35); margin-top: 8px; }
`;
