import React, { useState } from "react";
import { useAuthStore } from "../../store/authStore";

interface ManagerAuthModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ManagerAuthModal({ onSuccess, onCancel }: ManagerAuthModalProps) {
  const { employees } = useAuthStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleVerify = () => {
    // Cari semua karyawan dengan role "Manajer" dan status "Aktif"
    const managers = employees.filter(emp => emp.role.toLowerCase() === "manajer" && emp.status === "Aktif");
    
    // Default PIN if no manager exists (fallback)
    const fallbackPin = localStorage.getItem("pos_manager_pin") || "123456";
    
    // Check if the entered PIN matches any manager's PIN, or the fallback if no managers exist
    const isValid = managers.length > 0 
      ? managers.some(m => m.pin === pin)
      : pin === fallbackPin;

    if (isValid) {
      onSuccess();
    } else {
      setError("PIN Manager salah. Silakan coba lagi.");
      setPin("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl transform scale-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
          </div>
          <h2 className="text-xl font-black text-slate-800">Otorisasi Manager</h2>
          <p className="text-sm text-slate-500 mt-1">Masukkan PIN Manager untuk melakukan Void</p>
        </div>

        <div className="mb-6">
          <input
            type="password"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            onKeyDown={handleKeyPress}
            placeholder="••••••"
            className="w-full text-center text-3xl tracking-[1em] font-black py-4 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-red-500 transition-colors"
            maxLength={6}
          />
          {error && <p className="text-red-500 text-sm text-center mt-2 font-bold">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleVerify}
            className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200"
          >
            Verifikasi
          </button>
        </div>
      </div>
    </div>
  );
}
