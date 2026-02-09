import React, { useState, useEffect } from 'react';
import { api } from '../api';

const CustomerHistory = ({ user, onLogout }) => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

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

            const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sales.length === 0 ? <p>No orders found.</p> : sales.map(sale => (
                        <div key={sale.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>Date: {new Date(sale.created_at).toLocaleString()}</strong>
                                <span>Total: ${sale.total_amount.toFixed(2)}</span>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                                Order ID: #{sale.id}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerHistory;
