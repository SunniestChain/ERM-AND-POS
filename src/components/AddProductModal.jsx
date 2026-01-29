import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function AddProductModal({ preSelection, onClose }) {
    const [step, setStep] = useState(1);
    const [hierarchy, setHierarchy] = useState({ manufacturers: [], engines: [], categories: [] });

    const [formData, setFormData] = useState({
        manufacturerId: preSelection.manufacturerId || '',
        engineId: preSelection.engineId || '',
        categoryId: preSelection.categoryId || '',
        partNumber: '',
        name: '',
        description: '',
        notes: ''
    });

    useEffect(() => {
        api.getHierarchy().then(setHierarchy);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isValidStep1 = formData.manufacturerId && formData.engineId && formData.categoryId;

    const handleSubmit = async () => {
        try {
            await api.createProduct(formData);
            onClose();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }} onClick={onClose}>
            <div
                className="glass-panel"
                style={{ width: '600px', padding: '2rem', background: '#1a1b26' }}
                onClick={e => e.stopPropagation()}
            >
                <h2 style={{ marginBottom: '2rem' }}>Add New Product</h2>

                {/* Step 1: Context */}
                <div style={{ marginBottom: '2rem', opacity: step === 1 ? 1 : 0.5, pointerEvents: step === 1 ? 'auto' : 'none' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem' }}>1. Where does it belong?</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <select name="manufacturerId" value={formData.manufacturerId} onChange={handleChange} style={inputStyle}>
                            <option value="">Select Manufacturer</option>
                            {hierarchy.manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select name="engineId" value={formData.engineId} onChange={handleChange} style={inputStyle}>
                            <option value="">Select Engine</option>
                            {hierarchy.engines.filter(e => e.manufacturer_id == formData.manufacturerId).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <select name="categoryId" value={formData.categoryId} onChange={handleChange} style={inputStyle}>
                            <option value="">Select Category</option>
                            {hierarchy.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Step 2: Details */}
                {isValidStep1 && (
                    <div style={{ animation: 'fadeIn 0.5s' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem' }}>2. Product Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input name="partNumber" placeholder="Part Number" value={formData.partNumber} onChange={handleChange} style={inputStyle} />
                            <input name="name" placeholder="Product Name" value={formData.name} onChange={handleChange} style={inputStyle} />
                            <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} style={inputStyle} rows={3} />
                            <textarea name="notes" placeholder="Internal Notes" value={formData.notes} onChange={handleChange} style={inputStyle} rows={2} />
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={onClose} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>Cancel</button>
                            <button onClick={handleSubmit} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Create Product</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    color: 'white'
};
