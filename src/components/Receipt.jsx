import React, { useEffect } from 'react';

export default function Receipt({ sale, onClose }) {
    if (!sale) return null;

    return (
        <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto', fontFamily: 'monospace', background: 'white', color: 'black' }}>
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
                        overflow: visible;
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
            <div id="printable-receipt">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    {/* Logo Support: Checks for file usage */}
                    <img src="/logo.png" alt="Mayco Diesel" className="logo" style={{ maxWidth: '100px', marginBottom: '10px' }} onError={(e) => e.target.style.display = 'none'} />

                    <h2 style={{ margin: 0, textTransform: 'uppercase', fontSize: '1.2rem' }}>Mayco Diesel</h2>
                    <p style={{ fontSize: '0.9rem' }}>Precision Parts</p>
                    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                    <p>Sale #{sale.id}</p>
                    <p>{new Date(sale.created_at).toLocaleString()}</p>
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
                        {sale.items && sale.items.map((item, idx) => (
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
                    <span>${sale.total_amount.toFixed(2)}</span>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    Thank you!
                </div>
            </div>
            <div className="no-print" style={{ padding: '1rem', borderTop: '1px solid #ccc', background: '#f5f5f5', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={() => window.print()} style={{ marginRight: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}>Print Receipt</button>
                {onClose && (
                    <button onClick={onClose} style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', background: 'white', borderRadius: '4px' }}>Close Receipt</button>
                )}
            </div>
        </div>
    );
}
