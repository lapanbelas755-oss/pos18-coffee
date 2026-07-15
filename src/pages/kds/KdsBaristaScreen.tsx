import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePosStore } from '../../store/posStore';
import { supabase } from '../../lib/supabase';
import { KdsOrder, KdsItem } from '../../types';
import { printerManager } from '../../lib/bluetoothPrinter';
import { buildKdsTicketData } from '../../utils/escpos';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getStatusStyle(status: KdsOrder['status'], sec: number) {
  if (status === 'done')
    return { ring: 'ring-2 ring-emerald-500', header: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-700', label: '✅ Selesai' };
  if (status === 'urgent' || sec > 600)
    return { ring: 'ring-2 ring-red-500',    header: 'bg-red-600',    badge: 'bg-red-100 text-red-700', label: '🔴 URGENT' };
  if (status === 'working' || sec > 300)
    return { ring: 'ring-2 ring-orange-400', header: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', label: '🟠 Proses' };
  return   { ring: 'ring-2 ring-blue-400',   header: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-700',   label: '🟡 Baru' };
}

const TYPE_ICON: Record<string, string> = {
  'Dine In': 'table_restaurant',
  'Takeaway': 'shopping_bag',
  'Grab Delivery': 'delivery_dining',
  'Gojek': 'delivery_dining',
  'ShopeeFood': 'delivery_dining',
};

const kdsStyles = `
  @keyframes steam-rise {
    0% { transform: translateY(2px) scale(0.9); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(-4px) scale(1.1); opacity: 0; }
  }
  .animate-steam-1 { animation: steam-rise 1.2s infinite ease-in-out; }
  .animate-steam-2 { animation: steam-rise 1.2s infinite ease-in-out 0.4s; }
  .animate-steam-3 { animation: steam-rise 1.2s infinite ease-in-out 0.8s; }
`;

export default function KdsBaristaScreen() {
  const { currentUser, logout } = useAuthStore();
  const { kdsOrders, setKdsOrders, tables } = usePosStore();
  const navigate = useNavigate();

  const allBaristaOrders = kdsOrders.filter(o => o.station === 'barista' || o.station === 'all');
  const activeOrders = allBaristaOrders.filter(o => o.status !== 'done');
  const historyOrders = allBaristaOrders.filter(o => o.status === 'done');

  const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');
  const orders = activeTab === 'aktif' ? activeOrders : historyOrders;

  const [clock, setClock] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isPrinterConnected, setPrinterConnected] = useState(!!printerManager.device);
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);

  useEffect(() => {
    const handleDisconnect = () => setPrinterConnected(false);
    window.addEventListener('printer-disconnected', handleDisconnect);
    return () => window.removeEventListener('printer-disconnected', handleDisconnect);
  }, []);

  const handleConnectPrinter = async () => {
    try {
      if (isPrinterConnected) {
        printerManager.disconnect();
        setPrinterConnected(false);
      } else {
        setIsConnectingPrinter(true);
        await new Promise(resolve => setTimeout(resolve, 600));
        const success = await printerManager.connect();
        if (success) {
          setPrinterConnected(true);
        }
      }
    } catch (err) {} finally {
      setIsConnectingPrinter(false);
    }
  };

  // Sound triggers

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
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
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



  const prevActiveCount = useRef(activeOrders.length);
  const prevHistoryCount = useRef(historyOrders.length);
  useEffect(() => {
    if (activeOrders.length > prevActiveCount.current) {
      speak("Ada pesanan baru di bar");
      
      // Auto print barista ticket
      if (isPrinterConnected) {
        const newestOrder = activeOrders[activeOrders.length - 1];
        if (newestOrder) {
          const itemsForPrint = newestOrder.items.map(it => ({
            name: it.name,
            qty: 1,
            notes: it.notes
          }));
          const ticketBytes = buildKdsTicketData(
            newestOrder.id.replace('INV-', ''),
            'Barista',
            itemsForPrint,
            newestOrder.customerName || `Meja ${newestOrder.table || '-'}`,
            false
          );
          printerManager.print(ticketBytes);
        }
      }
    }
    if (historyOrders.length > prevHistoryCount.current) {
      speak("Pesanan minuman selesai");
    }
    prevActiveCount.current = activeOrders.length;
    prevHistoryCount.current = historyOrders.length;
  }, [activeOrders.length, historyOrders.length, speak, isPrinterConnected]);

  // Tick timers every second
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

  const handleAction = useCallback(async (orderId: string, action: 'start' | 'check' | 'done' | 'undo', itemId?: string) => {
    const order = kdsOrders.find(o => o.id === orderId);
    if (!order) return;

    if (action === 'start') {
      const updatedOrder = { ...order, status: 'working' as const };
      setKdsOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      await supabase.from('kds_orders').update({ status: 'working' }).eq('id', orderId);
      speak(`Mulai membuat pesanan ${order.id}`);
    } else if (action === 'check' && itemId) {
      const updatedItems = order.items.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it);
      setKdsOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: updatedItems } : o));
      await supabase.from('kds_orders').update({ items: updatedItems }).eq('id', orderId);
    } else if (action === 'done') {
      const updatedOrder = { ...order, status: 'done' as const };
      setKdsOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      await supabase.from('kds_orders').update({ status: 'done' }).eq('id', orderId);
      speak(`Pesanan ${order.id} selesai`);
    } else if (action === 'undo') {
      const updatedOrder = { ...order, status: 'working' as const };
      setKdsOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      await supabase.from('kds_orders').update({ status: 'working' }).eq('id', orderId);
    }
  }, [kdsOrders, setKdsOrders, speak]);

  const handleLogout = () => { logout(); navigate('/kds'); };

  const pending = activeOrders.filter(o => o.status !== 'urgent').length;
  const urgent  = activeOrders.filter(o => o.status === 'urgent').length;

  return (
    <div className="h-screen bg-[#0f0a07] text-white flex flex-col select-none">
      <style dangerouslySetInnerHTML={{ __html: kdsStyles }} />
      {/* ── Top Bar ── */}
      <header className="bg-[#1a0e0a]/90 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">18</span>
          </div>
          <div>
            <p className="font-black text-amber-400 text-sm leading-none">KDS BARISTA</p>
            <p className="text-white/40 text-[10px]">{currentUser?.name ?? 'Guest'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span className="text-xs font-bold text-white/70">{pending} Antrian</span>
            </div>
            {urgent > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 rounded-xl animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-xs font-bold text-red-400">{urgent} URGENT</span>
              </div>
            )}
          </div>

          {/* Clock */}
          <div className="text-right hidden sm:block">
            <p className="font-mono font-bold text-white text-sm">{clock.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
            <p className="text-white/30 text-[10px]">{clock.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>

          {/* Printer button */}
          <button
            onClick={handleConnectPrinter}
            className={`p-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
              isPrinterConnected 
                ? "bg-green-600/35 border border-green-500 text-green-300" 
                : "bg-white/5 hover:bg-white/10 text-white/50"
            }`}
            title={isPrinterConnected ? "Printer Bluetooth Terhubung" : "Konek Printer Bluetooth"}
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span className="hidden md:inline">{isPrinterConnected ? "Printer Aktif" : "Konek Printer"}</span>
          </button>

          {/* Sound toggle */}
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[18px] text-white/50">{soundEnabled ? 'volume_up' : 'volume_off'}</span>
          </button>



          {/* Logout */}
          <button onClick={handleLogout} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" title="Ganti Pengguna">
            <span className="material-symbols-outlined text-[18px] text-white/50">logout</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#0a0e1a]/80 border-b border-blue-900/30 px-6 py-2 flex items-center gap-4 shrink-0">
        <button onClick={() => setActiveTab('aktif')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'aktif' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
          Order Aktif ({activeOrders.length})
        </button>
        <button onClick={() => setActiveTab('riwayat')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'riwayat' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
          Riwayat Hari Ini ({historyOrders.length})
        </button>
      </div>

      {/* ── Main Order Grid ── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-32 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-white/20">local_cafe</span>
            </div>
            <p className="text-white/30 font-bold text-lg">Tidak ada antrian saat ini</p>
            <p className="text-white/20 text-sm mt-2">Pesanan baru akan muncul secara otomatis</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.sort((a, b) => b.timeInSeconds - a.timeInSeconds).map(order => {
              const st = getStatusStyle(order.status, order.timeInSeconds);
              const allChecked = order.items.every(i => i.checked);

              const displayTable = (() => {
                const rawTable = order.table;
                if (rawTable && rawTable.startsWith('table-')) {
                  const foundTab = tables.find(t => t.id === rawTable);
                  return foundTab ? foundTab.name : rawTable;
                }
                return rawTable || order.type;
              })();

              return (
                <div key={order.id} className={`bg-[#1c1108] border border-white/10 rounded-2xl overflow-hidden flex flex-col ${st.ring} transition-all duration-300`}>
                  {/* Card Header */}
                  <div className={`${st.header} px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-white text-[18px]">{TYPE_ICON[order.type] ?? 'receipt'}</span>
                      <div>
                        <p className="font-black text-white text-lg leading-none">
                          {displayTable}
                        </p>
                        {order.customerName && <p className="text-white/90 font-bold text-base mt-1">{order.customerName}</p>}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {order.status === 'working' && (
                        <span className="relative flex items-center justify-center w-6 h-6 shrink-0 bg-white/10 rounded-lg">
                          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path className="animate-steam-1" d="M7 6c0-1.5 1-1.5 1-3" />
                            <path className="animate-steam-2" d="M12 6c0-1.5 1-1.5 1-3" />
                            <path className="animate-steam-3" d="M17 6c0-1.5 1-1.5 1-3" />
                            <path d="M5 9h14v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z" />
                            <path d="M19 11h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2" />
                          </svg>
                        </span>
                      )}
                      <div>
                        <p className="font-mono font-black text-white text-lg leading-none">{formatTime(order.timeInSeconds)}</p>
                        <p className="text-white/60 text-[10px]">#{order.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex-1 p-4 space-y-2">
                    {order.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleAction(order.id, 'check', item.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${item.checked ? 'bg-emerald-900/30 opacity-60' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'}`}>
                          {item.checked && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                        </div>
                        <div>
                          <p className={`font-bold text-sm leading-snug ${item.checked ? 'line-through text-white/40' : 'text-white'}`}>{item.name}</p>
                          {item.notes && (
                            <p className="text-amber-300 text-xs mt-1 font-bold">⚡ {item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
                  {activeTab === 'riwayat' ? (
                    <button 
                      onClick={() => handleAction(order.id, 'undo')}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">undo</span>
                      Kembalikan Order
                    </button>
                  ) : (
                    <>
                      {order.status === 'incoming' && (
                        <button 
                          onClick={() => handleAction(order.id, 'start')}
                          className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                          Mulai
                        </button>
                      )}
                      
                      {(order.status === 'working' || order.status === 'urgent') && (
                        <button 
                          onClick={() => handleAction(order.id, 'done')}
                          disabled={!allChecked}
                          className={`flex-1 py-3 font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2 ${
                            allChecked 
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                          Selesai
                        </button>
                      )}
                    </>
                  )}
                </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Bottom Status Bar ── */}
      <div className="bg-[#1a0e0a]/90 border-t border-white/10 px-6 py-2 flex items-center justify-between shrink-0">
        <p className="text-white/30 text-xs">Centang semua item sebelum menekan Selesai</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <p className="text-emerald-400 text-xs font-bold">Live</p>
        </div>
      </div>

      {/* Custom Bluetooth Connecting Modal Guide */}
      {isConnectingPrinter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center text-slate-800">
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-800/10 animate-ping duration-1000"></div>
              <div className="absolute inset-2 rounded-full border-4 border-amber-800/20 animate-ping duration-1000 delay-300"></div>
              <div className="w-14 h-14 bg-amber-800/10 text-amber-800 rounded-2xl flex items-center justify-center shadow-inner relative z-10">
                <span className="material-symbols-outlined text-3xl animate-pulse">print_connect</span>
              </div>
            </div>
            <h3 className="font-black text-base">Menghubungkan Printer</h3>
            <p className="text-slate-500 text-[10px] mt-2 px-2 leading-relaxed">
              Sedang memindai perangkat Bluetooth...
            </p>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-[10px] text-amber-800 font-bold leading-relaxed text-left flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-amber-700 shrink-0">info</span>
              <span>Silakan pilih nama printer Bluetooth Anda (contoh: <strong>RPP02</strong>) pada jendela browser yang muncul di atas layar untuk menyelesaikan sambungan.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
