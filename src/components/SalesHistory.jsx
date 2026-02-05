import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Receipt from './Receipt';

export default function SalesHistory({ onClose }) {
    const [sales, setSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async () => {
        try {
            const data = await api.getSales();
            setSales(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load sales", error);
            setLoading(false);
        }
    };

    const handleSelectSale = async (sale) => {
        try {
            // Use getSale() from shared api to fetch details
            const details = await api.getSale(sale.id);
            setSelectedSale(details);
        } catch (error) {
            console.error("Failed to load sale details", error);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                width: '800px',
                height: '600px',
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Left: List */}
                <div style={{ width: '300px', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Recent Sales</h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? <div style={{ padding: '1rem' }}>Loading...</div> : sales.map(sale => (
                            <div
                                key={sale.id}
                                onClick={() => handleSelectSale(sale)}
                                style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                    background: selectedSale?.id === sale.id ? 'var(--primary-glow)' : 'transparent',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Sale #{sale.id}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(sale.created_at).toLocaleString()}</div>
                                <div style={{ marginTop: '0.2rem', color: 'var(--accent)', fontWeight: 'bold' }}>${sale.total_amount.toFixed(2)}</div>
                            </div>
                        ))}
                        {!loading && sales.length === 0 && (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>No sales history found.</div>
                        )}
                    </div>
                </div>

                {/* Right: Details (Receipt) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', color: '#000', overflow: 'hidden' }}>
                    {selectedSale ? (
                        <Receipt sale={selectedSale} onClose={() => setSelectedSale(null)} />
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', flexDirection: 'column' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
                            <div>Select a sale from the list</div>
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
