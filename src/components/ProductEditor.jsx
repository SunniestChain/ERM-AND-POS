import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function ProductEditor({ product, onClose }) {
    // Master state
    const [formData, setFormData] = useState({ ...product });

    // Variants state
    const [variants, setVariants] = useState([]);
    const [allSuppliers, setAllSuppliers] = useState([]);
    const [message, setMessage] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [newPrice, setNewPrice] = useState('0');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    useEffect(() => {
        api.getVariants(product.id).then(setVariants);
        api.getHierarchy().then(data => setAllSuppliers(data.suppliers));
    }, [product]);

    const handleMasterChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleVariantChange = (id, field, value) => {
        setVariants(prev => prev.map(v =>
            v.id === id ? { ...v, [field]: value } : v
        ));
    };

    const handleDeleteVariant = async (variantId) => {
        // Confirmation handled in UI
        try {
            await api.deleteVariant(variantId);
            setVariants(prev => prev.filter(v => v.id !== variantId));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleAddVariant = async () => {
        if (!selectedSupplierId) return;
        try {
            const res = await api.createVariant({
                productId: product.id,
                supplierId: selectedSupplierId,
                price: parseFloat(newPrice)
            });
            // Refresh variants to get full data (with supplier name etc)
            const updatedVariants = await api.getVariants(product.id);
            setVariants(updatedVariants);
            setSelectedSupplierId('');
            setNewPrice('0');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSave = async () => {
        setMessage('Saving...');
        try {
            // 1. Update Master Product
            await api.updateProduct(product.id, formData);

            // 2. Update All Variants
            // In a real app, promise.all or batch API
            await Promise.all(variants.map(v => api.updateVariant(v.id, v)));

            setMessage('Saved Successfully!');
            setTimeout(onClose, 500);
        } catch (err) {
            setMessage('Error: ' + err.message);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(5px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }} onClick={onClose}>
            <div
                className="glass-panel"
                style={{ width: '800px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: 'var(--bg-panel)' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Edit Product Definition</h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: '1.5rem' }}>&times;</button>
                </div>

                {message && <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'var(--primary-glow)', borderRadius: 'var(--radius-sm)' }}>{message}</div>}

                {/* Master Section */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                        Master Data <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Updates all Brands)</span>
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Name</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleMasterChange}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Part Number (Ref)</label>
                            <input
                                name="part_number"
                                value={formData.part_number}
                                onChange={handleMasterChange}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                            />
                        </div>
                    </div>

                    {/* Image URL Section */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Image URL</label>
                            <input
                                name="image_url"
                                value={formData.image_url || ''}
                                onChange={handleMasterChange}
                                placeholder="http://example.com/image.jpg"
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                            />
                        </div>
                        {formData.image_url && (
                            <div style={{ width: '100px', height: '100px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#000' }}>
                                <img src={formData.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                            </div>
                        )}
                    </div>


                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleMasterChange}
                            rows={3}
                            style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Quick Lookup Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes || ''}
                            onChange={handleMasterChange}
                            rows={2}
                            style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', resize: 'vertical' }}
                        />
                    </div>
                </div>

                {/* Brand Variants Section */}
                <div>
                    <h3 style={{ color: 'var(--accent)', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                        Brand Variants <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Specifics per brand)</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {variants.map(v => (
                            <div key={v.id} style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-sm)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr 0.8fr auto',
                                gap: '1rem',
                                alignItems: 'center'
                            }}>
                                <div style={{ fontWeight: 600 }}>{v.supplierName}</div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU</label>
                                    <input
                                        value={v.sku}
                                        onChange={(e) => handleVariantChange(v.id, 'sku', e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', background: 'transparent', borderBottom: '1px solid var(--border-subtle)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock</label>
                                    <input
                                        type="number"
                                        value={v.stock_quantity || 0}
                                        onChange={(e) => handleVariantChange(v.id, 'stock_quantity', e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', background: 'transparent', borderBottom: '1px solid var(--border-subtle)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bin</label>
                                    <input
                                        value={v.bin_location || ''}
                                        onChange={(e) => handleVariantChange(v.id, 'bin_location', e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', background: 'transparent', borderBottom: '1px solid var(--border-subtle)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price</label>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }}>$</span>
                                        <input
                                            type="number"
                                            value={v.price}
                                            onChange={(e) => handleVariantChange(v.id, 'price', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', background: 'transparent', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    {confirmDeleteId === v.id ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                handleDeleteVariant(v.id);
                                            }}
                                            style={{ color: '#ef4444', fontWeight: 'bold', padding: '0.5rem', cursor: 'pointer', background: 'transparent', border: 'none', fontSize: '0.8rem' }}
                                        >
                                            Confirm?
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setConfirmDeleteId(v.id);
                                                // Auto-reset confirmation after 3 seconds
                                                setTimeout(() => setConfirmDeleteId(null), 3000);
                                            }}
                                            style={{ color: '#fca5a5', padding: '0.5rem', cursor: 'pointer', opacity: 0.7, background: 'transparent', border: 'none' }}
                                            title="Remove Brand"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add New Brand Section */}
                        {allSuppliers.filter(s => !variants.find(v => v.supplier_id === s.id)).length > 0 && (
                            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px dashed var(--border-highlight)', borderRadius: 'var(--radius-sm)' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Add Missing Brand</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <select
                                        value={selectedSupplierId}
                                        onChange={e => setSelectedSupplierId(e.target.value)}
                                        style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}
                                    >
                                        <option value="">-- Select Brand --</option>
                                        {allSuppliers
                                            .filter(s => !variants.find(v => v.supplier_id === s.id))
                                            .map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))
                                        }
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={newPrice}
                                        onChange={e => setNewPrice(e.target.value)}
                                        style={{ width: '100px', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}
                                    />
                                    <button
                                        onClick={handleAddVariant}
                                        disabled={!selectedSupplierId}
                                        className="btn-primary"
                                        style={{ padding: '0.5rem 1rem', opacity: !selectedSupplierId ? 0.5 : 1 }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-highlight)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                        style={{ padding: '0.75rem 2rem', opacity: message === 'Saving...' ? 0.5 : 1 }}
                        disabled={message === 'Saving...'}
                    >
                        Save Changes
                    </button>
                </div>

            </div>
        </div >
    );
}
