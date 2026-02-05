import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';

const SimpleList = ({ title, items, onDelete, onAdd }) => {
    const [newItem, setNewItem] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!newItem.trim()) return;
        setIsAdding(true);
        try {
            await onAdd(newItem);
            setNewItem('');
        } catch (err) {
            console.error(err);
            alert('Failed to add: ' + err.message);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', height: '100%' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>{title}</h3>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    placeholder={`New ${title}...`}
                    disabled={isAdding}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd();
                    }}
                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                />
                <button
                    onClick={handleAdd}
                    className="btn-primary"
                    disabled={isAdding}
                    style={{ padding: '0.5rem 1rem', opacity: isAdding ? 0.7 : 1 }}
                >
                    {isAdding ? '...' : 'Add'}
                </button>
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
            try {
                await api.deleteEntity(entity, id);
                refresh();
            } catch (err) {
                alert('Delete failed: ' + err.message);
            }
        }
    };

    const handleAdd = async (entity, name) => {
        // Generic add for Manuf/Cat/Supplier.
        // Engines are handled by their own specialized UI below.
        if (entity === 'engines') {
            return; // Should not be called via SimpleList for engines anymore
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

                {/* Inventory Actions */}
                <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Inventory Data</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                const baseUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';
                                window.location.href = `${baseUrl}/inventory/export`;
                            }}
                        >
                            ⬇ Export Massive CSV
                        </button>

                        <div style={{ position: 'relative' }}>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onload = async (evt) => {
                                        try {
                                            const text = evt.target.result;
                                            const response = await api.importInventory(text);

                                            // Show detailed feedback
                                            let msg = `Import Finish!\n\nUpdated: ${response.updatedCount} items`;
                                            if (response.errors && response.errors.length > 0) {
                                                msg += `\nErrors: ${response.errors.length}\n(First error: ${response.errors[0]})`;
                                            }
                                            alert(msg);

                                            refresh();
                                        } catch (err) {
                                            alert('Import failed: ' + err.message);
                                        }
                                        e.target.value = ''; // Reset input
                                    };
                                    reader.readAsText(file);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer'
                                }}
                            />
                            <button className="btn-primary">⬆ Upload Inventory CSV</button>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                            Supports: PartNumber, Supplier, Price, Stock, BinLocation
                        </span>
                    </div>
                </div>

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

                {/* Engines List with Add Functionality */}
                <div className="glass-panel" style={{ padding: '1.5rem', gridRow: 'span 2' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Engines</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Add New Engine</h4>
                        <select
                            id="new-engine-manuf"
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                        >
                            <option value="">Select Manufacturer...</option>
                            {data.manufacturers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                id="new-engine-name"
                                placeholder="Engine Name (e.g. 6.7L Cummins)"
                                style={{ flex: 1, padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                            />
                            <button
                                className="btn-primary"
                                onClick={async () => {
                                    const manufSelect = document.getElementById('new-engine-manuf');
                                    const nameInput = document.getElementById('new-engine-name');
                                    const manufId = manufSelect.value;
                                    const name = nameInput.value.trim();

                                    if (!manufId || !name) {
                                        alert('Please select a manufacturer and enter an engine name');
                                        return;
                                    }

                                    try {
                                        await api.createEntity('engines', { name, manufacturer_id: parseInt(manufId) });
                                        nameInput.value = '';
                                        refresh();
                                    } catch (err) {
                                        alert('Failed to add engine: ' + err.message);
                                    }
                                }}
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {data.engines.map(e => {
                            // Loose comparison matches both string "1" and number 1
                            const manuf = data.manufacturers.find(m => m.id == e.manufacturer_id);
                            return (
                                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{e.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{manuf ? manuf.name : 'Unknown Manuf'}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete('engines', e.id)}
                                        style={{
                                            color: 'var(--text-muted)',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            padding: '0.25rem'
                                        }}
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
