import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePosStore } from '../../store/posStore';
import { supabase } from '../../lib/supabase';

type OrderStatus = 'waiting' | 'barista_done' | 'kitchen_done' | 'ready';
type OrderType = 'Dine In' | 'Takeaway' | 'Online';

interface MonitorOrder {
  id: string;
  queue: string;
  table?: string;
  type: OrderType;
  customerName?: string;
  timeInSeconds: number;
  baristaStatus: 'pending' | 'process' | 'done';
  kitchenStatus: 'pending' | 'process' | 'done' | 'none';
  paymentStatus: 'Paid' | 'Unpaid';
  itemCount: number;
  status: 'incoming' | 'working' | 'urgent' | 'done';
}

// INITIAL_ORDERS removed - using live data

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const StatusBadge = ({ status, label }: { status: 'pending' | 'process' | 'done' | 'none'; label: string }) => {
  if (status === 'none') return <span className="text-white/20 text-xs">—</span>;
  const config = {
    pending: 'bg-slate-700 text-slate-300',
    process: 'bg-orange-500/30 text-orange-300 animate-pulse',
    done:    'bg-emerald-500/30 text-emerald-300',
  }[status];
  const icon = { pending: 'schedule', process: 'autorenew', done: 'check_circle' }[status];
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${config}`}>
      <span className={`material-symbols-outlined text-[12px] ${status === 'process' ? 'animate-spin' : ''}`}>{icon}</span>
      {label}
    </span>
  );
};

export default function KdsKasirScreen() {
  const { currentUser, logout } = useAuthStore();
  const { posOrders, kdsOrders } = usePosStore();
  const navigate = useNavigate();

  // Create a stable mapping of real orders from Supabase
  const orders: MonitorOrder[] = React.useMemo(() => {
    const kasirTickets = kdsOrders.filter(k => k.station === 'kasir');
    
    return kasirTickets.map(kdsKasir => {
      const ticketId = kdsKasir.id.replace('-KSR', '');
      const po = posOrders.find(p => p.queue === ticketId || p.id === ticketId);
      
      let hasBarista = true;
      let hasKitchen = true;
      let paymentStatus = 'Paid';
      
      if (po) {
        hasBarista = po.items.some((i: any) => ["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE", "MILK"].includes((i.product?.category || i.category || "").toUpperCase()));
        hasKitchen = po.items.some((i: any) => !["COFFEE", "NON-COFFEE", "TEA", "SIGNATURE", "MILK"].includes((i.product?.category || i.category || "").toUpperCase()));
        paymentStatus = po.payment === 'Split' || !po.payment ? 'Unpaid' : 'Paid';
      }

      const kdsBarista = kdsOrders.find(k => k.id === `${ticketId}-B`);
      const kdsKitchen = kdsOrders.find(k => k.id === `${ticketId}-K`);

      const baristaStatus = !hasBarista ? 'none' : (!kdsBarista ? 'done' : (kdsBarista.status === 'working' ? 'process' : 'pending'));
      const kitchenStatus = !hasKitchen ? 'none' : (!kdsKitchen ? 'done' : (kdsKitchen.status === 'working' ? 'process' : 'pending'));

      return {
        id: kdsKasir.id,
        queue: ticketId,
        table: kdsKasir.table && kdsKasir.table !== '-' ? kdsKasir.table : undefined,
        type: kdsKasir.type as OrderType,
        customerName: kdsKasir.customerName || po?.customerName,
        timeInSeconds: kdsKasir.timeInSeconds,
        baristaStatus: baristaStatus as MonitorOrder['baristaStatus'],
        kitchenStatus: kitchenStatus as MonitorOrder['kitchenStatus'],
        paymentStatus: paymentStatus as MonitorOrder['paymentStatus'],
        itemCount: kdsKasir.items.length,
        status: kdsKasir.status
      };
    });
  }, [posOrders, kdsOrders]);

  const [filter, setFilter] = useState<'all' | OrderType>('all');
  const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');
  
  const activeOrders = orders.filter(o => o.status !== 'done');
  const historyOrders = orders.filter(o => o.status === 'done');
  
  const currentTabOrders = activeTab === 'aktif' ? activeOrders : historyOrders;

  const [clock, setClock] = useState(new Date());
  const [calledOrders, setCalledOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const iv = setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const speak = useCallback((text: string) => {
    if (!soundEnabled) return;
    
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}

    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [soundEnabled]);

  const readyOrders = activeOrders.filter(o => o.baristaStatus === 'done' && (o.kitchenStatus === 'done' || o.kitchenStatus === 'none'));
  const prevReadyCount = React.useRef(readyOrders.length);
  
  useEffect(() => {
    if (readyOrders.length > prevReadyCount.current) {
      speak("Pesanan telah siap, silakan dipanggil");
    }
    prevReadyCount.current = readyOrders.length;
  }, [readyOrders.length, speak]);

  const handleCallCustomer = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const callText = order.customerName 
        ? `Pesanan atas nama ${order.customerName}, sudah siap diambil.`
        : `Antrian nomor ${order.queue}, silahkan ambil pesanan Anda.`;
      speak(callText);
    }
    
    setCalledOrders(prev => new Set([...prev, orderId]));
    setTimeout(() => setCalledOrders(prev => { const s = new Set(prev); s.delete(orderId); return s; }), 5000);
  };

  const handleSetReady = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      await supabase.from('kds_orders').update({ status: 'done' }).eq('id', order.id);
    }
  };

  const handleUndo = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      await supabase.from('kds_orders').update({ status: 'working' }).eq('id', order.id);
    }
  };

  const filtered = filter === 'all' ? currentTabOrders : currentTabOrders.filter(o => o.type === filter);
  const inProgress  = activeOrders.length - readyOrders.length;

  return (
    <div className="h-screen bg-[#06080f] text-white flex flex-col select-none">
      {/* Header */}
      <header className="bg-[#0a0e1a]/90 backdrop-blur-md border-b border-blue-900/50 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">point_of_sale</span>
          </div>
          <div>
            <p className="font-black text-blue-400 text-sm leading-none">MONITOR KASIR</p>
            <p className="text-white/40 text-[10px]">{currentUser?.name ?? 'Guest'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary stats */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
              <span className="text-orange-300 text-xs font-bold">{inProgress} Proses</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-emerald-300 text-xs font-bold">{readyOrders.length} Siap</span>
            </div>
          </div>
          <div className="font-mono text-white text-sm hidden sm:block">
            {clock.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" title="Audio / Suara">
            <span className="material-symbols-outlined text-[18px] text-white/50">{soundEnabled ? 'volume_up' : 'volume_off'}</span>
          </button>
          <button onClick={() => { logout(); navigate('/kds'); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[18px] text-white/50">logout</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#0a0e1a]/80 border-b border-blue-900/30 px-6 py-2 flex items-center gap-4 shrink-0 overflow-x-auto">
        <button onClick={() => setActiveTab('aktif')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'aktif' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
          Order Aktif ({activeOrders.length})
        </button>
        <button onClick={() => setActiveTab('riwayat')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'riwayat' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
          Riwayat Hari Ini ({historyOrders.length})
        </button>
        <div className="w-px h-6 bg-white/10 mx-2"></div>
        {(['all', 'Dine In', 'Takeaway', 'Online'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}>
            {f === 'all' ? `Semua (${currentTabOrders.length})` : f}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="bg-[#0d1220] rounded-2xl border border-blue-900/30 overflow-hidden">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-[#111827] border-b border-blue-900/30">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Queue</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Order</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Pelanggan</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Waktu</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Barista</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Dapur</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Status</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => b.timeInSeconds - a.timeInSeconds).map((order, idx) => {
                const isReady = order.baristaStatus === 'done' && (order.kitchenStatus === 'done' || order.kitchenStatus === 'none');
                const isCalled = calledOrders.has(order.id);
                const isLate = order.timeInSeconds > 600;

                return (
                  <tr key={order.id} className={`border-b border-white/5 transition-colors hover:bg-white/5 ${idx % 2 === 0 ? '' : 'bg-white/[0.02]'} ${isReady ? 'bg-emerald-900/10' : ''}`}>
                    {/* Queue no */}
                    <td className="px-5 py-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${isReady ? 'bg-emerald-600' : isLate ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}>
                        {order.queue}
                      </div>
                    </td>
                    {/* Order info */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-white">{order.table ?? order.type}</p>
                      <p className="text-white/40 text-xs">{order.id} · {order.itemCount} item</p>
                    </td>
                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-black text-lg text-white/90">{order.customerName ?? '—'}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 mt-1 inline-block rounded-md ${order.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    {/* Time */}
                    <td className="px-5 py-4 text-center">
                      <p className={`font-mono font-bold text-lg ${isLate ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        {formatTime(order.timeInSeconds)}
                      </p>
                    </td>
                    {/* Barista */}
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={order.baristaStatus} label={{ pending: 'Antrian', process: 'Dibuat', done: 'Siap' }[order.baristaStatus]} />
                    </td>
                    {/* Kitchen */}
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={order.kitchenStatus} label={order.kitchenStatus !== 'none' ? { pending: 'Antrian', process: 'Masak', done: 'Siap' }[order.kitchenStatus as 'pending' | 'process' | 'done'] : '—'} />
                    </td>
                    {/* Overall status */}
                    <td className="px-5 py-4 text-center">
                      {isReady ? (
                        <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-black">✅ SIAP</span>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${isLate ? 'bg-red-500/20 text-red-300 animate-pulse' : 'bg-orange-500/20 text-orange-300'}`}>
                          {isLate ? '⚠️ TERLAMBAT' : '⏳ Proses'}
                        </span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {activeTab === 'riwayat' ? (
                          <button
                            onClick={() => handleUndo(order.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">undo</span>
                            Kembalikan
                          </button>
                        ) : (
                          <>
                            {isReady && (
                              <>
                                <button
                                  onClick={() => handleCallCustomer(order.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${isCalled ? 'bg-yellow-500 text-white animate-pulse' : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40'}`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">campaign</span>
                                  {isCalled ? 'Memanggil...' : 'Panggil'}
                                </button>
                                <button
                                  onClick={() => handleSetReady(order.id)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">done_all</span>
                                  Selesai
                                </button>
                              </>
                            )}
                            {!isReady && (
                              <span className="text-white/20 text-xs">Menunggu...</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-5xl text-white/10 mb-3 block">inbox</span>
              <p className="text-white/30 font-bold">Tidak ada order aktif</p>
            </div>
          )}
        </div>
      </main>

      <div className="bg-[#0a0e1a]/90 border-t border-blue-900/50 px-6 py-2 flex items-center justify-between shrink-0">
        <p className="text-white/30 text-xs">Monitor semua stasiun secara real-time · Klik Selesai untuk menutup order</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
          <p className="text-blue-400 text-xs font-bold">Live</p>
        </div>
      </div>
    </div>
  );
}
