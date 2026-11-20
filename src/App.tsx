import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { useStore } from './store';
import { CustomerMenu } from './pages/CustomerMenu';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { NotificationManager } from './components/NotificationManager';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

const CaptainMenu = React.lazy(() => import('./pages/CaptainMenu').then(module => ({ default: module.CaptainMenu })));
const CaptainDashboard = React.lazy(() => import('./pages/CaptainDashboard').then(module => ({ default: module.CaptainDashboard })));
const KitchenDashboard = React.lazy(() => import('./pages/KitchenDashboard').then(module => ({ default: module.KitchenDashboard })));
const PaymentScreen = React.lazy(() => import('./pages/PaymentScreen').then(module => ({ default: module.PaymentScreen })));
const CashierDashboard = React.lazy(() => import('./pages/CashierDashboard').then(module => ({ default: module.CashierDashboard })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PrintableMenu = React.lazy(() => import('./pages/PrintableMenu').then(module => ({ default: module.PrintableMenu })));
const Login = React.lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));

function FloatingAdminButton() {
  const { user } = useStore();
  if (!user || user.role !== 'admin') return null;

  return (
    <Link 
      to="/admin" 
      className="fixed bottom-6 left-6 z-50 bg-amber-600 text-white p-4 rounded-full shadow-2xl hover:bg-amber-700 transition-all hover:scale-110 active:scale-95 group"
      title="لوحة الإدارة"
    >
      <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
    </Link>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, isAuthReady } = useStore();

  if (!isAuthReady) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  
  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster />
      <NotificationManager />
      <PWAInstallPrompt />
      <Router>
        <FloatingAdminButton />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-bg-dark text-primary"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
          <Routes>
            <Route path="/" element={<CustomerMenu />} />
            <Route path="/table/:tableNumber" element={<CustomerMenu />} />
            <Route path="/pay/:tableNumber" element={<PaymentScreen />} />
            <Route path="/login" element={<Login />} />
            <Route path="/print" element={<PrintableMenu />} />
            
            <Route path="/captain" element={
              <ProtectedRoute allowedRoles={['admin', 'captain']}>
                <CaptainMenu />
              </ProtectedRoute>
            } />

            <Route path="/captain/dashboard" element={
              <ProtectedRoute allowedRoles={['admin', 'captain']}>
                <CaptainDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/kitchen" element={
              <ProtectedRoute allowedRoles={['admin', 'captain', 'cashier']}>
                <KitchenDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/cashier" element={
              <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                <CashierDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
