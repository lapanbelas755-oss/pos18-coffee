import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ScannerLoginScreen from './ScannerLoginScreen';
import ScannerMainScreen from './ScannerMainScreen';

export default function ScannerApp() {
  return (
    <Routes>
      <Route path="/" element={<ScannerLoginScreen />} />
      <Route path="/main" element={<ScannerMainScreen />} />
      <Route path="*" element={<Navigate to="/scanner" replace />} />
    </Routes>
  );
}
