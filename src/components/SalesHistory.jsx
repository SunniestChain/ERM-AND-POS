import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function SalesHistory({ onClose }) {
    const [sales, setSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async () => {
        try {
            const data = await api.getSales();
            setSales(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load sales", error);
            setLoading(false);
        }
    };

    const handleSelectSale = async (sale) => {
        try {
            // Use getSale() from shared api to fetch details
            const details = await api.getSale(sale.id);
            setSelectedSale(details);
        } catch (error) {
            console.error("Failed to load sale details", error);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                width: '800px',
                height: '600px',
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Left: List */}
                <div style={{ width: '300px', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Recent Sales</h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? <div style={{ padding: '1rem' }}>Loading...</div> : sales.map(sale => (
                            <div
                                key={sale.id}
                                onClick={() => handleSelectSale(sale)}
                                style={{
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                    background: selectedSale?.id === sale.id ? 'var(--primary-glow)' : 'transparent',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Sale #{sale.id}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(sale.created_at).toLocaleString()}</div>
                                <div style={{ marginTop: '0.2rem', color: 'var(--accent)', fontWeight: 'bold' }}>${sale.total_amount.toFixed(2)}</div>
                            </div>
                        ))}
                        {!loading && sales.length === 0 && (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>No sales history found.</div>
                        )}
                    </div>
                </div>

                {/* Right: Details (Receipt) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', color: '#000' }}>
                    {selectedSale ? (
                        <>
                            <style>
                                {`
                                @media print {
                                    @page { margin: 0; }
                                    body * { visibility: hidden; }
                                    #printable-receipt, #printable-receipt * { visibility: visible; }
                                    #printable-receipt {
                                        position: fixed;
                                        left: 0;
                                        top: 0;
                                        width: 58mm; /* Optimized for 60mm Thermal Printers */
                                        font-size: 11px;
                                        padding: 2mm;
                                        margin: 0;
                                        background: white;
                                        color: black;
                                        font-family: monospace;
                                    }
                                    #printable-receipt h2 { font-size: 14px; margin-bottom: 5px; }
                                    #printable-receipt p { margin: 2px 0; }
                                    #printable-receipt table { width: 100%; font-size: 10px; }
                                    #printable-receipt td, #printable-receipt th { padding: 2px 0; }
                                    #printable-receipt .logo { max-width: 40mm; display: block; margin: 0 auto 5px auto; }
                                    .no-print { display: none !important; }
                                }
                                `}
                            </style>
                            <div id="printable-receipt" style={{ padding: '2rem', flex: 1, overflowY: 'auto', fontFamily: 'monospace' }}>
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    {/* Logo Support: Checks for file usage */}
                                    <img src="/logo.png" alt="Mayco Diesel" className="logo" style={{ maxWidth: '100px', marginBottom: '10px' }} onError={(e) => e.target.style.display = 'none'} />

                                    <h2 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.2rem' }}>Mayco Diesel</h2>
                                    <p style={{ fontSize: '0.9rem' }}>Precision Parts</p>
                                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                                    <p>Sale #{selectedSale.id}</p>
                                    <p>{new Date(selectedSale.created_at).toLocaleString()}</p>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px dashed #000' }}>
                                            <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Item</th>
                                            <th style={{ textAlign: 'center', padding: '0.5rem 0' }}>Qty</th>
                                            <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Price</th>
                                            <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSale.items && selectedSale.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '0.5rem 0' }}>
                                                    <div>{item.product_name}</div>
                                                    <div style={{ fontSize: '0.8em', color: '#666' }}>{item.supplier_name}</div>
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '0.5rem 0', verticalAlign: 'top' }}>{item.quantity}</td>
                                                <td style={{ textAlign: 'right', padding: '0.5rem 0', verticalAlign: 'top' }}>${item.unit_price.toFixed(2)}</td>
                                                <td style={{ textAlign: 'right', padding: '0.5rem 0', verticalAlign: 'top' }}>${item.subtotal.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div style={{ marginTop: '1rem', borderTop: '2px solid #000', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    <span>TOTAL</span>
                                    <span>${selectedSale.total_amount.toFixed(2)}</span>
                                </div>

                                <div style={{ marginTop: '2rem', textAlign: 'center', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                    Thank you!
                                </div>
                            </div>
                            <div className="no-print" style={{ padding: '1rem', borderTop: '1px solid #ccc', background: '#f5f5f5', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => window.print()} style={{ marginRight: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}>Print Receipt</button>
                                <button onClick={() => setSelectedSale(null)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', background: 'white', borderRadius: '4px' }}>Close Receipt</button>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', flexDirection: 'column' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
                            <div>Select a sale from the list</div>
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
