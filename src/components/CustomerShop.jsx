import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import CartModal from './CartModal';
import PaymentModal from './PaymentModal';
import HierarchySelector from './HierarchySelector';
import Receipt from './Receipt';

const ShopProductCard = ({ product, onAddToCart }) => {
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addedId, setAddedId] = useState(null);

    useEffect(() => {
        let mounted = true;
        api.getVariants(product.id).then(data => {
            if (mounted) {
                setVariants(data);
                setLoading(false);
            }
        });
        return () => mounted = false;
    }, [product.id]);

    const handleAdd = (product, v) => {
        onAddToCart(product, v);
        setAddedId(v.id);
        setTimeout(() => setAddedId(null), 800);
    };

    return (
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ height: '150px', background: '#222', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ color: '#555' }}>No Image</span>
                )}
            </div>
            <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>{product.name}</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>{product.description}</p>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Available Options</div>
                {loading ? <span style={{ color: '#666' }}>Loading options...</span> :
                    variants.length === 0 ? <span style={{ color: '#ff6b6b' }}>Out of Stock</span> :
                        variants.map(v => (
                            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{v.sku || v.part_number}</div>
                                    <div style={{
                                        display: 'inline-block',
                                        background: '#e03131',
                                        color: 'white',
                                        padding: '0.1rem 0.5rem',
                                        borderRadius: '12px',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        marginBottom: '0.2rem'
                                    }}>
                                        {v.supplierName}
                                    </div>
                                    {/* Incognito Stock: If >= 3 show "In Stock", else "Out of Stock" (Reserved for POS) */}
                                    <div style={{ fontSize: '0.8rem', color: v.stock_quantity >= 3 ? '#51cf66' : '#ff6b6b' }}>
                                        {v.stock_quantity >= 3 ? 'In Stock' : 'Out of Stock'}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#ddd' }}>
                                        ${v.price ? v.price.toFixed(2) : '0.00'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAdd(product, v)}
                                    disabled={v.stock_quantity < 3}
                                    style={{
                                        background: addedId === v.id ? '#22c55e' : (v.stock_quantity >= 3 ? 'var(--primary-color)' : '#444'),
                                        cursor: v.stock_quantity >= 3 ? 'pointer' : 'not-allowed',
                                        border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', color: '#fff',
                                        fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        transition: 'all 0.2s ease',
                                        transform: addedId === v.id ? 'scale(1.15)' : 'scale(1)',
                                        boxShadow: addedId === v.id ? '0 0 12px rgba(34,197,94,0.5)' : 'none',
                                        minWidth: '70px', justifyContent: 'center'
                                    }}
                                >
                                    {addedId === v.id ? (
                                        <span style={{ fontSize: '1.2rem' }}>✓</span>
                                    ) : (
                                        <>
                                            <span>Add</span>
                                            <span style={{ fontSize: '1.2rem' }}>+</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
            </div>
        </div>
    );
};

const CustomerShop = ({ user, onLogout }) => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);

    const loadCart = async () => {
        try {
            const data = await api.getCart(user.id);
            setCart(data);
        } catch (e) {
            console.error("Failed to load cart", e);
        }
    };

    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false);
    const [cartToast, setCartToast] = useState(null);
    const [cartBounce, setCartBounce] = useState(false);
    const toastTimeout = useRef(null);

    useEffect(() => {
        loadCart();
    }, [user.id]);

    const [maxLimitError, setMaxLimitError] = useState('');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [engineId, setEngineId] = useState('');
    const [categoryId, setCategoryId] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, engineId, categoryId]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            let data;
            if (searchTerm) {
                // If searching, clear filters physically? POS logic clears them.
                // But let's follow POS logic:
                // if (searchTerm) { if(eng||cat) reset... } - simplified here just precedence
                data = await api.getProducts(null, null, searchTerm);
            } else if (engineId || categoryId) {
                // Fetch filtered
                data = await api.getProducts(engineId, categoryId);
            } else {
                // Load all
                data = await api.getProducts();
            }
            setProducts(data || []);
        } catch (e) {
            console.error(e);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (product, variant) => {
        const currentQty = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (currentQty >= 100) {
            setMaxLimitError("Limit reached: You cannot purchase more than 100 items.");
            setTimeout(() => setMaxLimitError(''), 3000);
            return;
        }

        try {
            await api.addToCart(user.id, variant.id, 1);
            loadCart();

            // Show toast notification
            if (toastTimeout.current) clearTimeout(toastTimeout.current);
            setCartToast({ name: product.name, sku: variant.sku || variant.part_number });
            setCartBounce(true);
            toastTimeout.current = setTimeout(() => {
                setCartToast(null);
                setCartBounce(false);
            }, 2000);
        } catch (e) {
            setMaxLimitError(e.message || "Failed to add to cart");
            setTimeout(() => setMaxLimitError(''), 3000);
        }
    };

    const removeFromCart = async (item) => {
        try {
            // If quantity > 1, remove 1. If 1, remove all?
            // The API handles p_quantity.
            // My previous logic was: remove 1 if > 1, else filter out.
            // Let's mirror that.

            // Wait, UI interaction needs to be snappy.
            // But we are releasing stock, so async is better.

            await api.removeFromCart(user.id, item.variantId, 1);
            loadCart();
        } catch (e) {
            alert("Error removing item: " + e.message);
        }
    };

    const increaseQuantity = async (item) => {
        try {
            await api.addToCart(user.id, item.variantId, 1);
            loadCart();
        } catch (e) {
            setMaxLimitError(e.message || "Insufficient Stock");
            setTimeout(() => setMaxLimitError(''), 3000);
        }
    };

    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Infinite Scroll
    const [visibleCount, setVisibleCount] = useState(20);

    // Reset when products change
    useEffect(() => {
        setVisibleCount(20);
    }, [products]); // Or on meaningful filter change

    // Intersection Observer for scroll trigger
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                // Load more
                setVisibleCount(prev => prev + 20);
            }
        }, { threshold: 0.1 });

        const trigger = document.getElementById('shop-scroll-trigger');
        if (trigger) observer.observe(trigger);

        return () => {
            if (trigger) observer.unobserve(trigger);
        };
    }, [products, visibleCount]);

    const [clientSecret, setClientSecret] = useState('');
    const [pendingTicket, setPendingTicket] = useState('');

    const handleCheckout = async () => {
        // Validate stock one last time (refresh cart)
        await loadCart();

        // Strict Mode protection
        if (cart.length === 0) return;

        // Generate a ticket number for this checkout
        const ticket = `WEB-${Date.now().toString(36).toUpperCase()}`;
        setPendingTicket(ticket);

        // Pre-fetch Stripe Intent for Card payments
        if (cartTotal > 0) {
            try {
                const API_URL = '/api';
                const token = localStorage.getItem('app_token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(`${API_URL}/create-payment-intent`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ amount: cartTotal, ticketNumber: ticket })
                });
                if (res.ok) {
                    const data = await res.json();
                    setClientSecret(data.clientSecret);
                } else {
                    console.error("Failed to create payment intent");
                }
            } catch (e) {
                console.error("Error creating payment intent:", e);
            }
        }
        setShowCart(false);
        setShowPaymentModal(true);
    };

    const [showReceipt, setShowReceipt] = useState(false);
    const [currentSale, setCurrentSale] = useState(null);
    const [currentSaleItems, setCurrentSaleItems] = useState([]);

    const handlePaymentConfirm = async (paymentData) => {
        try {
            const API_URL = '/api';
            const token = localStorage.getItem('app_token');
            const saleHeaders = { 'Content-Type': 'application/json' };
            if (token) saleHeaders['Authorization'] = `Bearer ${token}`;

            const saleItems = cart.map(item => ({
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: item.price,
                productName: item.productName,
                supplierName: 'Online',
            }));

            const res = await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: saleHeaders,
                body: JSON.stringify({
                    customerId: user.id,
                    items: saleItems,
                    ...paymentData,
                    fromCart: true // Crucial: Tells backend stock is already reserved
                })
            });

            if (res.ok) {
                const saleData = await res.json();
                // Construct logic for Receipt display
                setCurrentSale({
                    id: saleData.saleId || 'NEW',
                    created_at: new Date().toISOString(),
                    total_amount: cartTotal,
                    payment_method: paymentData.paymentMethod,
                    amount_paid: paymentData.amountPaid,
                    change: paymentData.change,
                    customer: { name: user.username || 'Customer' },
                    items: saleItems.map(item => ({
                        product_name: item.productName,
                        supplier_name: item.supplierName,
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                        subtotal: item.quantity * item.unitPrice
                    }))
                });

                setCart([]);
                setShowPaymentModal(false);
                setShowReceipt(true);
            } else {
                const err = await res.json();
                alert("Order failed: " + err.error);
                setShowPaymentModal(false);
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div style={{ padding: '2rem', height: '100vh', overflowY: 'auto', background: 'var(--bg-app)' }}>
            {/* Cart Animation Styles */}
            <style>{`
                @keyframes cartBounce {
                    0%, 100% { transform: scale(1); }
                    30% { transform: scale(1.4); }
                    60% { transform: scale(0.9); }
                    80% { transform: scale(1.1); }
                }
                @keyframes toastSlideIn {
                    0% { transform: translateX(120%); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                @keyframes toastSlideOut {
                    0% { transform: translateX(0); opacity: 1; }
                    100% { transform: translateX(120%); opacity: 0; }
                }
                .cart-badge-bounce { animation: cartBounce 0.5s ease; }
                .cart-toast {
                    animation: toastSlideIn 0.3s ease forwards;
                }
            `}</style>

            {/* Toast Notification */}
            {cartToast && (
                <div className="cart-toast" style={{
                    position: 'fixed',
                    top: '1.5rem',
                    right: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(74,222,128,0.95), rgba(34,197,94,0.95))',
                    color: '#fff',
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 8px 32px rgba(74,222,128,0.3)',
                    backdropFilter: 'blur(10px)',
                    maxWidth: '350px'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>✓</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Added to cart!</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{cartToast.name} — {cartToast.sku}</div>
                    </div>
                </div>
            )}
            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2rem' }}>Welcome, {user.username}</h1>
                        <p style={{ margin: 0, color: '#888' }}>Browse our catalog</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            placeholder="Search parts (SKU, Name)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-panel)',
                                color: 'var(--text-primary)',
                                width: '300px'
                            }}
                        />
                        <button onClick={() => window.location.href = '/history'} className="btn-secondary">My Orders</button>
                        <button
                            onClick={() => setShowCart(true)}
                            className="btn-primary"
                            style={{ position: 'relative' }}
                        >
                            View Cart
                            {cart.length > 0 && (
                                <span className={cartBounce ? 'cart-badge-bounce' : ''} style={{
                                    position: 'absolute', top: '-10px', right: '-10px',
                                    background: '#ff6b6b', color: 'white', borderRadius: '50%',
                                    width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'
                                }}>
                                    {cart.reduce((s, i) => s + i.quantity, 0)}
                                </span>
                            )}
                        </button>
                        <button onClick={onLogout} className="btn-secondary">Logout</button>
                    </div>
                </div>

                <HierarchySelector
                    onSelectionChange={({ manufacturerId, engineId, categoryId }) => {
                        // If user selects from dropdowns, clear search?
                        // POS logic doesn't explicitly clear on select but prioritizes search if present.
                        // I will keep logic simple.
                        if (!searchTerm) {
                            setEngineId(engineId);
                            setCategoryId(categoryId);
                        }
                    }}
                />
            </header>

            {maxLimitError && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    background: '#ff6b6b', color: 'white', padding: '1rem', borderRadius: '8px', zIndex: 2000
                }}>
                    {maxLimitError}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>Loading products...</div>
            ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>No products found. Try adjusting filters.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {products.slice(0, visibleCount).map(p => (
                        <ShopProductCard key={p.id} product={p} onAddToCart={addToCart} />
                    ))}
                    {/* Trigger for infinite scroll */}
                    {visibleCount < products.length && (
                        <div id="shop-scroll-trigger" style={{ height: '50px', gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>
                            Loading more...
                        </div>
                    )}
                </div>
            )}

            {showCart && (
                <CartModal
                    cart={cart}
                    onClose={() => setShowCart(false)}
                    onRemove={removeFromCart}
                    onAdd={increaseQuantity}
                    onCheckout={handleCheckout}
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    total={cartTotal}
                    onConfirm={handlePaymentConfirm}
                    onClose={() => setShowPaymentModal(false)}
                    allowedMethods={['Card', 'Transfer']}
                    clientSecretProp={clientSecret}
                    ticketNumber={pendingTicket}
                />
            )}

            {showReceipt && currentSale && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <button
                            onClick={() => setShowReceipt(false)}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                        >
                            ✕
                        </button>
                        <Receipt sale={currentSale} onClose={() => setShowReceipt(false)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerShop;
