import React, { useState, useEffect } from 'react';
import { api } from '../api';
import HierarchySelector from './HierarchySelector';
import SalesHistory from './SalesHistory';

export default function POS() {
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [engineId, setEngineId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [products, setProducts] = useState([]);

    // Cart State
    const [cart, setCart] = useState([]); // [{ variantId, product, variant, quantity }]

    // UI State
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Fetch products when filters OR search change
    useEffect(() => {
        // Debounce search slightly or just fetch
        const timer = setTimeout(() => {
            if (searchTerm) {
                // Clear hierarchy if searching
                if (engineId || categoryId) {
                    setEngineId('');
                    setCategoryId('');
                }
                api.getProducts(null, null, searchTerm).then(data => {
                    Promise.all(data.map(p => api.getVariants(p.id).then(v => ({ ...p, variants: v }))))
                        .then(setProducts);
                });
            } else if (engineId && categoryId) {
                api.getProducts(engineId, categoryId).then(data => {
                    Promise.all(data.map(p => api.getVariants(p.id).then(v => ({ ...p, variants: v }))))
                        .then(setProducts);
                });
            } else {
                setProducts([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, engineId, categoryId]);

    const addToCart = (product, variant) => {
        setCart(prev => {
            const existing = prev.find(item => item.variantId === variant.id);
            if (existing) {
                return prev.map(item => item.variantId === variant.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                );
            }
            return [...prev, {
                variantId: variant.id,
                product,
                variant,
                quantity: 1
            }];
        });
    };

    const removeFromCart = (variantId) => {
        setCart(prev => prev.filter(item => item.variantId !== variantId));
    };

    const updateQuantity = (variantId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.variantId === variantId) {
                const newQty = Math.max(1, item.quantity + delta);
                // Optional: Check stock limit here?
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const saleData = {
                items: cart.map(item => ({
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitPrice: item.variant.price,
                    productName: item.product.name,
                    supplierName: item.variant.supplierName
                }))
            };

            const result = await api.createSale(saleData);
            if (result.success) {
                setMessage(`Sale #${result.saleId} completed successfully!`);
                setCart([]);
                // Refresh products to show updated stock?
                // Trigger re-fetch
                if (engineId && categoryId) {
                    const data = await api.getProducts(engineId, categoryId);
                    const productsWithVariants = await Promise.all(data.map(p => api.getVariants(p.id).then(v => ({ ...p, variants: v }))));
                    setProducts(productsWithVariants);
                }
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            setMessage('Error processing sale: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '1rem', padding: '1rem' }}>
            {/* LEFT PANEL: Product Browser */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h2 style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', margin: 0 }}>Product Browser</h2>

                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Search Bar */}
                    <input
                        type="text"
                        placeholder="Search Everything..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontSize: '1rem'
                        }}
                    />

                    {/* Only show hierarchy if not searching (or let them coexist but search overrides) */}
                    <div style={{ opacity: searchTerm ? 0.5 : 1, pointerEvents: searchTerm ? 'none' : 'auto' }}>
                        <HierarchySelector
                            onSelectionChange={({ manufacturerId, engineId, categoryId }) => {
                                // Only update if not searching (or clear search if they click hierarchy?)
                                // Let's clear search if they explicitly interact with hierarchy
                                if (!searchTerm) {
                                    setEngineId(engineId);
                                    setCategoryId(categoryId);
                                }
                            }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {products.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                            {searchTerm ? 'No products found.' : 'Select Engine and Category to browse products.'}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {products.map(p => (
                            <div key={p.id} style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                padding: '1rem',
                                border: '1px solid var(--border-subtle)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>{p.part_number}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {p.variants && p.variants.map(v => (
                                        <button key={v.id}
                                            onClick={() => addToCart(p, v)}
                                            style={{
                                                background: 'var(--primary-color)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '0.5rem',
                                                cursor: 'pointer',
                                                color: '#fff',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                minWidth: '80px'
                                            }}
                                        >
                                            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{v.supplierName}</span>
                                            <span style={{ fontWeight: 700 }}>${v.price}</span>
                                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Stock: {v.stock_quantity}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* RIGHT PANEL: Cart */}
            <div className="glass-panel" style={{ width: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Current Ticket</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => setShowHistory(true)} style={{ background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>History</button>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>${cartTotal.toFixed(2)}</span>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {cart.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                            Cart is empty.
                        </div>
                    )}
                    {cart.map(item => (
                        <div key={item.variantId} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '0.75rem',
                            borderRadius: '8px'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.product.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.variant.supplierName} - ${item.variant.price}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => updateQuantity(item.variantId, -1)} style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                                <span style={{ width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.variantId, 1)} style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                                <button onClick={() => removeFromCart(item.variantId)} style={{ marginLeft: '0.5rem', color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                    {message && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '4px',
                            marginBottom: '1rem',
                            background: message.includes('Error') ? 'rgba(255, 107, 107, 0.2)' : 'rgba(81, 207, 102, 0.2)',
                            color: message.includes('Error') ? '#ff6b6b' : '#51cf66',
                            textAlign: 'center'
                        }}>
                            {message}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 700 }}>
                        <span>Total:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={loading || cart.length === 0}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'var(--accent-color)',
                            color: 'var(--bg-dark)',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: loading || cart.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: loading || cart.length === 0 ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Processing...' : 'Complete Sale'}
                    </button>
                </div>
            </div>

            {showHistory && <SalesHistory onClose={() => setShowHistory(false)} />}
        </div>
    );
}
