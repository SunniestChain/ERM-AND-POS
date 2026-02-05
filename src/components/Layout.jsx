import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import AdminStatsModal from './AdminStatsModal';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
    const location = useLocation();
    const [showStats, setShowStats] = useState(false);
    const { user, logout } = useAuth();

    const getLinkStyle = (path) => ({
        color: location.pathname === path ? 'var(--accent-primary)' : 'var(--text-primary)',
        textDecoration: 'none',
        fontWeight: 500
    });

    return (
        <div className="layout-container">
            <nav className="glass-panel" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '70px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Logo Removed */}
                    <img src="/logo.png" alt="ERM Inventory" style={{ height: '45px', objectFit: 'contain' }} />
                </div>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    {user?.role === 'admin' && (
                        <>
                            <Link to="/" style={getLinkStyle('/')}>Dashboard</Link>
                            <Link to="/management" style={getLinkStyle('/management')}>Management</Link>
                        </>
                    )}
                    <Link to="/pos" style={getLinkStyle('/pos')}>POS</Link>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {user?.role === 'admin' && (
                        <button className="btn-primary" onClick={() => setShowStats(true)} style={{ background: 'var(--accent-primary)', border: 'none' }}>
                            Admin
                        </button>
                    )}
                    <button onClick={logout} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-highlight)' }}>
                        Logout
                    </button>
                </div>
            </nav>

            <main style={{
                marginTop: '90px',
                padding: '0 2rem',
                height: 'calc(100vh - 90px)',
                overflowY: 'auto'
            }}>
                {children}
            </main>

            {/* Admin Stats Modal */}
            {showStats && <AdminStatsModal onClose={() => setShowStats(false)} />}

            {/* Background ambient effects */}
            <div style={{
                position: 'fixed',
                top: '-20%',
                left: '20%',
                width: '50vw',
                height: '50vw',
                background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 70%)',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>
            <div style={{
                position: 'fixed',
                bottom: '-20%',
                right: '10%',
                width: '40vw',
                height: '40vw',
                background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, rgba(0,0,0,0) 70%)',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>
        </div>
    );
}
