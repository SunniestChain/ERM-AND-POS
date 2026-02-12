import React, { useState, useEffect } from 'react';
import { api } from '../api';

const ActiveCarts = () => {
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCarts();
    }, []);

    const loadCarts = async () => {
        setLoading(true);
        try {
            const data = await api.getAdminActiveCarts();
            // Expected data: [{ user: {id, username, email}, items: [...], totalItems: N, lastActive: Date }]
            setCarts(data);
        } catch (e) {
            console.error("Failed to load active carts", e);
        } finally {
            setLoading(false);
        }
    };

    const handleClearCart = async (userId) => {
        if (!window.confirm("Are you sure? This will remove all items from this user's cart and RESTORE the stock immediately to availability.")) return;

        try {
            await api.clearCart(userId);
            alert("Cart cleared and stock restored.");
            loadCarts(); // Refresh list
        } catch (e) {
            alert("Failed to clear cart: " + e.message);
        }
    };

    if (loading) return <div style={{ color: '#aaa', padding: '1rem' }}>Loading active carts...</div>;

    return (
        <div style={{ padding: '1rem', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Active Shopping Carts (Reserved Stock)</h2>
                <button onClick={loadCarts} className="btn-secondary">Refresh</button>
            </div>

            {carts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <p style={{ color: '#aaa', margin: 0 }}>No active carts found. All stock is available.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                    {carts.map((cart, index) => (
                        <div key={index} style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>{cart.user?.username || 'Unknown User'}</h3>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{cart.user?.email}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ background: '#e03131', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {cart.totalItems} Items Reserved
                                    </span>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>
                                Last Active: {cart.lastActive ? new Date(cart.lastActive).toLocaleString() : 'N/A'}
                            </div>

                            <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '0.5rem', marginBottom: '1rem' }}>
                                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        {cart.items.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                                                <td style={{ padding: '0.2rem', color: '#aaa' }}>{item.qty}x</td>
                                                <td style={{ padding: '0.2rem', color: '#ddd' }}>{item.product}</td>
                                                <td style={{ padding: '0.2rem', color: '#888', textAlign: 'right' }}>{item.sku}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={() => handleClearCart(cart.user?.id)}
                                style={{ width: '100%', padding: '0.5rem', background: '#333', color: '#ff6b6b', border: '1px solid #ff6b6b', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Force Release Stock
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActiveCarts;
