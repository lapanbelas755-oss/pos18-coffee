import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Employee } from '../../types';

const ROLES_AVATAR_COLOR: Record<string, string> = {
  Manajer: 'from-purple-500 to-purple-700',
  Admin:   'from-slate-500 to-slate-700',
  Kasir:   'from-blue-500 to-blue-700',
  Barista: 'from-amber-500 to-amber-700',
  Chef:    'from-emerald-500 to-emerald-700',
};

const ROLE_ICON: Record<string, string> = {
  Manajer: 'admin_panel_settings',
  Admin:   'manage_accounts',
  Kasir:   'point_of_sale',
  Barista: 'local_cafe',
  Chef:    'soup_kitchen',
};

export default function KdsLoginScreen() {
  const { login, employees } = useAuthStore();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Employee | null>(null);
  const { currentUser } = useAuthStore();
  React.useEffect(() => {
    if (currentUser) {
      const p = currentUser.permissions;
      if (p.kdsBarista) navigate('/kds/barista', { replace: true });
      else if (p.kdsKitchen) navigate('/kds/kitchen', { replace: true });
      else if (p.kdsKasir) navigate('/kds/kasir', { replace: true });
    }
  }, [currentUser, navigate]);

  // Preview user as PIN is typed (shows name when PIN matches)
  const preview = employees.find(e => e.pin === pin && e.status === 'Aktif') ?? null;

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
      setError('PIN tidak dikenali atau akun nonaktif');
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 600);
      return;
    }
    // Redirect berdasarkan permission prioritas
    const p = user.permissions;
    if (p.kdsBarista) navigate('/kds/barista');
    else if (p.kdsKitchen) navigate('/kds/kitchen');
    else if (p.kdsKasir) navigate('/kds/kasir');
    else if (p.pos) navigate('/pos');
    else if (p.admin) navigate('/admin');
    else {
      setError('Akun ini tidak memiliki akses ke layar manapun');
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 600);
    }
  }, [pin, login, navigate]);

  const dots = Array.from({ length: 6 }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0e0a] via-[#2d1a10] to-[#1a0e0a] flex flex-col items-center justify-center p-4 select-none">

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-900/50">
          <span className="text-white font-black text-2xl">18</span>
        </div>
        <p className="text-white/60 font-bold tracking-widest text-xs uppercase">POS18 Coffee • KDS</p>
      </div>

      {/* Card */}
      <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl transition-all ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>

        {/* Matched user preview */}
        <div className="flex flex-col items-center mb-8 min-h-[80px] justify-center">
          {matchedUser ? (
            <div className="flex flex-col items-center gap-2 animate-fade-in">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ROLES_AVATAR_COLOR[matchedUser.role] ?? 'from-slate-500 to-slate-700'} flex items-center justify-center shadow-lg`}>
                <span className="material-symbols-outlined text-white text-2xl">{ROLE_ICON[matchedUser.role] ?? 'person'}</span>
              </div>
              <p className="text-white font-bold text-base">{matchedUser.name}</p>
              <span className="text-white/50 text-xs font-bold uppercase tracking-wider">{matchedUser.role}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-white/40 text-3xl">person</span>
              </div>
              <p className="text-white/40 text-sm">Masukkan PIN Anda</p>
            </div>
          )}
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 mb-6">
          {dots.map((filled, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${filled ? 'bg-amber-400 border-amber-400 scale-125' : 'bg-transparent border-white/30'}`} />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-red-400 text-xs font-bold mb-4 animate-fade-in">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} onClick={() => handleKey(d)}
              className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 text-white font-bold text-xl transition-all duration-100 border border-white/10">
              {d}
            </button>
          ))}
          {/* Row 4 */}
          <button onClick={handleBackspace}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white/50 font-bold transition-all duration-100 flex items-center justify-center border border-white/5">
            <span className="material-symbols-outlined text-xl">backspace</span>
          </button>
          <button onClick={() => handleKey('0')}
            className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 text-white font-bold text-xl transition-all duration-100 border border-white/10">
            0
          </button>
          <button onClick={handleSubmit} disabled={pin.length < 4}
            className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-bold transition-all duration-100 flex items-center justify-center shadow-lg shadow-amber-900/30 disabled:opacity-30 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined text-2xl">arrow_forward</span>
          </button>
        </div>

        {/* Quick access links */}
        <div className="mt-6 pt-5 border-t border-white/10 flex justify-center gap-4">
          <a href="/kds/barista" className="text-xs text-white/30 hover:text-white/60 transition-colors font-bold">Barista</a>
          <span className="text-white/20">·</span>
          <a href="/kds/kitchen" className="text-xs text-white/30 hover:text-white/60 transition-colors font-bold">Dapur</a>
          <span className="text-white/20">·</span>
          <a href="/kds/kasir" className="text-xs text-white/30 hover:text-white/60 transition-colors font-bold">Monitor</a>
          <span className="text-white/20">·</span>
          <a href="/pos" className="text-xs text-white/30 hover:text-white/60 transition-colors font-bold">POS</a>
        </div>
      </div>

      {/* Staff list hint (dev mode) */}
      <div className="mt-6 text-center">
        <p className="text-white/20 text-xs">PIN Demo: Manajer=1234 · Kasir=5678 · Barista=9012 · Dapur=3456</p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
