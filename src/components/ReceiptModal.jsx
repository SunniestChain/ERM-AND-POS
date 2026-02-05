import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ReceiptModal({ saleId, onClose }) {
    const [sale, setSale] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSale(saleId)
            .then(data => {
                setSale(data);
                setItems(data.items || []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [saleId]);

    const handlePrint = () => {
        window.print();
    };

    if (!saleId) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div style={{
                background: '#fff',
                color: '#000',
                padding: '2rem',
                width: '400px',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()} className="receipt-container">

                {/* Print Styles */}
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        .receipt-container, .receipt-container * { visibility: visible; }
                        .receipt-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; padding: 0; box-shadow: none; border: none; }
                        .no-print { display: none !important; }
                    }
                `}</style>

                {loading ? (
                    <div style={{ textAlign: 'center' }}>Loading Receipt...</div>
                ) : !sale ? (
                    <div style={{ textAlign: 'center', color: 'red' }}>Receipt Not Found</div>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px dashed #ccc', paddingBottom: '1rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>MAYCO DIESEL</h2>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#555' }}>Precision Parts</p>
                            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#777' }}>
                                {new Date(sale.created_at).toLocaleString()}
                            </div>
                            <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>Ticket #{sale.id}</div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            {items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#666' }}>
                                            {item.quantity} x {item.supplier_name} @ ${item.unit_price}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 600 }}>
                                        ${item.subtotal.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: '2px solid #000', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                            <span>TOTAL</span>
                            <span>${(sale.total_amount || 0).toFixed(2)}</span>
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'center' }} className="no-print">
                            <button onClick={handlePrint} style={{
                                background: '#333',
                                color: '#fff',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '4px',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                marginRight: '1rem',
                                fontWeight: 600
                            }}>
                                Print
                            </button>
                            <button onClick={onClose} style={{
                                background: 'transparent',
                                border: '1px solid #ccc',
                                color: '#333',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '4px',
                                fontSize: '1rem',
                                cursor: 'pointer'
                            }}>
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
