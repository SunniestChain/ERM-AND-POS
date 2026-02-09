import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Receipt from './Receipt';

const CustomerHistory = ({ user, onLogout }) => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            // Need to pass customer ID context.
            // frontend api.js wrapper doesn't support headers arg in getSales yet easily without mod, 
            // but we can addit. 
            // Actually, api.js getSales calls request('/sales').

            // I will use a direct fetch here to pass the header for now, or update api.js.
            // Since api.getSales is simple, I'll direct fetch.

            const API_URL = '/api';
            const res = await fetch(`${API_URL}/sales`, {
                headers: {
                    'x-customer-id': user.id
                }
            });
            if (res.ok) {
                const data = await res.json();
                setSales(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="customer-history" style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h1>Order History</h1>
                <div>
                    <button onClick={() => window.location.href = '/shop'} style={{ marginRight: '1rem' }}>Back to Shop</button>
                    <button onClick={onLogout}>Logout</button>
                </div>
            </header>

            {loading ? <p>Loading...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {sales.length === 0 ? <p>No orders found.</p> : sales.map(sale => (
                        <div key={sale.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>#{sale.id}</span>
                                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>{new Date(sale.created_at).toLocaleDateString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
                                <span style={{ color: '#ddd' }}>Items: {sale.items ? sale.items.length : 0}</span>
                                <span style={{ color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    ${sale.total_amount.toFixed(2)}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedSale(sale)}
                                className="btn-secondary"
                                style={{ marginTop: 'auto', width: '100%' }}
                            >
                                View Receipt
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedSale && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <button
                            onClick={() => setSelectedSale(null)}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                        <Receipt sale={selectedSale} onClose={() => setSelectedSale(null)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerHistory;
