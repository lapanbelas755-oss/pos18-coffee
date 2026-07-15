import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePosStore } from '../../store/posStore';
import { supabase } from '../../lib/supabase';
import KdsLoginScreen from './KdsLoginScreen';
import KdsBaristaScreen from './KdsBaristaScreen';
import KdsKitchenScreen from './KdsKitchenScreen';
import KdsKasirScreen from './KdsKasirScreen';

/** Route guard — redirect ke /kds (login) jika tidak punya permission */
function KdsGuard({ permKey, children }: { permKey: keyof import('../../types').EmployeePermissions; children: React.ReactNode }) {
  const { currentUser } = useAuthStore();
  if (!currentUser) return <Navigate to="/kds" replace />;
  if (!currentUser.permissions[permKey]) {
    return (
      <div className="min-h-screen bg-[#0f0a07] flex flex-col items-center justify-center text-center p-8">
        <span className="material-symbols-outlined text-6xl text-red-400 mb-4">block</span>
        <h2 className="text-white font-black text-2xl mb-2">Akses Ditolak</h2>
        <p className="text-white/50 mb-6">Akun <strong className="text-white">{currentUser.name}</strong> tidak memiliki izin untuk layar ini.</p>
        <a href="/kds" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl transition-colors">
          Kembali ke Login
        </a>
      </div>
    );
  }
  return <>{children}</>;
}

export default function KdsApp() {
  const { setKdsOrders, setPosOrders } = usePosStore();

  useEffect(() => {
    const fetchKds = async () => {
      const { data } = await supabase.from('kds_orders').select('*').order('created_at', { ascending: false });
      if (data) {
        setKdsOrders(data.map(o => ({
          ...o, timeInSeconds: o.time_in_seconds || 0, customerName: o.customer_name
        })));
      }
    };
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) setPosOrders(data as any[]); // types might need mapping, we'll assume it matches for now
    };

    fetchKds();
    fetchOrders();

    const sub1 = supabase.channel('kdsapp-kds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kds_orders' }, fetchKds).subscribe();
    const sub2 = supabase.channel('kdsapp-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe();

    return () => {
      supabase.removeChannel(sub1);
      supabase.removeChannel(sub2);
    };
  }, [setKdsOrders, setPosOrders]);

  return (
    <Routes>
      <Route path="/" element={<KdsLoginScreen />} />
      <Route path="/barista" element={<KdsGuard permKey="kdsBarista"><KdsBaristaScreen /></KdsGuard>} />
      <Route path="/kitchen" element={<KdsGuard permKey="kdsKitchen"><KdsKitchenScreen /></KdsGuard>} />
      <Route path="/kasir" element={<KdsGuard permKey="kdsKasir"><KdsKasirScreen /></KdsGuard>} />
      <Route path="*" element={<Navigate to="/kds" replace />} />
    </Routes>
  );
}
