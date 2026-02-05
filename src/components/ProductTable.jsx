import React, { useState, useEffect } from 'react';
import { api } from '../api';

const ProductRow = ({ product, onEdit, onDelete }) => {
    const [variants, setVariants] = useState([]);

    useEffect(() => {
        let mounted = true;
        api.getVariants(product.id).then(data => {
            if (mounted) setVariants(data);
        });
        return () => mounted = false;
    }, [product.id]);

    return (
        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <td style={{ padding: '1rem' }}>
                {product.image_url ? (
                    <div style={{ width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', background: '#222', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        <img
                            src={product.image_url}
                            loading="lazy"
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none'; e.target.parentElement.style.background = 'rgba(255,255,255,0.05)'; }}
                        />
                    </div>
                ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)', opacity: 0.3 }}>📷</span>
                    </div>
                )}
            </td>
            <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)' }}>{product.part_number}</td>
            <td style={{ padding: '1rem', fontWeight: 600 }}>
                {product.name}
            </td>
            <td style={{ padding: '1rem', color: 'var(--text-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {product.description}
            </td>
            <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {variants.slice(0, 3).map(v => (
                        <span key={v.id} style={{
                            fontSize: '0.75rem',
                            background: 'rgba(255,255,255,0.1)',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            display: 'flex',
                            gap: '0.5rem'
                        }}>
                            <span style={{ opacity: 0.7 }}>{v.supplierName}</span>
                            <span style={{ fontWeight: 600 }}>${v.price}</span>
                        </span>
                    ))}
                    {variants.length > 3 && <span style={{ fontSize: '0.75rem', padding: '0.25rem' }}>+{variants.length - 3} more</span>}
                </div>
            </td>
            <td style={{ padding: '1rem', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => onEdit(product)}
                        className="btn-primary"
                        style={{ fontSize: '0.875rem' }}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => {
                            if (confirm(`Delete ${product.part_number} (${product.name})?`)) {
                                onDelete(product.id);
                            }
                        }}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--danger-color)',
                            color: 'var(--danger-color)',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                        }}
                        title="Delete Product"
                    >
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default function ProductTable({ products, onEdit, onDelete }) {
    if (!products || products.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No products found. Select a valid Engine and Category to view inventory.
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-highlight)' }}>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Image</th>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Part #</th>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Name</th>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Description</th>
                        <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Variants (Price)</th>
                        <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(product => (
                        <ProductRow key={product.id} product={product} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
