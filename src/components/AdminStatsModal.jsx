import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminStatsModal({ onClose }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.getAdminStats()
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const formatCurrency = (val) => {
        return '$' + (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatNumber = (val) => {
        return (val || 0).toLocaleString();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                background: '#1a1a1a',
                border: '1px solid var(--border-highlight)',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '900px',
                padding: '1.25rem',
                position: 'relative',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }} onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Admin Statistics
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}>✕</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading statistics...</div>
                ) : error ? (
                    <div style={{ color: 'var(--danger-color)', textAlign: 'center', padding: '2rem' }}>Error: {error}</div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {/* 1. Total Stock Quantity */}
                        <StatBox title="Total Variants in Stock" value={formatNumber(stats.totalStock)} isCurrency={false} />

                        {/* 2. Total Inventory Value */}
                        <StatBox title="Total Inventory Value" value={formatCurrency(stats.totalValue)} highlight />

                        {/* 3. Sales Today */}
                        <StatBox title="Sales Today" value={formatCurrency(stats.salesToday)} />

                        {/* 4. Sales Week */}
                        <StatBox title="Sales This Week" value={formatCurrency(stats.salesWeek)} />

                        {/* 5. Sales Month */}
                        <StatBox title="Sales This Month" value={formatCurrency(stats.salesMonth)} />

                        {/* 6. Sales Year */}
                        <StatBox title="Sales This Year" value={formatCurrency(stats.salesYear)} />
                    </div>
                )}
            </div>
        </div>
    );
}

const StatBox = ({ title, value, highlight, isCurrency = true }) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        padding: '1.5rem',
        border: highlight ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {title}
        </div>
        <div style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: highlight ? 'var(--accent-primary)' : '#fff',
            fontFamily: isCurrency ? 'var(--font-primary)' : 'var(--font-mono)'
        }}>
            {value}
        </div>
    </div>
);
