import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function HierarchySelector({ onSelectionChange }) {
    const [hierarchy, setHierarchy] = useState({ manufacturers: [], engines: [], categories: [] });
    const [selectedManuf, setSelectedManuf] = useState('');
    const [selectedEngine, setSelectedEngine] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        api.getHierarchy().then(setHierarchy).catch(console.error);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter engines based on selected manufacturer (robust comparison)
    const availableEngines = hierarchy.engines.filter(e => e.manufacturer_id == selectedManuf);

    useEffect(() => {
        // Notify parent of changes
        onSelectionChange({
            manufacturerId: selectedManuf,
            engineId: selectedEngine,
            categoryId: selectedCategory
        });
    }, [selectedManuf, selectedEngine, selectedCategory]);

    const containerStyle = isMobile ? {
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    } : {
        padding: '1.25rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr auto 1fr',
        gap: '1.5rem',
        alignItems: 'center'
    };

    const Arrow = () => (
        <div style={{
            color: 'var(--text-muted)',
            paddingTop: isMobile ? '0' : '1.2rem',
            textAlign: 'center',
            fontSize: isMobile ? '1.2rem' : '1rem'
        }}>
            {isMobile ? '↓' : '➔'}
        </div>
    );

    return (
        <div className="glass-panel" style={containerStyle}>

            {/* 1. Manufacturer */}
            <div style={{ width: '100%' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>MANUFACTURER</label>
                <select
                    value={selectedManuf}
                    onChange={(e) => {
                        setSelectedManuf(e.target.value);
                        setSelectedEngine(''); // Reset engine when manuf changes
                    }}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-highlight)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                >
                    <option value="">-- Select --</option>
                    {hierarchy.manufacturers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            <Arrow />

            {/* 2. Engine */}
            <div style={{ width: '100%' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>ENGINE</label>
                <select
                    value={selectedEngine}
                    onChange={(e) => setSelectedEngine(e.target.value)}
                    disabled={!selectedManuf}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-highlight)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', opacity: !selectedManuf ? 0.5 : 1 }}
                >
                    <option value="">-- Select --</option>
                    {availableEngines.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
            </div>

            <Arrow />

            {/* 3. Category */}
            <div style={{ width: '100%' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>CATEGORY</label>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-highlight)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                >
                    <option value="">-- Select --</option>
                    {hierarchy.categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

        </div>
    );
}
