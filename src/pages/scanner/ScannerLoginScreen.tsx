import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Employee } from '../../types';

export default function ScannerLoginScreen() {
  const { login, employees, currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Employee | null>(null);

  React.useEffect(() => {
    if (currentUser) {
      navigate('/scanner/main', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleKey = useCallback((digit: string) => {
    if (pin.length >= 6) return;
    setError('');
    const next = pin + digit;
    setPin(next);

    const found = employees.find(e => e.pin === next && e.status === 'Aktif');
    if (found) setMatchedUser(found);
    else setMatchedUser(null);
  }, [pin, employees]);

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setError('');
    setMatchedUser(null);
  };

  const handleSubmit = useCallback(() => {
    const user = login(pin);
    if (!user) {
      setError('PIN tidak valid / tidak aktif');
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 600);
      return;
    }
    navigate('/scanner/main');
  }, [pin, login, navigate]);

  const dots = Array.from({ length: 6 }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#101a14] via-[#162d1a] to-[#101a14] flex flex-col items-center justify-center p-4 select-none">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-900/50">
          <span className="material-symbols-outlined text-white text-3xl">barcode_scanner</span>
        </div>
        <p className="text-white/60 font-bold tracking-widest text-xs uppercase">POS18 • Gudang Scanner</p>
      </div>

      {/* Card */}
      <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl transition-all ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        
        {/* Matched user preview */}
        <div className="flex flex-col items-center mb-8 min-h-[80px] justify-center">
          {matchedUser ? (
            <div className="flex flex-col items-center gap-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-lg border-2 border-white/20">
                <span className="material-symbols-outlined text-white text-xl">person</span>
              </div>
              <div className="text-center">
                <h3 className="text-white font-bold text-lg">{matchedUser.name}</h3>
                <span className="text-emerald-400 font-semibold text-xs tracking-wider uppercase">{matchedUser.role}</span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-white font-black text-2xl tracking-tight mb-2">Masuk Gudang</h2>
              <p className="text-white/50 text-sm">Masukkan 6 digit PIN Karyawan</p>
            </div>
          )}
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-8">
          {dots.map((isFilled, i) => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${isFilled ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-110' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* Error message */}
        <div className="h-6 mb-6 flex justify-center">
          {error && <span className="text-red-400 text-sm font-bold bg-red-400/10 px-4 py-1 rounded-full">{error}</span>}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button key={num} onClick={() => handleKey(num.toString())} className="h-16 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/20 text-white font-black text-2xl transition-all shadow-sm border border-white/5">
              {num}
            </button>
          ))}
          <button onClick={handleBackspace} className="h-16 rounded-2xl bg-white/5 hover:bg-red-500/20 text-red-400 active:bg-red-500/30 font-black text-2xl flex items-center justify-center transition-all border border-white/5">
            <span className="material-symbols-outlined">backspace</span>
          </button>
          <button onClick={() => handleKey('0')} className="h-16 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/20 text-white font-black text-2xl transition-all shadow-sm border border-white/5">
            0
          </button>
          <button onClick={handleSubmit} disabled={pin.length < 4} className="h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white active:bg-emerald-600 font-black flex items-center justify-center transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none">
            <span className="material-symbols-outlined text-3xl">login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
