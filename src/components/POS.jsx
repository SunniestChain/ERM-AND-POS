import React, { useState, useEffect } from 'react';
import { api } from '../api';
import HierarchySelector from './HierarchySelector';
import SalesHistory from './SalesHistory';
import PaymentModal from './PaymentModal';
import ReceiptModal from './ReceiptModal';

const POSProductCard = ({ product, onAddToCart, refreshTrigger }) => {
    const [variants, setVariants] = useState([]);
    const [loadingVariants, setLoadingVariants] = useState(true);

    useEffect(() => {
        let mounted = true;
        api.getVariants(product.id)
            .then(data => {
                if (mounted) {
                    setVariants(data);
                    setLoadingVariants(false);
                }
            })
            .catch(() => mounted && setLoadingVariants(false));
        return () => mounted = false;
    }, [product.id, refreshTrigger]);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '1rem',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
        }}>
            {/* Left: Image (Square) */}
            <div style={{
                width: '100px',
                height: '100px',
                flexShrink: 0,
                borderRadius: '6px',
                overflow: 'hidden',
                background: '#222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        loading="lazy"
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{ color: '#555', fontSize: '0.8rem' }}>No Image</span>
                )}
            </div>

            {/* Right: Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {/* Part Number */}
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--primary-color)',
                    fontWeight: 700,
                    fontSize: '1.1rem'
                }}>
                    {product.part_number}
                </div>

                {/* Description/Name */}
                <div style={{
                    fontWeight: 500,
                    fontSize: '1rem',
                    marginBottom: '0.5rem',
                    lineHeight: '1.2'
                }}>
                    {product.name}
                </div>

                {/* Variants */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                    {loadingVariants ? (
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Loading options...</span>
                    ) : variants.length > 0 ? (
                        variants.map(v => (
                            <button key={v.id}
                                onClick={() => onAddToCart(product, v)}
                                style={{
                                    background: 'var(--primary-color)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.4rem 0.8rem',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'start',
                                    minWidth: '60px',
                                    transition: 'transform 0.1s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{v.supplierName}</span>
                                <span style={{ fontWeight: 700 }}>${v.price}</span>
                                <span style={{ fontSize: '0.65rem', color: v.stock_quantity > 0 ? '#4ade80' : '#ef4444' }}>
                                    {v.stock_quantity > 0 ? `${v.stock_quantity} in stock` : 'Out of Stock'}
                                </span>
                            </button>
                        ))
                    ) : (
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>No options available</span>
                    )}
                </div>
            </div>
        </div>
    );
};

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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentSaleId, setCurrentSaleId] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Forces re-fetch of stock

    // ... (UseEffect and Loaders same as original) ...
    // Stripe Return Logic
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);

        if (query.get('success')) {
            const pendingSale = localStorage.getItem('pending_pos_sale');
            if (pendingSale) {
                const saleData = JSON.parse(pendingSale);
                setLoading(true);
                api.createSale(saleData).then(result => {
                    if (result.success) {
                        setMessage(`Sale #${result.saleId} completed via Stripe!`);
                        setCart([]);
                        setCurrentSaleId(result.saleId);
                        setRefreshTrigger(prev => prev + 1);
                        localStorage.removeItem('pending_pos_sale');
                        localStorage.removeItem('pos_cart_backup');

                        // Clean URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }).catch(err => {
                    setMessage('Error finalizing Stripe sale: ' + err.message);
                }).finally(() => setLoading(false));
            }
        } else if (query.get('canceled')) {
            setMessage("Payment Canceled");
            const backupCart = localStorage.getItem('pos_cart_backup');
            if (backupCart) {
                setCart(JSON.parse(backupCart));
            }
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Stripe Return Logic
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);

        if (query.get('success')) {
            const pendingSale = localStorage.getItem('pending_pos_sale');
            if (pendingSale) {
                const saleData = JSON.parse(pendingSale);
                setLoading(true);
                api.createSale(saleData).then(result => {
                    if (result.success) {
                        setMessage(`Sale #${result.saleId} completed via Stripe!`);
                        setCart([]);
                        setCurrentSaleId(result.saleId);
                        setRefreshTrigger(prev => prev + 1);
                        localStorage.removeItem('pending_pos_sale');
                        localStorage.removeItem('pos_cart_backup');

                        // Clean URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }).catch(err => {
                    setMessage('Error finalizing Stripe sale: ' + err.message);
                }).finally(() => setLoading(false));
            }
        } else if (query.get('canceled')) {
            setMessage("Payment Canceled");
            const backupCart = localStorage.getItem('pos_cart_backup');
            if (backupCart) {
                setCart(JSON.parse(backupCart));
            }
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Fetch products when filters OR search change
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(true); // Show loading only for initial list fetch
            if (searchTerm) {
                if (engineId || categoryId) {
                    setEngineId('');
                    setCategoryId('');
                }
                api.getProducts(null, null, searchTerm).then(data => {
                    setProducts(data); // Render immediately without variants
                    setVisibleCount(20); // Reset visible count
                    setLoading(false);
                });
            } else if (engineId && categoryId) {
                api.getProducts(engineId, categoryId).then(data => {
                    setProducts(data);
                    setVisibleCount(20);
                    setLoading(false);
                });
            } else {
                // Default: Load all products
                api.getProducts().then(data => {
                    setProducts(data);
                    setVisibleCount(20);
                    setLoading(false);
                });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, engineId, categoryId]);

    // Lazy Loading State
    const [visibleCount, setVisibleCount] = useState(20);

    // Infinite Scroll Trigger
    useEffect(() => {
        const trigger = document.getElementById('scroll-trigger');
        if (!trigger) return;

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => prev + 20);
            }
        }, { threshold: 0.1 });

        observer.observe(trigger);
        return () => observer.disconnect();
    }, [products]);

    const addToCart = (product, variant) => {
        // Enforce Stock Limit
        // Improve robustness: treat undefined/null as 0
        const stock = parseInt(variant.stock_quantity) || 0;

        if (stock <= 0) {
            alert('Out of Stock');
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.variantId === variant.id);
            if (existing) {
                if (existing.quantity >= stock) {
                    alert(`Cannot add more. Only ${stock} in stock.`);
                    return prev;
                }
                return prev.map(item => item.variantId === variant.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                );
            }
            return [...prev, {
                variantId: variant.id,
                product,
                variant: { ...variant, stock_quantity: stock }, // Ensure normalized stock
                quantity: 1,
                unitPrice: variant.price // Initialize with default price
            }];
        });
    };

    const removeFromCart = (variantId) => {
        setCart(prev => prev.filter(item => item.variantId !== variantId));
    };

    const updateQuantity = (variantId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.variantId === variantId) {
                const stock = item.variant.stock_quantity;
                const newQty = item.quantity + delta;

                if (delta > 0 && newQty > stock) {
                    alert(`Cannot add more. Only ${stock} in stock.`);
                    return item;
                }
                return { ...item, quantity: Math.max(1, newQty) };
            }
            return item;
        }));
    };

    const updatePrice = (variantId, newPrice) => {
        setCart(prev => prev.map(item => {
            if (item.variantId === variantId) {
                return { ...item, unitPrice: parseFloat(newPrice) || 0 };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    const handleCheckoutButton = () => {
        if (cart.length === 0) return;
        setShowPaymentModal(true);
    };

    const handlePaymentConfirm = async (paymentData) => {
        // Stripe Redirect Flow
        if (paymentData.paymentMethod === 'Card') {
            setLoading(true);
            try {
                // 1. Prepare Sale Data
                const saleData = {
                    items: cart.map(item => ({
                        variantId: item.variantId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        productName: item.product.name,
                        supplierName: item.variant.supplierName
                    })),
                    ...paymentData
                };

                // 2. Save State for Return
                localStorage.setItem('pending_pos_sale', JSON.stringify(saleData));
                localStorage.setItem('pos_cart_backup', JSON.stringify(cart));

                // 3. Get Session URL
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: cartTotal })
                });
                const session = await response.json();

                if (session.url) {
                    window.location.href = session.url;
                } else {
                    alert("Error initiating payment");
                    setLoading(false);
                }
            } catch (err) {
                alert("Error: " + err.message);
                setLoading(false);
            }
            return;
        }

        // Manual Payment Flow (Cash, Transfer)
        setLoading(true);
        setShowPaymentModal(false);
        try {
            const saleData = {
                items: cart.map(item => ({
                    variantId: item.variantId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    productName: item.product.name,
                    supplierName: item.variant.supplierName
                })),
                ...paymentData
            };

            const result = await api.createSale(saleData);
            if (result.success) {
                setMessage(`Sale #${result.saleId} completed!`);
                setCart([]);
                setCurrentSaleId(result.saleId); // Trigger Receipt
                setRefreshTrigger(prev => prev + 1); // FORCE REFRESH OF STOCK

                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            setMessage('Error processing sale: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Mobile View State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
    const [mobileTab, setMobileTab] = useState('products'); // 'products' or 'cart'

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            height: 'calc(100vh - 100px)', // adjusted for margin
            gap: '1rem',
            padding: isMobile ? '0.5rem' : '1rem',
            position: 'relative'
        }}>
            {/* Mobile Tab Switcher */}
            {isMobile && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                    <button
                        onClick={() => setMobileTab('products')}
                        className="btn-primary"
                        style={{ flex: 1, background: mobileTab === 'products' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', border: 'none' }}
                    >
                        Browser
                    </button>
                    <button
                        onClick={() => setMobileTab('cart')}
                        className="btn-primary"
                        style={{ flex: 1, background: mobileTab === 'cart' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', border: 'none', position: 'relative' }}
                    >
                        Cart ({cart.reduce((a, c) => a + c.quantity, 0)})
                        {cart.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'red', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.8rem' }}>!</span>}
                    </button>
                </div>
            )}

            {/* LEFT PANEL: Product Browser (Hidden on mobile if tab is cart) */}
            <div className="glass-panel" style={{
                flex: 1,
                display: (!isMobile || mobileTab === 'products') ? 'flex' : 'none',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
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

                    {/* Only show hierarchy if not searching */}
                    <div style={{ opacity: searchTerm ? 0.5 : 1, pointerEvents: searchTerm ? 'none' : 'auto' }}>
                        <HierarchySelector
                            onSelectionChange={({ manufacturerId, engineId, categoryId }) => {
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
                            {loading ? 'Loading products...' : (searchTerm ? 'No products found.' : 'No products available.')}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {products.slice(0, visibleCount).map(p => (
                            <POSProductCard key={p.id} product={p} onAddToCart={(p, v) => {
                                addToCart(p, v);
                                if (isMobile) {
                                    setMessage("Added to Cart");
                                    setTimeout(() => setMessage(''), 1500);
                                }
                            }} refreshTrigger={refreshTrigger} />
                        ))}

                        {/* Scroll Trigger Element */}
                        {visibleCount < products.length && (
                            <div id="scroll-trigger" style={{ height: '20px', textAlign: 'center', opacity: 0.5 }}>
                                Loading more...
                            </div>
                        )}
                    </div>
                </div>

                {/* Float Message on Mobile */}
                {isMobile && message && (
                    <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', padding: '0.5rem 1rem', borderRadius: '20px', color: 'white' }}>{message}</div>
                )}
            </div>


            {/* RIGHT PANEL: Cart (Hidden on mobile if tab is products) */}
            <div className="glass-panel" style={{
                width: isMobile ? '100%' : '400px', // Responsive width
                display: (!isMobile || mobileTab === 'cart') ? 'flex' : 'none',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
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
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <span>{item.variant.supplierName} - $</span>
                                    <input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => updatePrice(item.variantId, e.target.value)}
                                        style={{
                                            width: '80px',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '4px',
                                            color: '#fff',
                                            padding: '0.1rem 0.3rem',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
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
                    {message && !isMobile && (
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
                        onClick={handleCheckoutButton}
                        disabled={loading || cart.length === 0}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'var(--danger-color)', // Red color as requested
                            color: '#fff',
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
            {showPaymentModal && (
                <PaymentModal
                    total={cartTotal}
                    onConfirm={handlePaymentConfirm}
                    onClose={() => setShowPaymentModal(false)}
                />
            )}
            {currentSaleId && <ReceiptModal saleId={currentSaleId} onClose={() => setCurrentSaleId(null)} />}
        </div>
    );
}
