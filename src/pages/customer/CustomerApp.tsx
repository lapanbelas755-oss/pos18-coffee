import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CustomerOrderView from "./CustomerOrderView";

export default function CustomerApp() {
  return (
    <Routes>
      <Route path="/:tableId" element={<CustomerOrderView />} />
      {/* If no table ID is provided, maybe show an error or redirect */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col p-6 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">qr_code_scanner</span>
          <h1 className="text-xl font-bold text-slate-800 mb-2">QR Code Tidak Valid</h1>
          <p className="text-slate-500">Silakan scan QR Code yang ada di meja Anda untuk memulai pemesanan.</p>
        </div>
      } />
    </Routes>
  );
}
