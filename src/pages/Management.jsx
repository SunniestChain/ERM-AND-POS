import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';

const SimpleList = ({ title, items, onDelete, onAdd }) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if (!newItem.trim()) return;
        onAdd(newItem);
        setNewItem('');
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', height: '100%' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>{title}</h3>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    placeholder={`New ${title}...`}
                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}
                />
                <button onClick={handleAdd} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Add</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                        <span>{item.name}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item.id);
                            }}
                            style={{
                                color: 'var(--text-muted)',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                lineHeight: 1
                            }}
                            title="Delete"
                            onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function Management() {
    const [data, setData] = useState({ manufacturers: [], engines: [], categories: [], suppliers: [] });
    const [loading, setLoading] = useState(true);

    const refresh = () => {
        api.getHierarchy().then(d => {
            setData(d);
            setLoading(false);
        });
    };

    useEffect(() => {
        refresh();
    }, []);

    const handleDelete = async (entity, id) => {
        if (confirm('Are you sure? This might break linked data!')) {
            await api.deleteEntity(entity, id);
            refresh();
        }
    };

    const handleAdd = async (entity, name) => {
        // Ideally we need more data for engines (manufacturer link), but for now assuming simple flat add or generic
        // Special handling for Engine which needs Manuf ID.
        // Simplifying for this MVP: Just generic add for Manuf/Cat/Supplier.
        // For Engine, we might need a specific handler.
        if (entity === 'engines') {
            alert('Please use the Database Seed or a more complex UI for linking Engines to Manufacturers currently.');
            return;
        }

        await api.createEntity(entity, { name });
        refresh();
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to Dashboard</Link>
                <h2 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 700 }}>Management Console</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <SimpleList
                    title="Manufacturers"
                    items={data.manufacturers}
                    onAdd={name => handleAdd('manufacturers', name)}
                    onDelete={id => handleDelete('manufacturers', id)}
                />

                {/* Suppliers - The "10 shared brands" */}
                <SimpleList
                    title="Suppliers"
                    items={data.suppliers}
                    onAdd={name => handleAdd('suppliers', name)}
                    onDelete={id => handleDelete('suppliers', id)}
                />

                <SimpleList
                    title="Categories"
                    items={data.categories}
                    onAdd={name => handleAdd('categories', name)}
                    onDelete={id => handleDelete('categories', id)}
                />

                {/* Engines List (Read Only for now or simple delete) */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Engines (View Only)</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {data.engines.map(e => (
                            <div key={e.id} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                                {e.name} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Manuf: {e.manufacturer_id})</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
