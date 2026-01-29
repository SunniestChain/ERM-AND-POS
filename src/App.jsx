import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Management from './pages/Management';
import POS from './components/POS';

// Simplified App without Authentication
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect login to dashboard if someone tries to go there */}
        <Route path="/login" element={<Navigate to="/" replace />} />

        <Route path="/" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />

        <Route path="/management" element={
          <Layout>
            <Management />
          </Layout>
        } />

        <Route path="/pos" element={
          <Layout>
            <POS />
          </Layout>
        } />
      </Routes>
    </Router>
  );
}
