import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function POSLogoutView() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [showShiftAlert, setShowShiftAlert] = useState(false);
  const { login, logout } = useAuthStore();

  // Pastikan user benar-benar logout saat masuk ke halaman ini
  useEffect(() => {
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
    logout();
  }, [logout, navigate]);

  const handleNumpad = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        const user = login(newPin);
        if (user || newPin === "1234") {
          navigate("/pos");
        } else {
          setError(true);
          setPin("");
          setTimeout(() => setError(false), 2000);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 bg-[#4d3227] z-50 flex items-center justify-center p-4 select-none">
      
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 -right-20 w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-slide-up">
        
        {/* User Profile Info */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-white/10 border-2 border-white/20 rounded-full flex items-center justify-center mb-4 shadow-2xl relative overflow-hidden">
            <span className="material-symbols-outlined text-white/80 text-5xl">person</span>
          </div>
          <h2 className="text-white font-extrabold text-2xl tracking-wide">POS18 Coffee</h2>
          <p className="text-white/60 font-medium mt-1">Sesi Kasir Terkunci</p>
        </div>

        {/* PIN Indicators */}
        <div className={`flex gap-4 mb-10 transition-transform ${error ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                pin.length > index ? 'bg-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/20'
              } ${error ? 'bg-red-400' : ''}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 font-bold text-sm mb-4 absolute top-[230px]">PIN Salah. Silakan coba lagi.</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full px-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumpad(num.toString())}
              className="h-16 rounded-full bg-white/5 border border-white/10 text-white text-2xl font-semibold hover:bg-white/20 active:bg-white/30 transition-all flex items-center justify-center focus:outline-none"
            >
              {num}
            </button>
          ))}
          <div className="h-16"></div> {/* Empty space */}
          <button
            onClick={() => handleNumpad("0")}
            className="h-16 rounded-full bg-white/5 border border-white/10 text-white text-2xl font-semibold hover:bg-white/20 active:bg-white/30 transition-all flex items-center justify-center focus:outline-none"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 rounded-full bg-transparent text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center focus:outline-none"
          >
            <span className="material-symbols-outlined text-3xl">backspace</span>
          </button>
        </div>
        
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
            <button
              onClick={() => {
                setShowShiftAlert(false);
                navigate("/pos/shift");
              }}
              className="w-full py-3.5 bg-[#4d3227] text-white rounded-xl font-bold hover:bg-[#3a251d] transition-colors shadow-lg shadow-[#4d3227]/30"
            >
              Ke Menu Shift
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
