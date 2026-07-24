import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EmployeePermissions } from "../types";

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthStore();

  // Mapping routes for active state and title
  const getPageTitle = () => {
    if (location.pathname === "/admin") return "Dashboard";
    if (location.pathname.includes("/admin/menu/items")) return "Item List";
    if (location.pathname.includes("/admin/orders")) return "Order";
    if (location.pathname.includes("/admin/queue-display")) return "Queue Number Display";
    return "Admin Area";
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !isGroupOpen(title) }));
  };

  interface NavItem {
    id: string;
    name: string;
    icon: string;
    permKey?: keyof EmployeePermissions;
  }

  interface NavGroup {
    title?: string;
    icon?: string;
    items: NavItem[];
    defaultOpen?: boolean;
  }

  const rawNavGroups: NavGroup[] = [
    {
      items: [
        { id: "/admin", name: "Dashboard", icon: "home" },
      ]
    },
    {
      title: "Menu",
      icon: "restaurant_menu",
      items: [
        { id: "/admin/menu", name: "Items", icon: "" },
        { id: "/admin/recipes", name: "Resep & Gramasi", icon: "", permKey: "admin" },
      ],
      defaultOpen: location.pathname.includes("/admin/menu") || location.pathname.includes("/admin/recipe")
    },
    {
      title: "Order & Shift",
      icon: "shopping_bag",
      items: [
        { id: "/admin/orders", name: "Order", icon: "" },
        { id: "/admin/customers", name: "Riwayat Shift", icon: "" },
      ],
      defaultOpen: location.pathname.includes("/admin/orders") || location.pathname.includes("/admin/customers")
    },
    {
      title: "Inventory",
      icon: "inventory_2",
      items: [
        { id: "/admin/inventory", name: "Stok Bahan Baku", icon: "" },
      ],
      defaultOpen: location.pathname.includes("/admin/inventory")
    },
    {
      items: [
        { id: "/admin/finance", name: "Keuangan", icon: "account_balance", permKey: "admin" },
        { id: "/admin/report", name: "Laporan", icon: "monitoring", permKey: "reports" },
        { id: "/admin/loyalty", name: "Loyalty & Member", icon: "loyalty", permKey: "admin" },
        { id: "/admin/employees", name: "Karyawan", icon: "group", permKey: "admin" },
        { id: "/pos", name: "Kembali ke POS", icon: "point_of_sale" },
      ]
    }
  ];

  // Filter menu items based on currentUser permissions
  const navGroups = rawNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!item.permKey) return true;
      if (!currentUser) return true; // Default allow if PIN-authorized
      return !!currentUser.permissions[item.permKey];
    })
  })).filter(group => group.items.length > 0);

  const isGroupOpen = (title: string) => {
    const group = navGroups.find(g => g.title === title);
    if (!group) return false;
    if (openGroups[title] !== undefined) return openGroups[title];
    return group.defaultOpen;
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-[#faf6f3] font-sans text-slate-800 antialiased overflow-hidden relative touch-pan-y">
      
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50 flex-shrink-0 shadow-sm ${
          sidebarCollapsed ? "w-20" : "w-[260px]"
        } md:static fixed top-0 bottom-0 left-0 h-full ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header Logo */}
        <div className="h-[60px] border-b border-slate-100 flex items-center justify-between px-4">
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="flex items-center gap-2 text-[#4a2d21]">
              <img src="/logo.png" alt="LB Coffee Logo" className="w-8 h-8 object-contain rounded" />
              <span className="font-bold text-xl tracking-tight">LB Coffee</span>
            </div>
          )}
          <button 
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileMenuOpen(false);
              } else {
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
            className="text-slate-400 hover:text-[#4a2d21] p-1 rounded"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

        {/* Profile Info */}
        {(!sidebarCollapsed || mobileMenuOpen) && (
          <div className="p-4 flex items-center gap-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-[#4a2d21] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              {(currentUser?.name || "L")[0].toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm text-slate-800 leading-tight truncate">{currentUser?.name || "LapanbelasCoffee"}</span>
              <span className="text-xs text-slate-500 font-semibold">{currentUser?.role || "Admin"}</span>
            </div>
          </div>
        )}

        {/* Menu Navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
          {navGroups.map((group, groupIdx) => {
            const isOpen = group.title ? isGroupOpen(group.title) : true;
            return (
            <div key={groupIdx} className="mb-2">
              {/* If group has a main title (dropdown parent) */}
              {group.title && (!sidebarCollapsed || mobileMenuOpen) && (
                <div onClick={() => toggleGroup(group.title)} className="px-4 py-2 flex items-center justify-between text-slate-500 cursor-pointer hover:bg-slate-50 select-none">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{group.icon}</span>
                    <span className="text-sm font-medium">{group.title}</span>
                  </div>
                  <span className="material-symbols-outlined text-[18px]">
                    {isOpen ? "expand_less" : "expand_more"}
                  </span>
                </div>
              )}

              {/* Items mapping */}
              {(!group.title || isOpen || sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex flex-col">
                  {group.items.map(item => {
                    const isActive = location.pathname === item.id;
                    const isSubItem = group.title && !item.icon;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full py-2.5 flex items-center transition-colors text-left relative select-none ${
                          sidebarCollapsed && !mobileMenuOpen ? "justify-center px-0" : isSubItem ? "px-11" : "px-4 gap-3"
                        } ${
                          isActive
                            ? "bg-[#f4ece3] text-[#4a2d21] font-bold"
                            : "text-slate-600 hover:bg-slate-50 font-medium"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4a2d21]" />
                        )}
                        
                        {item.icon && (
                          <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-[#4a2d21]" : "text-slate-500"}`}>
                            {item.icon}
                          </span>
                        )}
                        
                        {(!sidebarCollapsed || mobileMenuOpen) && (
                          <span className={`text-[13px] ${isSubItem && isActive ? "text-[#4a2d21]" : ""}`}>
                            {item.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}

          {/* Static entry for Queue Display */}
          <button
            onClick={() => {
              navigate("/admin/queue-display");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-2.5 px-4 flex items-center gap-3 transition-colors text-left relative select-none ${
              location.pathname.includes("/admin/queue-display") ? "bg-[#f4ece3] text-[#4a2d21] font-bold" : "text-slate-600 hover:bg-slate-50 font-medium"
            }`}
          >
            {location.pathname.includes("/admin/queue-display") && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4a2d21]" />}
            <span className={`material-symbols-outlined text-[20px] ${location.pathname.includes("/admin/queue-display") ? "text-[#4a2d21]" : "text-slate-500"}`}>
              live_tv
            </span>
            {(!sidebarCollapsed || mobileMenuOpen) && <span className="text-[13px]">Queue Number Display</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame container */}
      <main className="flex-1 flex flex-col h-full bg-[#faf6f3] overflow-hidden relative w-full min-w-0">
        
        {/* Admin Header */}
        <header className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-10 w-full">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors flex items-center justify-center"
              aria-label="Open Mobile Menu"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <h2 className="text-base md:text-lg font-bold text-[#0d2a54] truncate">{getPageTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6 text-xs md:text-sm text-slate-600 font-medium">
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-slate-400">Currency :</span>
              <span>IDR (Rp)</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-slate-400">Country :</span>
              <span>🇮🇩</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 cursor-pointer hover:text-[#4a2d21]">
              <span>EN</span>
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </div>
            
            <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
            
            <button 
              onClick={() => setShowLogoutModal(true)}
              className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shadow-xs cursor-pointer hover:bg-red-500/20 transition-all active:scale-95 shrink-0"
              title="Logout Admin"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">logout</span>
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar touch-pan-y w-full">
          <Outlet />
        </div>

        {/* Custom Logout Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center scale-100 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700 mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl">logout</span>
              </div>
              <h3 className="text-slate-800 font-black text-base">Konfirmasi Keluar</h3>
              <p className="text-slate-500 text-xs mt-2 px-2 leading-relaxed">Apakah Anda yakin ingin keluar dari Area Admin? Sesi Anda akan diakhiri.</p>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-98 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem("admin_authorized");
                    window.location.reload();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 active:scale-98 text-white font-bold text-xs transition-all shadow-md shadow-amber-900/10 cursor-pointer"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
