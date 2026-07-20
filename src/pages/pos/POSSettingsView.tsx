import React, { useState, useEffect, useCallback } from "react";
import { usePOSContext } from "../../layouts/POSLayout";
import { usePosStore, KdsRouteType } from "../../store/posStore";
import {
  scanAndConnect,
  disconnectPrinter,
  isConnected,
  getConnectedPrinter,
  testPrint,
  reconnectPrinter,
  type PrinterDevice,
} from "../../utils/bluetoothPrinter";
import { Product } from "../../types";

interface POSSettingsViewProps {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
  products?: Product[];
}

type PrinterMode = "Kasir" | "Dapur" | "Barista";
type ConnectionStatus = "disconnected" | "scanning" | "connecting" | "connected" | "error";

export default function POSSettingsView({ onNotify, products = [] }: POSSettingsViewProps) {
  const { sidebarOpen, setSidebarOpen } = usePOSContext();
  const { kdsRouting, setKdsRouting, setPrinterConnected } = usePosStore();
  const [activeTab, setActiveTab] = useState("Printer & Struk");
  const [printerMode, setPrinterMode] = useState<PrinterMode>("Kasir");

  // --- Bluetooth State ---
  const [connectionStates, setConnectionStates] = useState<Record<string, { status: ConnectionStatus, error: string | null }>>({
    Kasir: { status: "disconnected", error: null },
    Dapur: { status: "disconnected", error: null },
    Barista: { status: "disconnected", error: null },
  });

  const [isPrinting, setIsPrinting] = useState(false);
  const [btSupported, setBtSupported] = useState(true);

  // --- Template Settings ---
  const [tplKasir, setTplKasir] = useState(() => {
    const saved = localStorage.getItem("pos_receipt_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      showLogo: true,
      showWifi: true,
      showCustomerName: true,
      footerText: "Terima kasih atas kunjungan Anda!\nFollow IG: @pos18.coffee",
    };
  });
  const [tplDapur, setTplDapur] = useState({ autoPrint: true, largeNotes: true });
  const [tplBarista, setTplBarista] = useState({ stickerMode: false, separateItems: true });

  const updateTplKasir = (updates: any) => {
    const next = { ...tplKasir, ...updates };
    setTplKasir(next);
    localStorage.setItem("pos_receipt_settings", JSON.stringify(next));
  };

  const [storeProfile, setStoreProfile] = useState(() => {
    const saved = localStorage.getItem("pos_store_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      namaToko: "LB Coffee",
      nomorTelepon: "083833376959",
      alamatLengkap: "Aceh Tamiang",
    };
  });


  useEffect(() => {
    if (!navigator.bluetooth) setBtSupported(false);
 
    const tryReconnect = async () => {
      const roles = ["Kasir", "Dapur", "Barista"];
      let reconnectedRoles: string[] = [];
      for (const role of roles) {
        if (!isConnected(role)) {
          try {
            const device = await reconnectPrinter(role);
            if (device) {
              setPrinterConnected(role.toLowerCase() as any, true);
              reconnectedRoles.push(role);
            }
          } catch (e) {
            console.warn(`[tryReconnect] Failed for ${role}:`, e);
          }
        }
      }
      
      setConnectionStates(prev => {
        const next = { ...prev };
        roles.forEach(role => {
          if (isConnected(role)) {
            next[role] = { status: "connected", error: null };
          }
        });
        return next;
      });

      return reconnectedRoles.length > 0;
    };
 
    // Coba langsung saat mount
    tryReconnect().then(success => {
      if (!success) {
        // Jika gagal (kemungkinan butuh interaksi pengguna), coba lagi saat klik pertama
        const handleFirstInteraction = async () => {
          window.removeEventListener("click", handleFirstInteraction);
          window.removeEventListener("pointerdown", handleFirstInteraction);
          console.log("[BT] User interacted. Retrying auto-reconnect...");
          await tryReconnect();
        };
        window.addEventListener("click", handleFirstInteraction);
        window.addEventListener("pointerdown", handleFirstInteraction);
      }
    });
  }, [setPrinterConnected]);

  const handleConnect = useCallback(async (role: string) => {
    setConnectionStates(prev => ({ ...prev, [role]: { status: "scanning", error: null } }));
    try {
      const dev = await scanAndConnect(role);
      setConnectionStates(prev => ({ ...prev, [role]: { status: "connected", error: null } }));
      setPrinterConnected(role.toLowerCase() as any, true);
      onNotify(`✅ Printer "${dev.name}" berhasil terhubung sebagai ${role}!`, "success");
    } catch (err: any) {
      if (err?.message?.includes("cancelled") || err?.code === 0 || err?.name === "NotFoundError") {
        setConnectionStates(prev => ({ ...prev, [role]: { status: "disconnected", error: null } }));
      } else {
        setConnectionStates(prev => ({ ...prev, [role]: { status: "error", error: err?.message ?? "Koneksi gagal" } }));
        onNotify(`Gagal: ${err?.message}`, "warning");
      }
    }
  }, [onNotify, setPrinterConnected]);

  const handleDisconnect = useCallback((role: string) => {
    disconnectPrinter(role);
    setConnectionStates(prev => ({ ...prev, [role]: { status: "disconnected", error: null } }));
    setPrinterConnected(role.toLowerCase() as any, false);
    onNotify(`Printer ${role} diputus`, "info");
  }, [onNotify, setPrinterConnected]);

  const handleTestPrint = useCallback(async (role: string) => {
    setIsPrinting(true);
    try {
      await testPrint(role);
      onNotify("✅ Test print berhasil!", "success");
    } catch (err: any) {
      onNotify(`Gagal cetak: ${err?.message}`, "warning");
    } finally {
      setIsPrinting(false);
    }
  }, [onNotify]);

  const handleSave = (section: string) => {
    if (section === "Profil Toko") {
      localStorage.setItem("pos_store_profile", JSON.stringify(storeProfile));
    }
    onNotify(`Pengaturan ${section} berhasil disimpan!`, "success");
  };

  const renderToggle = (label: string, desc: string, checked: boolean, onChange: (val: boolean) => void) => (
    <div
      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="font-bold text-slate-700 text-sm">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? "bg-[#4d3227]" : "bg-slate-300"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}></span>
      </div>
    </div>
  );

  const statusConfig: Record<ConnectionStatus, { color: string; icon: string; label: string; pulse?: boolean }> = {
    disconnected: { color: "text-slate-400 bg-slate-100 border-slate-200",     icon: "bluetooth_disabled", label: "Tidak Terhubung" },
    scanning:     { color: "text-blue-600  bg-blue-50   border-blue-200",      icon: "bluetooth_searching", label: "Mencari Printer...", pulse: true },
    connecting:   { color: "text-orange-600 bg-orange-50 border-orange-200",   icon: "bluetooth_searching", label: "Menghubungkan...", pulse: true },
    connected:    { color: "text-emerald-600 bg-emerald-50 border-emerald-200",icon: "bluetooth_connected", label: "Terhubung" },
    error:        { color: "text-red-600   bg-red-50    border-red-200",        icon: "error",              label: "Koneksi Gagal" },
  };
  
  const currentConnState = connectionStates[printerMode];
  const btStatus = currentConnState?.status || "disconnected";
  const btError = currentConnState?.error;
  const currentPrinterDev = getConnectedPrinter(printerMode);
  
  const st = statusConfig[btStatus];

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-[#4d3227] text-white flex items-center px-6 py-4 shadow-md z-10 shrink-0 gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="font-bold text-xl">Pengaturan Sistem</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col p-4 gap-2 overflow-y-auto">
          {[
            { id: "Profil Toko",    icon: "storefront",         desc: "Informasi dasar bisnis" },
            { id: "Printer & Struk",icon: "print",              desc: "Bluetooth & Template" },
            { id: "Routing KDS",    icon: "alt_route",          desc: "Alur order Barista/Dapur" },
            { id: "Integrasi",      icon: "api",                desc: "GoFood, GrabFood, dll" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col text-left p-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-blue-50 border border-blue-200 text-[#4d3227]"
                  : "bg-transparent border border-transparent text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? "text-[#4d3227]" : "text-slate-400"}`}>
                  {tab.icon}
                </span>
                <span className="font-bold text-sm">{tab.id}</span>
              </div>
              <span className="text-[11px] text-slate-500 pl-7">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* ── Printer & Struk ───────────────────────────────────────── */}
            {activeTab === "Printer & Struk" && (
              <div className="space-y-6">

                {/* ── Bluetooth Connection Card ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#4d3227]">bluetooth</span>
                    <div>
                      <h2 className="font-bold text-base text-slate-800">Koneksi Printer {printerMode}</h2>
                      <p className="text-xs text-slate-500">Web Bluetooth API · Kompatibel ESC/POS (Chrome/Edge)</p>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Browser support warning */}
                    {!btSupported && (
                      <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5">warning</span>
                        <div>
                          <p className="font-bold text-amber-800 text-sm">Browser Tidak Mendukung Web Bluetooth</p>
                          <p className="text-xs text-amber-700 mt-1">Gunakan Google Chrome atau Microsoft Edge versi terbaru untuk menggunakan fitur ini. Firefox tidak mendukung Web Bluetooth API.</p>
                        </div>
                      </div>
                    )}

                    {/* Status indicator */}
                    <div className={`flex items-center gap-4 p-4 rounded-xl border ${st.color} mb-6`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${st.color} border shrink-0`}>
                        <span className={`material-symbols-outlined text-[22px] ${st.pulse ? "animate-pulse" : ""}`}>{st.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{st.label}</p>
                        {btStatus === "connected" && currentPrinterDev && (
                          <p className="text-xs mt-0.5">{currentPrinterDev.name}</p>
                        )}
                        {btStatus === "error" && btError && (
                          <p className="text-xs mt-0.5 text-red-500">{btError}</p>
                        )}
                        {btStatus === "scanning" && (
                          <p className="text-xs mt-0.5">Pilih printer Anda dari dialog browser...</p>
                        )}
                      </div>
                      {/* Action buttons */}
                      {btStatus === "connected" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTestPrint(printerMode)}
                            disabled={isPrinting}
                            className="text-xs font-bold px-3 py-1.5 bg-white text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {isPrinting ? (
                              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-[14px]">print</span>
                            )}
                            Test Print
                          </button>
                          <button
                            onClick={() => handleDisconnect(printerMode)}
                            className="text-xs font-bold px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Putuskan
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnect(printerMode)}
                          disabled={!btSupported || btStatus === "scanning"}
                          className="text-xs font-bold px-4 py-2 bg-[#4d3227] text-white rounded-lg hover:bg-[#3a251d] transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">bluetooth_searching</span>
                          {btStatus === "scanning" ? "Mencari..." : "Scan & Hubungkan"}
                        </button>
                      )}
                    </div>

                    {/* How to tips */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Cara Menghubungkan Printer Bluetooth:
                      </p>
                      <ol className="text-xs text-blue-600 space-y-1 list-decimal pl-4">
                        <li>Nyalakan printer thermal Bluetooth Anda</li>
                        <li>Pastikan Bluetooth perangkat ini aktif</li>
                        <li>Klik tombol <strong>"Scan & Hubungkan"</strong> di atas</li>
                        <li>Pilih nama printer dari daftar yang muncul di browser</li>
                        <li>Tunggu konfirmasi koneksi, lalu klik <strong>"Test Print"</strong></li>
                      </ol>
                      <p className="text-[10px] text-blue-500 mt-2">*Kompatibel: GOOJPRT, Xprinter, RPP, dan semua printer ESC/POS BT</p>
                    </div>
                  </div>
                </div>

                {/* ── Template Printer (kiri) + Preview (kanan) ── */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  
                  {/* Settings Panel */}
                  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                      <h2 className="font-bold text-base text-slate-800">Desain Template Struk</h2>
                      <p className="text-xs text-slate-500">Perubahan tampil di preview secara langsung (real-time).</p>
                    </div>

                    {/* Mode tabs */}
                    <div className="flex border-b border-slate-200">
                      {(["Kasir", "Dapur", "Barista"] as PrinterMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPrinterMode(mode)}
                          className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${
                            printerMode === mode
                              ? "border-[#4d3227] text-[#4d3227] bg-orange-50/50"
                              : "border-transparent text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Kasir Settings */}
                      {printerMode === "Kasir" && (
                        <>
                          {renderToggle("Cetak Logo Toko", "Tampilkan logo hitam-putih teks di atas struk", tplKasir.showLogo, (v) => updateTplKasir({ showLogo: v }))}
                          {renderToggle("Tampilkan Nama Pemesan", "Cetak nama pelanggan jika dimasukkan saat checkout", tplKasir.showCustomerName, (v) => updateTplKasir({ showCustomerName: v }))}
                          {renderToggle("QR Code WiFi di Footer", "Tambahkan QR WiFi pelanggan di bawah struk", tplKasir.showWifi, (v) => updateTplKasir({ showWifi: v }))}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Pesan Footer</label>
                            <textarea
                              rows={3}
                              value={tplKasir.footerText}
                              onChange={(e) => updateTplKasir({ footerText: e.target.value })}
                              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227] outline-none text-sm"
                            />
                          </div>
                        </>
                      )}

                      {/* Dapur Settings */}
                      {printerMode === "Dapur" && (
                        <>
                          {renderToggle("Cetak Otomatis (Auto-print)", "Langsung cetak tiket saat pesanan terkonfirmasi", tplDapur.autoPrint, (v) => setTplDapur({ ...tplDapur, autoPrint: v }))}
                          {renderToggle("Perbesar Teks Catatan", "Cetak notes pelanggan lebih besar & tebal agar mudah dibaca dapur", tplDapur.largeNotes, (v) => setTplDapur({ ...tplDapur, largeNotes: v }))}
                        </>
                      )}

                      {/* Barista Settings */}
                      {printerMode === "Barista" && (
                        <>
                          {renderToggle("Mode Stiker Cup (50mm)", "Ubah format ke kotak kecil cocok untuk printer stiker cup", tplBarista.stickerMode, (v) => setTplBarista({ ...tplBarista, stickerMode: v }))}
                          {renderToggle("Pisahkan Tiket Per Item", "Setiap item minuman mendapat tiket/stiker tersendiri", tplBarista.separateItems, (v) => setTplBarista({ ...tplBarista, separateItems: v }))}
                        </>
                      )}

                      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                        {btStatus === "connected" && (
                          <button
                            onClick={() => handleTestPrint(printerMode)}
                            disabled={isPrinting}
                            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 border border-[#4d3227] text-[#4d3227] rounded-xl hover:bg-orange-50 transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                            Test Print
                          </button>
                        )}
                        <button
                          onClick={() => handleSave(`Template ${printerMode}`)}
                          className="bg-[#4d3227] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#3a251d] transition-colors"
                        >
                          Simpan Template {printerMode}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="w-full lg:w-[300px] shrink-0 bg-slate-200 rounded-2xl p-6 flex flex-col items-center justify-start border border-slate-300 shadow-inner min-h-[500px]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">⬤ Live Preview</p>

                    {/* Paper */}
                    <div
                      className={`bg-white shadow-lg text-slate-800 font-mono text-[9px] leading-snug overflow-hidden relative transition-all duration-300 ${
                        tplBarista.stickerMode && printerMode === "Barista"
                          ? "w-44 h-44 rounded-lg p-3 flex flex-col justify-center border-2 border-dashed border-slate-300"
                          : "w-56 rounded-sm"
                      }`}
                    >
                      {!(tplBarista.stickerMode && printerMode === "Barista") && (
                        <div className="w-full bg-white py-1" style={{ backgroundImage: "radial-gradient(circle at 50% 0,transparent 3px,white 4px)", backgroundSize: "8px 6px", backgroundRepeat: "repeat-x" }}></div>
                      )}
                      <div className="px-3 py-2">
                        {/* Kasir Preview */}
                        {printerMode === "Kasir" && (
                          <div className="text-center space-y-0.5">
                            {tplKasir.showLogo && (
                              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black text-base mx-auto mb-2">18</div>
                            )}
                            <p className="font-bold text-[11px] uppercase">{storeProfile.namaToko}</p>
                            <p className="text-slate-500 text-[8px]">{storeProfile.alamatLengkap.substring(0, 30)}{storeProfile.alamatLengkap.length > 30 ? '...' : ''}</p>
                            <p className="text-slate-500 text-[8px]">{storeProfile.nomorTelepon}</p>
                            <div className="border-b border-dashed border-slate-400 my-2"></div>
                            <p className="text-left text-[8px]">Kasir : Budi</p>
                            <p className="text-left text-[8px]">Tgl   : 10 Jul 26 14:30</p>
                            <div className="border-b border-dashed border-slate-400 my-2"></div>
                            <div className="text-left space-y-1">
                              <div>
                                <p className="font-bold">1x Kopi Susu Aren</p>
                                <p className="text-slate-500 pl-1">25.000</p>
                              </div>
                              <div>
                                <p className="font-bold">2x Espresso</p>
                                <p className="text-slate-500 pl-1">30.000</p>
                              </div>
                            </div>
                            <div className="border-b border-dashed border-slate-400 my-2"></div>
                            <div className="text-left flex justify-between font-bold">
                              <span>TOTAL</span><span>55.000</span>
                            </div>
                            <div className="text-left flex justify-between">
                              <span>Bayar</span><span>100.000</span>
                            </div>
                            <div className="text-left flex justify-between font-bold">
                              <span>Kembali</span><span>45.000</span>
                            </div>
                            {tplKasir.showWifi && (
                              <>
                                <div className="border-b border-dashed border-slate-400 my-2"></div>
                                <div className="flex flex-col items-center">
                                  <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                                  <p className="text-[7px]">Scan for WiFi • Pass: Kopi18</p>
                                </div>
                              </>
                            )}
                            <div className="border-b border-dashed border-slate-400 my-2"></div>
                            <p className="text-[8px] whitespace-pre-wrap text-center">{tplKasir.footerText}</p>
                          </div>
                        )}

                        {/* Dapur Preview */}
                        {printerMode === "Dapur" && (
                          <div className="text-left space-y-1">
                            <p className="text-center font-bold text-[11px]">-- TIKET DAPUR --</p>
                            <p className="text-center font-black text-[14px]">MEJA 04</p>
                            <p>Order : #8241</p>
                            <p>Waktu : 14:30</p>
                            <div className="border-b-2 border-black my-2"></div>
                            <div>
                              <p className="font-bold">2x Nasi Goreng Spesial</p>
                              <p className={`pl-2 mt-0.5 ${tplDapur.largeNotes ? "font-bold uppercase text-[10px] border-l-2 border-black pl-2" : "text-slate-500 text-[8px]"}`}>
                                {tplDapur.largeNotes ? "** TANPA SAYUR, PEDAS **" : "- tanpa sayur, pedas"}
                              </p>
                            </div>
                            <div className="mt-2">
                              <p className="font-bold">1x Kentang Goreng</p>
                            </div>
                          </div>
                        )}

                        {/* Barista Preview */}
                        {printerMode === "Barista" && (
                          <>
                            {tplBarista.stickerMode ? (
                              <div className="text-left space-y-1 h-full flex flex-col justify-between">
                                <div>
                                  <div className="flex justify-between border-b-2 border-black pb-1 mb-2">
                                    <span className="font-bold text-[10px]">MEJA 08</span>
                                    <span className="font-bold">#1/3</span>
                                  </div>
                                  <p className="font-black text-[13px] leading-tight">Kopi Susu Aren</p>
                                  <p className="text-[9px]">Ukuran : L  | Cold</p>
                                  <p className="text-[9px]">Gula   : Less Sugar</p>
                                  <p className="font-bold text-[9px]">*Extra Shot*</p>
                                </div>
                                <p className="text-[7px] text-slate-500">10/07 14:30</p>
                              </div>
                            ) : (
                              <div className="text-left space-y-1">
                                <p className="text-center font-bold text-[10px]">-- TIKET BARISTA --</p>
                                <p className="text-center font-black text-[13px]">MEJA 08</p>
                                <p className="text-center text-[8px]">Order #8241 · 1/3</p>
                                <div className="border-b-2 border-black my-2"></div>
                                <p className="font-bold text-[11px]">Kopi Susu Aren</p>
                                <p className="text-[8px]">Ukuran : L</p>
                                <p className="text-[8px]">Mode   : Cold</p>
                                <p className="text-[8px]">Gula   : Less Sugar</p>
                                <div className="border-b border-dashed border-slate-400 my-1"></div>
                                <p className="font-bold text-[8px]">CATATAN: Extra Shot</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {!(tplBarista.stickerMode && printerMode === "Barista") && (
                        <div className="w-full bg-white py-1 rotate-180" style={{ backgroundImage: "radial-gradient(circle at 50% 0,transparent 3px,white 4px)", backgroundSize: "8px 6px", backgroundRepeat: "repeat-x" }}></div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Profil Toko */}
            {activeTab === "Profil Toko" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="font-bold text-lg text-slate-800">Profil Toko</h2>
                  <p className="text-sm text-slate-500">Informasi ini ditampilkan di semua struk pelanggan.</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nama Toko</label>
                      <input type="text" value={storeProfile.namaToko} onChange={(e) => setStoreProfile({...storeProfile, namaToko: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227] outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nomor Telepon</label>
                      <input type="text" value={storeProfile.nomorTelepon} onChange={(e) => setStoreProfile({...storeProfile, nomorTelepon: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227] outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Alamat Lengkap</label>
                      <textarea rows={3} value={storeProfile.alamatLengkap} onChange={(e) => setStoreProfile({...storeProfile, alamatLengkap: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:border-[#4d3227] focus:ring-1 focus:ring-[#4d3227] outline-none"></textarea>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button onClick={() => handleSave("Profil Toko")} className="bg-[#4d3227] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#3a251d] transition-colors">
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Routing KDS ── */}
            {activeTab === "Routing KDS" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="font-bold text-lg text-slate-800">Alur Pesanan KDS (Routing)</h2>
                  <p className="text-sm text-slate-500">Tentukan setiap kategori menu akan dikirim ke layar mana saat pelanggan memesan.</p>
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#fafafa] border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-xs">Kategori Menu</th>
                        <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-xs text-center">Layar Tujuan KDS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const standardCats = ["COFFEE", "NON-COFFEE", "COFFEE MILK", "MILK", "TEA", "SIGNATURE", "FOOD", "SNACK", "MINERAL"];
                        const liveCats = products.map(p => p.category.toUpperCase().trim());
                        const allCats = Array.from(new Set([...standardCats, ...liveCats]));

                        const getRoute = (cat: string) => {
                          if (kdsRouting && kdsRouting[cat]) return kdsRouting[cat];
                          const c = cat.toLowerCase();
                          if (c.includes('food') || c.includes('snack') || c.includes('makanan')) return 'kitchen';
                          return 'barista'; // default
                        };

                        const updateRoute = (cat: string, route: KdsRouteType) => {
                          setKdsRouting(prev => {
                            const next = { ...prev, [cat]: route };
                            localStorage.setItem('pos_kds_routing', JSON.stringify(next));
                            return next;
                          });
                        };

                        return allCats.map((category, idx) => (
                          <tr key={category} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <td className="px-6 py-4 font-bold text-slate-800 text-base">{category}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex bg-slate-100 p-1 rounded-xl">
                                <button
                                  onClick={() => updateRoute(category, 'barista')}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                    getRoute(category) === 'barista' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[16px]">coffee_maker</span>
                                  Barista
                                </button>
                                <button
                                  onClick={() => updateRoute(category, 'kitchen')}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                    getRoute(category) === 'kitchen' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
                                  Dapur
                                </button>
                                <button
                                  onClick={() => updateRoute(category, 'none')}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                    getRoute(category) === 'none' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[16px]">block</span>
                                  Abaikan
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                  
                  <div className="p-6 bg-blue-50 border-t border-blue-100 flex items-start gap-3">
                     <span className="material-symbols-outlined text-blue-500 shrink-0">info</span>
                     <p className="text-xs text-blue-700 font-medium">Perubahan yang dilakukan di sini akan langsung berlaku untuk semua transaksi berikutnya secara real-time. Pesanan yang "Abaikan" (None) tidak akan muncul di layar Barista maupun Dapur, melainkan hanya di struk pelanggan dan Monitor Kasir saja.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder tabs */}
            {activeTab === "Integrasi" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">api</span>
                <h2 className="font-bold text-xl text-slate-700 mb-2">Fitur {activeTab}</h2>
                <p className="text-slate-500 text-sm max-w-sm">Pengaturan untuk modul ini sedang dalam tahap pengembangan.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
