import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  const navGroups = [
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
        { id: "/admin/recipes", name: "Resep & Gramasi", icon: "" },
      ],
      defaultOpen: location.pathname.includes("/admin/menu") || location.pathname.includes("/admin/recipe")
    },
    {
      title: "Order & Customer",
      icon: "shopping_bag",
      items: [
        { id: "/admin/orders", name: "Order", icon: "" },
      ],
      defaultOpen: location.pathname.includes("/admin/orders")
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
        { id: "/admin/finance", name: "Keuangan", icon: "account_balance" },
        { id: "/admin/report", name: "Laporan", icon: "monitoring" },
        { id: "/admin/employees", name: "Karyawan", icon: "group" },
        { id: "/pos", name: "Kembali ke POS", icon: "point_of_sale" },
      ]
    }
  ];

  const isGroupOpen = (title: string) => {
    const group = navGroups.find(g => g.title === title);
    if (!group) return false;
    if (openGroups[title] !== undefined) return openGroups[title];
    return group.defaultOpen;
  };

  return (
    <div className="flex h-screen w-screen bg-[#faf6f3] font-sans text-slate-800 antialiased overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50 flex-shrink-0 shadow-sm ${
          sidebarCollapsed ? "w-20" : "w-[260px]"
        }`}
      >
        {/* Header Logo */}
        <div className="h-[60px] border-b border-slate-100 flex items-center justify-between px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 text-[#4a2d21]">
              <img src="/logo.png" alt="LB Coffee Logo" className="w-8 h-8 object-contain rounded" />
              <span className="font-bold text-xl tracking-tight">LB Coffee</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-400 hover:text-[#4a2d21] p-1 rounded"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        </div>

        {/* Profile Info */}
        {!sidebarCollapsed && (
          <div className="p-4 flex items-center gap-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-[#4a2d21] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              L
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-800 leading-tight">LapanbelasCoffee</span>
              <span className="text-xs text-slate-500">Admin</span>
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
              {group.title && !sidebarCollapsed && (
                <div onClick={() => toggleGroup(group.title)} className="px-4 py-2 flex items-center justify-between text-slate-500 cursor-pointer hover:bg-slate-50">
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
              {(!group.title || isOpen || sidebarCollapsed) && (
                <div className="flex flex-col">
                  {group.items.map(item => {
                    const isActive = location.pathname === item.id;
                    const isSubItem = group.title && !item.icon;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={`w-full py-2.5 flex items-center transition-colors text-left relative ${
                          sidebarCollapsed ? "justify-center px-0" : isSubItem ? "px-11" : "px-4 gap-3"
                        } ${
                          isActive
                            ? "bg-[#f4ece3] text-[#4a2d21] font-bold"
                            : "text-slate-600 hover:bg-slate-50 font-medium"
                        }`}
                      >
                        {isActive && !sidebarCollapsed && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4a2d21]" />
                        )}
                        
                        {item.icon && (
                          <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-[#4a2d21]" : "text-slate-500"}`}>
                            {item.icon}
                          </span>
                        )}
                        
                        {!sidebarCollapsed && (
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

          {/* Static entry for Queue Display to match screenshot 4 */}
          <button
            onClick={() => navigate("/admin/queue-display")}
            className={`w-full py-2.5 px-4 flex items-center gap-3 transition-colors text-left relative ${
              location.pathname.includes("/admin/queue-display") ? "bg-[#f4ece3] text-[#4a2d21] font-bold" : "text-slate-600 hover:bg-slate-50 font-medium"
            }`}
          >
            {location.pathname.includes("/admin/queue-display") && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4a2d21]" />}
            <span className={`material-symbols-outlined text-[20px] ${location.pathname.includes("/admin/queue-display") ? "text-[#4a2d21]" : "text-slate-500"}`}>
              live_tv
            </span>
            {!sidebarCollapsed && <span className="text-[13px]">Queue Number Display</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame container */}
      <main className="flex-1 flex flex-col h-full bg-[#faf6f3] overflow-hidden relative">
        
        {/* Admin Header */}
        <header className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <h2 className="text-lg font-bold text-[#0d2a54]">{getPageTitle()}</h2>
          
          <div className="flex items-center gap-6 text-sm text-slate-600 font-medium">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Currency :</span>
              <span>IDR (Rp)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Country :</span>
              <span>🇮🇩</span>
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-[#4a2d21]">
              <span>EN</span>
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </div>
            
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            
            <button className="relative text-slate-400 hover:text-[#4a2d21]">
              <span className="material-symbols-outlined text-[24px]">assignment</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#4a2d21] text-white flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer hover:bg-[#382016] transition-colors">
              L
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
