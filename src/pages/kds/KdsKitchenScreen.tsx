import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePosStore } from '../../store/posStore';
import { supabase } from '../../lib/supabase';
import { KdsOrder } from '../../types';
import { getConnectedPrinter, scanAndConnect, printReceipt, buildDapurTicket } from '../../utils/bluetoothPrinter';

const kdsStyles = `
  @keyframes fry-toss {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-4px) rotate(5deg); }
  }
  .animate-fry-bounce-1 { animation: fry-toss 1s infinite ease-in-out; }
  .animate-fry-bounce-2 { animation: fry-toss 1s infinite ease-in-out 0.3s; }
  .animate-fry-bounce-3 { animation: fry-toss 1s infinite ease-in-out 0.6s; }
`;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function KdsKitchenScreen() {
  const { currentUser, logout } = useAuthStore();
  const { kdsOrders, setKdsOrders, tables } = usePosStore();
  const navigate = useNavigate();
  
  const allKitchenOrders = kdsOrders.filter(o => o.station === 'kitchen' || o.station === 'all');
  const activeOrders = allKitchenOrders.filter(o => o.status !== 'done');
  const historyOrders = allKitchenOrders.filter(o => o.status === 'done');

  const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');
  const orders = activeTab === 'aktif' ? activeOrders : historyOrders;
  
  const [clock, setClock] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isPrinterConnected, setPrinterConnectedState] = useState(!!getConnectedPrinter("Dapur"));
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);

  useEffect(() => {
    const handleDisconnect = () => setPrinterConnected(false);
    window.addEventListener('printer-disconnected', handleDisconnect);
    return () => window.removeEventListener('printer-disconnected', handleDisconnect);
  }, []);

  const handleConnectPrinter = async () => {
    try {
      if (isPrinterConnected) {
        setPrinterConnectedState(false);
      } else {
        setIsConnectingPrinter(true);
        await new Promise(resolve => setTimeout(resolve, 600));
        const device = await scanAndConnect("Dapur");
        if (device) {
          setPrinterConnectedState(true);
        }
      }
    } catch (err) {} finally {
      setIsConnectingPrinter(false);
    }
  };

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



  const prevActiveCount = useRef(activeOrders.length);
  const prevHistoryCount = useRef(historyOrders.length);
  useEffect(() => {
    if (activeOrders.length > prevActiveCount.current) {
      speak("Ada pesanan makanan baru");
      
      // Auto print kitchen ticket
      if (isPrinterConnected) {
        const newestOrder = activeOrders[activeOrders.length - 1];
        if (newestOrder) {
          const itemsForPrint = newestOrder.items.map(it => ({
            name: it.name,
            qty: 1,
            notes: it.notes
          }));
          const rawTable = newestOrder.table;
          const tableName = rawTable && rawTable.startsWith('table-') 
            ? (tables.find(t => t.id === rawTable)?.name || rawTable) 
            : rawTable;

          const ticketBytes = buildDapurTicket({
            orderId: newestOrder.id.replace('INV-', ''),
            tableNo: tableName || undefined,
            items: itemsForPrint
          });
          printReceipt(ticketBytes, "Dapur").catch(() => {});
        }
      }
    }
    if (historyOrders.length > prevHistoryCount.current) {
      speak("Pesanan makanan selesai");
    }
    prevActiveCount.current = activeOrders.length;
    prevHistoryCount.current = historyOrders.length;
  }, [activeOrders.length, historyOrders.length, speak, isPrinterConnected]);

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date());
      setKdsOrders(prev => prev.map(o => {
        if (o.status === 'done') return o;
        const nextTime = (o.timeInSeconds || 0) + 1;
        return {
          ...o,
          timeInSeconds: nextTime,
          status: nextTime > 600 ? 'urgent' : nextTime > 300 ? 'working' : o.status,
        };
      }));
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

  const handleStart = useCallback(async (orderId: string) => {
    const order = kdsOrders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder = { ...order, status: 'working' as const };
    setKdsOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    await supabase.from('kds_orders').update({ status: 'working' }).eq('id', orderId);
    speak("Mulai menyiapkan pesanan");
  }, [kdsOrders, setKdsOrders, speak]);

  const handleDone = useCallback(async (orderId: string) => {
    const order = kdsOrders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder = { ...order, status: 'done' as const };
    setKdsOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    await supabase.from('kds_orders').update({ status: 'done', time_in_seconds: order.timeInSeconds }).eq('id', orderId);
    speak("Pesanan makanan selesai");
  }, [kdsOrders, setKdsOrders, speak]);

  const handleUndo = useCallback(async (orderId: string) => {
    const order = kdsOrders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder = { ...order, status: 'working' as const };
    setKdsOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    await supabase.from('kds_orders').update({ status: 'working' }).eq('id', orderId);
  }, [kdsOrders, setKdsOrders]);

  const handleManualPrint = (order: KdsOrder) => {
    if (!isPrinterConnected) {
      alert("Printer Dapur belum terhubung! Silakan klik 'Konek Printer' di pojok kanan atas.");
      return;
    }
    const displayTable = (() => {
      const rawTable = order.table;
      if (rawTable && rawTable.startsWith('table-')) {
        const foundTab = tables.find(t => t.id === rawTable);
        return foundTab ? foundTab.name : rawTable;
      }
      return rawTable || order.type;
    })();

    const dData = buildDapurTicket({
      orderId: order.id.split('-').slice(0, 2).join('-') + " (REPRINT)",
      tableNo: displayTable,
      items: order.items.map(i => ({ name: i.name, qty: 1, notes: i.notes })),
    });
    printReceipt(dData, "Dapur").catch(() => {});
  };

  const urgentOrders = activeOrders.filter(o => o.status === 'urgent');

  return (
    <div className="h-screen bg-[#070f0a] text-white flex flex-col select-none">
      <style dangerouslySetInnerHTML={{ __html: kdsStyles }} />
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
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" title="Audio / Suara">
            <span className="material-symbols-outlined text-[18px] text-white/50">{soundEnabled ? 'volume_up' : 'volume_off'}</span>
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

              const displayTable = (() => {
                const rawTable = order.table;
                if (rawTable && rawTable.startsWith('table-')) {
                  const foundTab = tables.find(t => t.id === rawTable);
                  return foundTab ? foundTab.name : rawTable;
                }
                return rawTable || order.type;
              })();

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
                      <p className="font-black text-white text-2xl leading-none">{displayTable}</p>
                      {order.customerName && <p className="text-white/90 font-bold text-lg mt-1">{order.customerName}</p>}
                      <p className="text-white/60 text-xs mt-1">#{order.id} · {order.type}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleManualPrint(order); }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                        title="Cetak Ulang Checker"
                      >
                        <span className="material-symbols-outlined text-[20px]">print</span>
                      </button>
                      {(order.status === 'working' || order.status === 'urgent') && (
                        <span className="relative flex items-center justify-center w-8 h-8 shrink-0 bg-white/10 rounded-xl">
                          <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle className="animate-fry-bounce-1" cx="6" cy="6" r="1.2" fill="currentColor" stroke="none" />
                            <circle className="animate-fry-bounce-2" cx="12" cy="4" r="1" fill="currentColor" stroke="none" />
                            <circle className="animate-fry-bounce-3" cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" />
                            <path d="M18 13H4c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4z" />
                            <path d="M18 14h4" strokeLinecap="round" />
                          </svg>
                        </span>
                      )}
                      <div>
                        <p className={`font-mono font-black text-3xl ${isUrgent ? 'text-red-200 animate-pulse' : 'text-white'}`}>
                          {formatTime(order.timeInSeconds)}
                        </p>
                        {isUrgent && <p className="text-red-200 text-xs font-bold animate-pulse">⚠️ TERLAMBAT</p>}
                      </div>
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

                  {/* Action Buttons */}
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
                    <>
                      {order.status === 'incoming' && (
                        <button 
                          onClick={() => handleStart(order.id)}
                          className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                          Mulai
                        </button>
                      )}

                      {(order.status === 'working' || order.status === 'urgent') && (
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
                    </>
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
