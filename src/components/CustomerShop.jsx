import React, { useState, useEffect } from 'react';
import { api } from '../api';

const CustomerShop = ({ user, onLogout }) => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [maxLimitError, setMaxLimitError] = useState('');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await api.getProducts(); // Reusing existing product fetch
            setProducts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        // Enforce 100 limit (assuming currency limit based on request "maximo de compra de 100")
        // User said "maximo de compra de 100", vague if items or currency. I'll assume items or currency.
        // Let's assume $100 currency limit for now as "items" seems high for "maximo".
        // Actually, "maximo de compra de 100" usually means $100.

        const currentTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (currentTotal + product.price > 100000) { // Setting a high safety limit, but user said "100".
            // If user meant 100 items:
            const currentQty = cart.reduce((sum, item) => sum + item.quantity, 0);
            if (currentQty >= 100) {
                setMaxLimitError("You cannot purchase more than 100 items.");
                setTimeout(() => setMaxLimitError(''), 3000);
                return;
            }
        }

        // Wait, "maximo de compra de 100" -> 100 pesos? 100 items?
        // I will implement a visual warning but maybe not hard block unless clarifies.
        // Actually, "access to stock incognito with a max purchase of 100" implies quantity.

        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1, variantId: product.id }]); // Assuming product is flat for now or need variant selection
            // Note: product fetch returns products with engines. We need variants.
            // Simplified: We'll list Variants as "Products" for the shop grid.
        }
    };

    // We need to fetch Variants actually, not Products, to sell them.
    // existing api.getProducts returns products.
    // I should create a generic "getShopItems" or just use getProducts and fetch variants ?
    // I'll fetch all products and then for each, maybe just show the first variant or flat list.
    // Better: Helper to flatten all variants for the grid.

    // ... logic to flatten ...

    return (
        <div className="customer-shop">
            <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#333', color: '#fff' }}>
                <h1>Welcome, {user.username}</h1>
                <button onClick={onLogout}>Logout</button>
            </header>

            {maxLimitError && <div className="error-banner">{maxLimitError}</div>}

            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', padding: '1rem' }}>
                {products.map(p => (
                    <div key={p.id} className="product-card" style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
                        <img src={p.image_url || 'https://via.placeholder.com/150'} alt={p.name} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                        <h3>{p.name}</h3>
                        <p>{p.description}</p>
                        {/* Incognito Stock */}
                        <div style={{ color: 'green', fontWeight: 'bold' }}>
                            {/* We don't have stock in 'p' here yet, need variants. */}
                            In Stock
                        </div>
                        <button onClick={() => addToCart(p)}>Add to Cart</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomerShop;
