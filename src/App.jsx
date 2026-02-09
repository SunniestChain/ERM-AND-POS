import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Management from './pages/Management';
import POS from './components/POS';
import Login from './pages/Login';
import CustomerShop from './components/CustomerShop';
import CustomerHistory from './components/CustomerHistory';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', color: 'white' }}>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If POS user tries to access Admin pages, send them to POS
    if (user.role === 'employee') return <Navigate to="/pos" replace />;
    // If Customer tries to access Admin pages, send them to Shop
    if (user.role === 'customer') return <Navigate to="/shop" replace />;

    return <Navigate to="/" replace />;
  }

  return children;
};

// Wrappers
const CustomerShopWrapper = () => {
  const { user, logout } = useAuth();
  return <CustomerShop user={user} onLogout={logout} />;
};

const CustomerHistoryWrapper = () => {
  const { user, logout } = useAuth();
  return <CustomerHistory user={user} onLogout={logout} />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/shop" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerShopWrapper />
            </ProtectedRoute>
          } />

          <Route path="/history" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerHistoryWrapper />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/management" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Management />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/pos" element={
            <ProtectedRoute allowedRoles={['admin', 'employee']}>
              <Layout>
                <POS />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
