import React, { useState, createContext, useContext } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Order } from "../types";

interface POSContextType {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export function usePOSContext() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error("usePOSContext must be used within a POSLayout");
  }
  return context;
}

export default function POSLayout({ posOrders = [] }: { posOrders?: Order[] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShiftAlert, setShowShiftAlert] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthStore();

  const unpaidCount = posOrders.filter(o => o.status === "Unpaid").length;
  const onlineCount = posOrders.filter(o => o.type === "Online" && o.status !== "Selesai" && o.status !== "Batal").length;

  React.useEffect(() => {
    // Jika tidak ada user login dan bukan di halaman keluar, arahkan ke halaman keluar
    if (!currentUser && location.pathname !== '/pos/keluar') {
      navigate('/pos/keluar', { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  const tabs = [
    { id: "/pos", name: "Penjualan", icon: "shopping_bag" },
    { id: "/pos/pesanan", name: "Pesanan", icon: "receipt_long" },
    { id: "/pos/online", name: "Pemesanan Online", icon: "phone_iphone" },
    { id: "/pos/item", name: "Item", icon: "inventory_2" },
    { id: "/pos/promo", name: "Promo & Kupon", icon: "local_offer" },
    { id: "/pos/biaya", name: "Biaya Tambahan", icon: "payments" },
    { id: "/pos/meja", name: "Pengaturan Meja", icon: "table_restaurant" },
  ];

  const bottomTabs = [
    { id: "/pos/pengaturan", name: "Pengaturan", icon: "settings" },
    ...(currentUser?.permissions?.admin ? [{ id: "/admin", name: "Backoffice", icon: "admin_panel_settings" }] : []),
    { id: "/pos/keluar", name: "Keluar", icon: "logout" },
  ];

  return (
    <POSContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="flex h-screen w-screen bg-slate-100 font-sans text-on-surface antialiased overflow-hidden">
        
        {/* Permanent Sidebar (Brown Theme) */}
        <aside
          className={`flex flex-col bg-[#4d3227] text-white transition-all duration-300 ease-in-out border-r border-[#3a251d] shadow-xl z-20 ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
        >
          {/* Header / Logo */}
          <div className="flex items-center justify-center h-20 shrink-0 border-b border-[#5c3e31]">
            <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center transition-all ${sidebarOpen ? 'w-full mx-6 justify-start px-3 bg-transparent' : ''}`}>
               <span className="material-symbols-outlined text-white text-2xl">local_cafe</span>
               {sidebarOpen && (
                 <span className="ml-3 font-bold text-lg tracking-tight">Lapanbelas</span>
               )}
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-4 flex flex-col gap-2 px-3">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.id)}
                  title={tab.name}
                  className={`relative flex items-center rounded-xl transition-all h-12 shrink-0 ${
                    sidebarOpen ? "px-4 justify-start" : "justify-center"
                  } ${
                    isActive
                      ? "bg-white text-[#4d3227] shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[24px] ${isActive ? "text-[#4d3227]" : ""}`}>
                    {tab.icon}
                  </span>
                  {sidebarOpen && (
                    <span className={`ml-4 font-semibold text-sm whitespace-nowrap flex-1 text-left ${isActive ? "text-[#4d3227]" : "text-white/90"}`}>
                      {tab.name}
                    </span>
                  )}
                  {tab.id === "/pos/pesanan" && unpaidCount > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-[#4d3227] text-white' : 'bg-red-500 text-white'} ${sidebarOpen ? 'ml-2' : 'absolute top-1 right-1'}`}>
                      {unpaidCount}
                    </span>
                  )}
                  {tab.id === "/pos/online" && onlineCount > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-[#4d3227] text-white' : 'bg-red-500 text-white'} ${sidebarOpen ? 'ml-2' : 'absolute top-1 right-1'}`}>
                      {onlineCount}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="h-px w-full bg-[#5c3e31] my-2 shrink-0"></div>

            {/* Customer Display Button */}
            <button
              onClick={() => window.open(`${window.location.origin}/display`, "_blank", "noopener")}
              title="Buka Layar Pelanggan"
              className={`relative flex items-center rounded-xl transition-all h-12 shrink-0 text-amber-300 hover:bg-amber-400/10 hover:text-amber-200 ${
                sidebarOpen ? "px-4 justify-start" : "justify-center"
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">tv</span>
              {sidebarOpen && (
                <span className="ml-4 font-semibold text-sm whitespace-nowrap flex-1 text-left">
                  Layar Pelanggan
                </span>
              )}
              {sidebarOpen && (
                <span className="text-[10px] bg-amber-400/20 border border-amber-400/40 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              )}
            </button>

            {bottomTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "/pos/keluar") {
                    const savedShift = localStorage.getItem("current_shift");
                    if (savedShift) {
                      try {
                        const shiftData = JSON.parse(savedShift);
                        if (shiftData.isOpen) {
                          setShowShiftAlert(true);
                          return;
                        }
                      } catch (e) {}
                    }
                  }
                  navigate(tab.id);
                }}
                title={tab.name}
                className={`flex items-center rounded-xl transition-all h-12 shrink-0 ${
                  sidebarOpen ? "px-4 justify-start" : "justify-center"
                } text-white/70 hover:bg-white/10 hover:text-white`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {tab.icon}
                </span>
                {sidebarOpen && (
                  <span className="ml-4 font-medium text-sm whitespace-nowrap text-white/90">
                    {tab.name}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bottom Expand Toggle */}
          <div className="h-16 shrink-0 border-t border-[#5c3e31] flex items-center justify-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">
                {sidebarOpen ? "keyboard_double_arrow_left" : "keyboard_double_arrow_right"}
              </span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden relative">
          <Outlet />
        </main>
      </div>

      {/* Custom Alert Modal for Shift */}
      {showShiftAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 text-center animate-slide-up">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-red-500">lock</span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Akses Ditolak</h3>
            <p className="text-slate-500 font-medium mb-8 text-sm">
              Anda wajib <b>menutup shift</b> terlebih dahulu sebelum dapat melakukan proses logout.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowShiftAlert(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowShiftAlert(false);
                  navigate("/pos/shift");
                }}
                className="flex-1 py-3.5 bg-[#4d3227] text-white rounded-xl font-bold hover:bg-[#3a251d] transition-colors shadow-lg shadow-[#4d3227]/30"
              >
                Ke Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </POSContext.Provider>
  );
}
