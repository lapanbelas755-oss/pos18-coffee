import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePosStore } from '../../store/posStore';
import { supabase } from '../../lib/supabase';
import { KdsOrder } from '../../types';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function KdsKitchenScreen() {
  const { currentUser, logout } = useAuthStore();
  const { kdsOrders, setKdsOrders } = usePosStore();
  const navigate = useNavigate();
  
  const allKitchenOrders = kdsOrders.filter(o => o.station === 'kitchen' || o.station === 'all');
  const activeOrders = allKitchenOrders.filter(o => o.status !== 'done');
  const historyOrders = allKitchenOrders.filter(o => o.status === 'done');

  const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');
  const orders = activeTab === 'aktif' ? activeOrders : historyOrders;
  
  const [clock, setClock] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Text-to-Speech helper
  const speak = useCallback((text: string) => {
    if (!soundEnabled) return;
    
    // Gunakan Web Audio API — tidak butuh file external, selalu berhasil
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {}

    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [soundEnabled]);

  const handleSimulateOrder = async () => {
    const newId = Math.floor(Math.random() * 9000 + 1000).toString();
    const tableNo = Math.floor(Math.random() * 20 + 1);
    const newOrder: KdsOrder = {
      id: newId, type: 'Dine In', table: `Meja ${tableNo}`, timeInSeconds: 0,
      status: 'incoming', station: 'kitchen',
      items: [{ id: `k_${Date.now()}`, name: 'Nasi Goreng Spesial', checked: false }],
    };
    setKdsOrders(prev => [newOrder, ...prev]);
    await supabase.from('kds_orders').insert([newOrder]);
  };

  const prevOrdersCount = useRef(activeOrders.length);
  useEffect(() => {
    if (activeOrders.length > prevOrdersCount.current) {
      speak("Ada pesanan makanan baru");
    }
    prevOrdersCount.current = activeOrders.length;
  }, [activeOrders.length, speak]);

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date());
      setKdsOrders(prev => prev.map(o => ({
        ...o,
        timeInSeconds: o.timeInSeconds + 1,
        status: o.timeInSeconds + 1 > 600 ? 'urgent' : o.timeInSeconds + 1 > 300 ? 'working' : o.status,
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, [setKdsOrders]);

  const handleCheck = useCallback(async (orderId: string, itemId: string) => {
    const order = kdsOrders.find(o => o.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it);

    setKdsOrders(prev => prev.map(o =>
      o.id !== orderId ? o : { ...o, items: updatedItems }
    ));
    await supabase.from('kds_orders').update({ items: updatedItems }).eq('id', orderId);
  }, [kdsOrders, setKdsOrders]);

  const handleDone = useCallback(async (orderId: string) => {
    const order = kdsOrders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder = { ...order, status: 'done' as const };
    setKdsOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    await supabase.from('kds_orders').update({ status: 'done' }).eq('id', orderId);
    speak("Pesanan makanan selesai");
  }, [kdsOrders, setKdsOrders, speak]);

  const handleUndo = useCallback(async (orderId: string) => {
    const order = kdsOrders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder = { ...order, status: 'working' as const };
    setKdsOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    await supabase.from('kds_orders').update({ status: 'working' }).eq('id', orderId);
  }, [kdsOrders, setKdsOrders]);

  const urgentOrders = activeOrders.filter(o => o.status === 'urgent');

  return (
    <div className="h-screen bg-[#070f0a] text-white flex flex-col select-none">
      {/* Header */}
      <header className="bg-[#0a1a0e]/90 backdrop-blur-md border-b border-emerald-900/50 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-700 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">soup_kitchen</span>
          </div>
          <div>
            <p className="font-black text-emerald-400 text-sm leading-none">KDS DAPUR</p>
            <p className="text-white/40 text-[10px]">{currentUser?.name ?? 'Guest'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {urgentOrders.length > 0 && (
            <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl animate-pulse">
              <p className="text-red-400 font-black text-sm">⚠️ {urgentOrders.length} TERLAMBAT!</p>
            </div>
          )}
          <div className="font-mono text-white text-sm hidden sm:block">
            {clock.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" title="Audio / Suara">
            <span className="material-symbols-outlined text-[18px] text-white/50">{soundEnabled ? 'volume_up' : 'volume_off'}</span>
          </button>
          <button onClick={handleSimulateOrder} className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 text-xs font-bold transition-colors">
            + Simulasi Order
          </button>
          <button onClick={() => { logout(); navigate('/kds'); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[18px] text-white/50">logout</span>
          </button>
        </div>
      </header>

      {/* Orders — Large font for kitchen readability */}
      {/* Tabs */}
      <div className="bg-[#0a1a0e]/80 border-b border-emerald-900/30 px-6 py-2 flex items-center gap-4 shrink-0">
        <button onClick={() => setActiveTab('aktif')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'aktif' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
          Order Aktif ({activeOrders.length})
        </button>
        <button onClick={() => setActiveTab('riwayat')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'riwayat' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
          Riwayat Hari Ini ({historyOrders.length})
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-32 text-center">
            <span className="material-symbols-outlined text-6xl text-white/10 mb-4">done_all</span>
            <p className="text-white/30 font-bold text-xl">Semua pesanan selesai!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {orders.sort((a, b) => b.timeInSeconds - a.timeInSeconds).map(order => {
              const isUrgent  = order.status === 'urgent' || order.timeInSeconds > 600;
              const isWorking = order.status === 'working' || order.timeInSeconds > 300;
              const allChecked = order.items.every(i => i.checked);

              return (
                <div key={order.id} className={`rounded-2xl overflow-hidden flex flex-col border transition-all ${
                  isUrgent  ? 'border-red-500   bg-red-950/40   shadow-lg shadow-red-900/30' :
                  isWorking ? 'border-orange-500 bg-orange-950/30 shadow-lg shadow-orange-900/20' :
                              'border-emerald-800 bg-emerald-950/30'
                }`}>
                  {/* Card Header */}
                  <div className={`px-5 py-4 flex items-center justify-between ${
                    isUrgent ? 'bg-red-700' : isWorking ? 'bg-orange-600' : 'bg-emerald-800'
                  }`}>
                    <div>
                      <p className="font-black text-white text-2xl leading-none">{order.table ?? order.type}</p>
                      {order.customerName && <p className="text-white/70 text-sm mt-0.5">{order.customerName}</p>}
                      <p className="text-white/60 text-xs mt-1">#{order.id} · {order.type}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-black text-3xl ${isUrgent ? 'text-red-200 animate-pulse' : 'text-white'}`}>
                        {formatTime(order.timeInSeconds)}
                      </p>
                      {isUrgent && <p className="text-red-200 text-xs font-bold animate-pulse">⚠️ TERLAMBAT</p>}
                    </div>
                  </div>

                  {/* Items — LARGE text for kitchen visibility */}
                  <div className="flex-1 p-5 space-y-3">
                    {order.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleCheck(order.id, item.id)}
                        className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                          item.checked
                            ? 'bg-emerald-900/40 border-emerald-700/50 opacity-60'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 active:scale-98'
                        }`}
                      >
                        {/* Big checkbox */}
                        <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-white/40'
                        }`}>
                          {item.checked && <span className="material-symbols-outlined text-white text-xl">check</span>}
                        </div>
                        <div className="flex-1">
                          <p className={`font-black text-xl leading-tight ${item.checked ? 'line-through text-white/30' : 'text-white'}`}>
                            {item.name}
                          </p>
                          {item.notes && (
                            <p className={`text-base font-black mt-2 px-3 py-1.5 rounded-lg inline-block ${
                              isUrgent ? 'bg-red-500/30 text-red-200' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              ⚡ {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Done Button */}
                  <div className="p-4 bg-black/40 border-t border-emerald-900/50 flex gap-2">
                  {activeTab === 'riwayat' ? (
                    <button 
                      onClick={() => handleUndo(order.id)}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">undo</span>
                      Kembalikan Order
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDone(order.id)}
                      disabled={!allChecked}
                      className={`flex-1 py-3 font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2 ${
                        allChecked 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">done_all</span>
                      Pesanan Siap
                    </button>
                  )}
                </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="bg-[#0a1a0e]/90 border-t border-emerald-900/50 px-6 py-2 flex items-center justify-between shrink-0">
        <p className="text-white/30 text-xs">{orders.length} order aktif · Ketuk item untuk centang selesai</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <p className="text-emerald-400 text-xs font-bold">Live</p>
        </div>
      </div>
    </div>
  );
}
