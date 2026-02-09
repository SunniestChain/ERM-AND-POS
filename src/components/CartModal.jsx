import React from 'react';

const CartModal = ({ cart, onClose, onRemove, onAdd, onCheckout }) => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                width: '500px',
                maxWidth: '90%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, color: '#fff' }}>Your Cart</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
                    {cart.length === 0 ? (
                        <p style={{ color: '#aaa', textAlign: 'center' }}>Your cart is empty.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {cart.map((item, idx) => (
                                <div key={`${item.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{item.productName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#ccc' }}>{item.variantName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#aaa' }}>${item.price.toFixed(2)} x {item.quantity}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ fontWeight: 'bold' }}>${(item.price * item.quantity).toFixed(2)}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => onRemove(item)}
                                                style={{ background: '#ff6b6b', border: 'none', borderRadius: '4px', color: '#fff', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                -
                                            </button>
                                            <button
                                                onClick={() => onAdd(item)}
                                                style={{ background: '#51cf66', border: 'none', borderRadius: '4px', color: '#fff', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                        <span>Total:</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={onCheckout}
                        disabled={cart.length === 0}
                        className="btn-primary"
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem', opacity: cart.length === 0 ? 0.5 : 1 }}
                    >
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartModal;
