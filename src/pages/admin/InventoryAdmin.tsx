import React, { useState, useMemo } from "react";
import { StockItem, WasteLog } from "../../types";
import StockLevelTab from "../../components/inventory/StockLevelTab";
import ReceivingTab from "../../components/inventory/ReceivingTab";
import StockOpnameTab from "../../components/inventory/StockOpnameTab";
import WasteLogTab from "../../components/inventory/WasteLogTab";

interface InventoryAdminProps {
  stockItems: StockItem[];
  setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  wasteLogs: WasteLog[];
  setWasteLogs: React.Dispatch<React.SetStateAction<WasteLog[]>>;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function InventoryAdmin({ stockItems, setStockItems, wasteLogs, setWasteLogs, onNotify }: InventoryAdminProps) {
  const [activeTab, setActiveTab] = useState<"level" | "receiving" | "opname" | "waste">("level");

  const totalInventoryValue = useMemo(() => {
    return stockItems.reduce((sum, s) => sum + ((s.unitCost || 0) * (s.stockLevel || 0)), 0);
  }, [stockItems]);

  const tabs = [
    { id: "level", label: "LEVEL STOK" },
    { id: "receiving", label: "PENERIMAAN BARANG" },
    { id: "opname", label: "OPNAME STOK" },
    { id: "waste", label: "LOG PEMBUANGAN" },
  ] as const;

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto h-full pb-10">

      {/* Main Navigation Header */}
      <div className="bg-[#faf6f3] border-b border-slate-200 sticky top-0 z-10 pt-4 px-6 md:px-0 flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-4 text-sm font-black tracking-widest uppercase transition-colors rounded-t-xl ${
                activeTab === tab.id 
                  ? "bg-[#4a2d21] text-white" 
                  : "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="pb-4 hidden md:flex items-center gap-2">
          <span className="font-bold text-slate-600 text-sm">Total Nilai Inventaris:</span>
          <span className="font-black text-[#4a2d21] text-lg">Rp {totalInventoryValue.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Mobile Value Display */}
      <div className="md:hidden flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <span className="font-bold text-slate-600 text-xs">Total Nilai Inventaris:</span>
        <span className="font-black text-[#4a2d21]">Rp {totalInventoryValue.toLocaleString('id-ID')}</span>
      </div>

      {/* Tab Content */}
      <div className="px-6 md:px-0">
        {activeTab === "level" && (
          <StockLevelTab stockItems={stockItems} setStockItems={setStockItems} wasteLogs={wasteLogs} onNotify={onNotify} />
        )}
        {activeTab === "receiving" && (
          <ReceivingTab stockItems={stockItems} setStockItems={setStockItems} onNotify={onNotify} />
        )}
        {activeTab === "opname" && (
          <StockOpnameTab stockItems={stockItems} setStockItems={setStockItems} onNotify={onNotify} />
        )}
        {activeTab === "waste" && (
          <WasteLogTab stockItems={stockItems} wasteLogs={wasteLogs} setWasteLogs={setWasteLogs} onNotify={onNotify} />
        )}
      </div>

    </div>
  );
}
