import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
// Initialize Stripe
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

if (!stripeKey) {
    console.error("Stripe Publishable Key is missing. Card payments will be disabled.");
}

const CheckoutForm = ({ amount, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // If redirect is strictly required by payment method, it will go here.
                // But for cards, it often handles inline or 'if_required'.
                return_url: window.location.origin,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess(paymentIntent);
        } else {
            setMessage("Payment status: " + paymentIntent.status);
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            {message && <div style={{ color: 'red', marginTop: '1rem' }}>{message}</div>}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={onCancel} disabled={isProcessing} style={{ padding: '0.75rem', flex: 1, borderRadius: '6px', border: '1px solid #ccc' }}>Cancel</button>
                <button type="submit" disabled={isProcessing || !stripe || !elements} className="btn-primary" style={{ padding: '0.75rem', flex: 1 }}>
                    {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
                </button>
            </div>
        </form>
    );
};

const PaymentModal = ({ total, onConfirm, onClose, allowedMethods = ['Cash', 'Card', 'Transfer'] }) => {
    const [amountPaid, setAmountPaid] = useState('');
    // Default to first allowed method
    const [paymentMethod, setPaymentMethod] = useState(allowedMethods[0]);
    const [change, setChange] = useState(0);
    const [clientSecret, setClientSecret] = useState('');

    const API_URL = '/api';

    useEffect(() => {
        if (paymentMethod === 'Card') {
            fetch(`${API_URL}/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: total })
            })
                .then(res => {
                    if (!res.ok) throw new Error("API call failed");
                    return res.json();
                })
                .then(data => {
                    setClientSecret(data.clientSecret);
                })
                .catch(err => {
                    console.error("Error fetching payment intent:", err);
                });
        } else {
            setClientSecret('');
        }
    }, [paymentMethod, total]);

    useEffect(() => {
        if (paymentMethod !== 'Cash') {
            setAmountPaid(total.toFixed(2));
        }
    }, [paymentMethod, total]);

    useEffect(() => {
        const paid = parseFloat(amountPaid) || 0;
        setChange(paid - total);
    }, [amountPaid, total]);

    const handleConfirm = () => {
        const paid = parseFloat(amountPaid) || 0;
        if (paid < total - 0.01) {
            alert("Insufficient payment amount.");
            return;
        }

        onConfirm({
            paymentMethod,
            amountPaid: paid,
            change: Math.max(0, change)
        });
    };

    const quickCashOptions = [
        Math.ceil(total),
        Math.ceil(total / 50) * 50,
        Math.ceil(total / 100) * 100,
        Math.ceil(total / 500) * 500
    ].filter((v, i, self) => v >= total && self.indexOf(v) === i);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', color: '#fff' }}>
                    Complete Payment
                </h2>

                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Total Due</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', textShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}>
                        ${total.toFixed(2)}
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Payment Method</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {allowedMethods.map(method => (
                            <button
                                key={method}
                                onClick={() => setPaymentMethod(method)}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '6px',
                                    border: '1px solid ' + (paymentMethod === method ? 'var(--primary-color)' : 'var(--border-subtle)'),
                                    background: paymentMethod === method ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                                    color: '#fff',
                                    fontWeight: paymentMethod === method ? 600 : 400,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {method}
                            </button>
                        ))}
                    </div>
                </div>

                {paymentMethod === 'Card' && clientSecret && stripePromise ? (
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                        <CheckoutForm
                            amount={total}
                            onSuccess={(paymentIntent) => {
                                onConfirm({
                                    paymentMethod: 'Card',
                                    amountPaid: total,
                                    change: 0,
                                    transactionId: paymentIntent.id
                                });
                            }}
                            onCancel={() => setPaymentMethod(allowedMethods[0])} // Reset to first allowed
                        />
                    </Elements>
                ) : paymentMethod === 'Card' ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b6b' }}>
                        {stripePromise ? "Loading secure payment..." : "Stripe Configuration Missing (Check Console)"}
                    </div>
                ) : paymentMethod === 'Transfer' ? (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Please transfer the exact amount to:</p>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.5rem' }}>CLABE: 123456789012345678</div>
                        <div style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>Bank: BANCO DE MEXICO</div>
                        <p style={{ color: '#aaa', fontSize: '0.8rem' }}>Once transferred, click "Finish Sale" to record your order.</p>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'transparent',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="btn-primary"
                                style={{
                                    flex: 2,
                                    padding: '1rem',
                                    fontSize: '1.1rem',
                                    fontWeight: 700
                                }}
                            >
                                Finish Sale
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Amount Tendered</label>
                            <input
                                type="number"
                                value={amountPaid}
                                onChange={e => setAmountPaid(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1.5rem',
                                    textAlign: 'right',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '6px',
                                    color: '#fff'
                                }}
                            />

                            {/* Quick Cash Buttons */}
                            {paymentMethod === 'Cash' && quickCashOptions.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                    {quickCashOptions.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setAmountPaid(opt.toFixed(2))}
                                            style={{
                                                flex: 1,
                                                padding: '0.5rem',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            ${opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Change Due:</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: change < 0 ? '#ff6b6b' : '#4ade80' }}>
                                ${Math.max(0, change).toFixed(2)}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'transparent',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="btn-primary"
                                style={{
                                    flex: 2,
                                    padding: '1rem',
                                    fontSize: '1.1rem',
                                    fontWeight: 700
                                }}
                            >
                                Finish Sale
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;
