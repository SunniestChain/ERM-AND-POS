import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import AdminStatsModal from './AdminStatsModal';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
    const location = useLocation();
    const [showStats, setShowStats] = useState(false);
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getLinkStyle = (path) => ({
        color: location.pathname === path ? 'var(--accent-primary)' : 'var(--text-primary)',
        textDecoration: 'none',
        fontWeight: 500,
        padding: isMobile ? '1rem 0' : '0',
        borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none',
        display: 'block'
    });

    const NavContent = () => (
        <>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0' : '2rem', alignItems: isMobile ? 'stretch' : 'center', width: isMobile ? '100%' : 'auto' }}>
                {user?.role === 'admin' && (
                    <>
                        <Link to="/" style={getLinkStyle('/')} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                        <Link to="/management" style={getLinkStyle('/management')} onClick={() => setIsMobileMenuOpen(false)}>Management</Link>
                    </>
                )}
                <Link to="/pos" style={getLinkStyle('/pos')} onClick={() => setIsMobileMenuOpen(false)}>POS</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: isMobile ? 'stretch' : 'center', marginTop: isMobile ? '1rem' : '0' }}>
                {user?.role === 'admin' && (
                    <button className="btn-primary" onClick={() => { setShowStats(true); setIsMobileMenuOpen(false); }} style={{ background: 'var(--accent-primary)', border: 'none' }}>
                        Admin
                    </button>
                )}
                <button onClick={logout} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-highlight)' }}>
                    Logout
                </button>
            </div>
        </>
    );

    return (
        <div className="layout-container">
            <nav className="glass-panel" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: isMobileMenuOpen ? 'auto' : '70px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                padding: '0 2rem',
                transition: 'height 0.3s ease',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src="/logo.png" alt="ERM Inventory" style={{ height: '45px', objectFit: 'contain' }} />
                    </div>

                    {isMobile ? (
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>
                            {isMobileMenuOpen ? '✕' : '☰'}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1, justifyContent: 'flex-end' }}>
                            <NavContent />
                        </div>
                    )}
                </div>

                {/* Mobile Dropdown */}
                {isMobile && isMobileMenuOpen && (
                    <div style={{ padding: '0 0 1rem 0', display: 'flex', flexDirection: 'column' }}>
                        <NavContent />
                    </div>
                )}
            </nav>

            <main style={{
                marginTop: '90px',
                padding: isMobile ? '0 1rem' : '0 2rem', // Responsive padding
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
