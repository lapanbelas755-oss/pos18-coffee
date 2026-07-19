import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PosProvider } from './store/posStore';
import FullscreenToggle from './components/common/FullscreenToggle';
import ScheduledTaskRunner from './components/ScheduledTaskRunner';

// Lazy Loading Modules
const PosApp = lazy(() => import('./pages/pos/PosApp'));
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));
const CustomerApp = lazy(() => import('./pages/customer/CustomerApp'));
const TvQueueApp = lazy(() => import('./pages/tv/TvQueueApp'));
const KdsApp = lazy(() => import('./pages/kds/KdsApp'));
const ScannerApp = lazy(() => import('./pages/scanner/ScannerApp'));
const ScanOpname = lazy(() => import('./pages/ScanOpname'));
const CustomerDisplay = lazy(() => import('./pages/display/CustomerDisplay'));

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50 flex-col gap-4">
    <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1a4b9c] rounded-full animate-spin"></div>
    <span className="font-bold text-slate-500 tracking-widest text-sm">MEMUAT MODUL...</span>
  </div>
);

const PosErrorFallback = () => (
  <div className="p-8 text-center flex flex-col items-center justify-center h-screen bg-slate-50">
    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
    <h2 className="text-xl font-bold text-slate-800 mb-2">Sistem Kasir (POS) mengalami kendala teknis.</h2>
    <p className="text-slate-500 mb-6 max-w-md">Terjadi kesalahan pada aplikasi POS. Jangan khawatir, sistem Admin tetap aman berkat isolasi Error Boundary.</p>
    <button 
      onClick={() => window.location.reload()}
      className="bg-[#1a4b9c] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-[#153a7a] transition-all"
    >
      Muat Ulang Kasir
    </button>
  </div>
);

const AdminErrorFallback = () => (
  <div className="p-8 text-center flex flex-col items-center justify-center h-screen bg-slate-50">
    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">warning</span>
    <h2 className="text-xl font-bold text-slate-800 mb-2">Modul Admin mengalami kendala.</h2>
    <p className="text-slate-500 mb-6 max-w-md">Sistem POS untuk kasir tetap aman dan bisa berjalan normal.</p>
    <button 
      onClick={() => window.location.reload()}
      className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-slate-900 transition-all"
    >
      Muat Ulang Admin
    </button>
  </div>
);

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* CLUSTER POS */}
        <Route path="/pos/*" element={
          <ErrorBoundary fallback={<PosErrorFallback />}>
            <PosProvider>
              <PosApp />
            </PosProvider>
          </ErrorBoundary>
        } />

        {/* CLUSTER ADMIN */}
        <Route path="/admin/*" element={
          <ErrorBoundary fallback={<AdminErrorFallback />}>
            <PosProvider>
              <AdminApp />
            </PosProvider>
          </ErrorBoundary>
        } />

        {/* CLUSTER CUSTOMER (QR Self Order) */}
        <Route path="/qr/*" element={
          <ErrorBoundary fallback={<div className="p-8 text-center bg-slate-50 min-h-screen">Terjadi kesalahan pada menu. Harap scan ulang QR.</div>}>
            <CustomerApp />
          </ErrorBoundary>
        } />

        {/* SCAN OPNAME (Kitchen / Barista) */}
        <Route path="/scan-opname/:department" element={
          <ErrorBoundary fallback={<div className="p-8 text-center bg-slate-50 min-h-screen">Terjadi kesalahan. Harap muat ulang halaman.</div>}>
            <ScanOpname />
          </ErrorBoundary>
        } />

        {/* CLUSTER KDS (Kitchen/Barista Display System) */}
        <Route path="/kds/*" element={
          <ErrorBoundary fallback={<div className="p-8 text-center bg-black text-white min-h-screen">Gangguan sistem KDS. Harap refresh halaman.</div>}>
            <PosProvider>
              <KdsApp />
            </PosProvider>
          </ErrorBoundary>
        } />

        {/* CLUSTER TV QUEUE */}
        <Route path="/tv" element={
          <ErrorBoundary fallback={<div className="p-8 text-center bg-black text-white min-h-screen">Gangguan sistem antrian TV. Harap refresh halaman.</div>}>
            <TvQueueApp />
          </ErrorBoundary>
        } />

        {/* CLUSTER SCANNER / GUDANG */}
        <Route path="/scanner/*" element={
          <ErrorBoundary fallback={<div className="p-8 text-center bg-slate-900 text-white min-h-screen">Gangguan sistem Scanner. Harap refresh halaman.</div>}>
            <ScannerApp />
          </ErrorBoundary>
        } />

        {/* CLUSTER CUSTOMER DISPLAY (Layar Pelanggan) */}
        <Route path="/display" element={
          <ErrorBoundary fallback={<div className="p-8 text-center bg-black text-white min-h-screen">Gangguan layar pelanggan.</div>}>
            <CustomerDisplay />
          </ErrorBoundary>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
      <FullscreenToggle />
      <ScheduledTaskRunner />
    </Suspense>
  );
}

export default App;
