<div align="center">
  <img width="1200" height="475" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" alt="GHBanner">
</div>

# POS18 Coffee - Application & AI Context Guide

Dokumen ini berisi panduan arsitektur, batasan pengembangan, serta instruksi kerja spesifik untuk AI Coding Assistant agar pengembangan modul tetap fokus, terisolasi, dan tidak merusak kode yang sudah ada. Tujuannya adalah aplikasi yang tahan banting (tidak gampang error), mudah di-maintenance, dan fitur-fiturnya dapat dikembangkan secara independen.

---

## 🎯 Development Philosophy (Zero-Coupling Goal)
- **Tahan Banting:** POS Dashboard adalah urat nadi operasional. Modul ini harus sangat ringan dan tahan dari error yang mungkin terjadi di modul Admin.
- **Plug & Play:** Fitur baru di Admin (misal: laporan) harus bisa ditambahkan, diubah, atau dihapus tanpa mengubah satu baris pun kode di sistem POS.

---

## 🏗️ Architecture & Scope Boundaries (AI RULES)

Aplikasi ini terbagi menjadi 2 sistem utama yang **100% TERPISAH (ISOLATED)**:
1. **POS Dashboard (Kasir & Operasional):** Fokus pada kecepatan transaksi, menu pesanan, dan UI operasional harian.
2. **Admin Dashboard (Manajemen):** Fokus pada laporan, manajemen stok, pengaturan menu, dan analisis data.

### ⚠️ STRICT RULES FOR AI (WAJIB DIPATUHI):
- **ISOLASI MODUL:** Saat mendapat instruksi untuk mengerjakan **Admin Dashboard**, DILARANG KERAS menyentuh, merombak, atau memodifikasi layout, state, routing, atau komponen milik **POS Dashboard** (begitu pula sebaliknya).
- **SINGLE FOCUS:** Hanya kerjakan apa yang diminta dalam prompt saat ini. Jangan melakukan *unsolicited refactoring* (mengubah kode lain yang sudah berjalan normal).
- **ERROR BOUNDARIES:** Setiap modul utama (POS dan Admin) WAJIB dibungkus dengan React Error Boundary. Jika terjadi crash di Admin, POS harus tetap berjalan normal.
- **STATE ISOLATION:** Dilarang menggabungkan Global State (Zustand/Redux/Context) antara POS dan Admin. Gunakan store terpisah.
- **LAZY LOADING:** Gunakan `React.lazy()` dan `Suspense` untuk memisahkan bundel kode POS dan Admin.
- **STRICT TYPING:** Gunakan TypeScript Interface/Type secara eksplisit, terutama untuk data transaksi. Dilarang menggunakan tipe `any`.
- **SHARED COMPONENTS:** Jika mengubah/membuat di `/src/components/common`, konfirmasi dampaknya agar tidak merusak UI modul lain.
- **NO HALLUCINATION:** Gunakan library yang sudah terdaftar di `package.json`. Jangan install dependencies baru tanpa izin.

---

## 📌 Current Progress & Active Focus

> **👉 AI FOCUS NOW:** Kami sedang fokus membangun dan menyempurnakan **Admin Dashboard**. Anggap modul POS Dashboard sudah stabil dan jangan diubah kecuali diminta secara spesifik.

### Roadmap Status:
- [x] Inisialisasi Proyek & Setup Vite + React + TS
- [x] Konfigurasi Environment & Gemini API
- [x] **POS Dashboard:** Layouting & UI Dasar (STABLE - Do Not Touch)
- [ ] **Admin Dashboard:** Setup Layout & Sidebar Navigation *(IN PROGRESS)*
- [ ] **Admin Dashboard:** Manajemen Menu & Stok
- [ ] **Admin Dashboard:** Laporan & Analitik Penjualan
- [ ] Integrasi End-to-End & Database

---

## 📂 Expected Directory Structure

Ikuti standar struktur folder berikut untuk menjaga isolasi yang ketat:

```text
src/
├── assets/
├── components/
│   ├── common/         # UI Reusable (Button, Modal, Input) - Bebas logic bisnis
│   ├── pos/            # Komponen KHUSUS POS 
│   └── admin/          # Komponen KHUSUS Admin 
├── hooks/
│   ├── pos/            # Custom hooks khusus POS
│   └── admin/          # Custom hooks khusus Admin
├── store/              # State Management (Zustand)
│   ├── posStore.ts     # Terisolasi untuk transaksi kasir
│   └── adminStore.ts   # Terisolasi untuk manajemen & laporan
├── layouts/
│   ├── PosLayout.tsx   # (Dilengkapi Error Boundary POS)
│   └── AdminLayout.tsx # (Dilengkapi Error Boundary Admin)
├── pages/
│   ├── pos/            # Halaman POS
│   └── admin/          # Halaman Admin
├── services/           
│   ├── apiPos.ts       # Endpoint spesifik POS
│   └── apiAdmin.ts     # Endpoint spesifik Admin
├── utils/              
├── App.tsx             # Main Routing (Lazy Loading Terpusat)
└── main.tsx

🛠️ Code Implementation Guidelines
1. Error Boundary Component (src/components/common/ErrorBoundary.tsx)
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default ErrorBoundary;

2. Main Routing with Lazy Loading (src/App.tsx)
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy Loading
const PosLayout = lazy(() => import('./layouts/PosLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const PosDashboard = lazy(() => import('./pages/pos/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

const LoadingScreen = () => <div className="flex h-screen items-center justify-center">Memuat...</div>;

const PosErrorFallback = () => (
  <div className="p-8 text-center">
    <h2>Sistem Kasir (POS) mengalami kendala teknis.</h2>
    <button onClick={() => window.location.reload()}>Muat Ulang Kasir</button>
  </div>
);

const AdminErrorFallback = () => (
  <div className="p-8 text-center">
    <h2>Modul Admin mengalami kendala. Sistem POS tetap aman berjalan.</h2>
    <button onClick={() => window.location.reload()}>Muat Ulang Admin</button>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* CLUSTER POS */}
          <Route path="/pos/*" element={
            <ErrorBoundary fallback={<PosErrorFallback />}>
              <PosLayout />
            </ErrorBoundary>
          }>
            <Route index element={<PosDashboard />} />
          </Route>

          {/* CLUSTER ADMIN */}
          <Route path="/admin/*" element={
            <ErrorBoundary fallback={<AdminErrorFallback />}>
              <AdminLayout />
            </ErrorBoundary>
          }>
            <Route index element={<AdminDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;