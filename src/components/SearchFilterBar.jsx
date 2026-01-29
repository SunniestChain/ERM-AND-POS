import React, { useState } from 'react';

export default function SearchFilterBar({ onSearch, onFilterChange }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterStock, setFilterStock] = useState('all'); // all, in_stock, low_stock

    const handleSearch = (e) => {
        e.preventDefault();
        onSearch(searchTerm);
    };

    const handleBrandChange = (e) => {
        const val = e.target.value;
        setFilterBrand(val);
        onFilterChange({ brand: val, stock: filterStock });
    };

    const handleStockChange = (e) => {
        const val = e.target.value;
        setFilterStock(val);
        onFilterChange({ brand: filterBrand, stock: val });
    };

    return (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Search Input */}
            <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Part #, Name, Description, SKU..."
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-highlight)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        minWidth: '200px'
                    }}
                />
                <button type="submit" className="btn-primary">
                    Search
                </button>
            </form>

            {/* divider */}
            <div style={{ width: '1px', height: '30px', background: 'var(--border-subtle)' }}></div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* Brand Filter (Ideally this should be populated dynamically, but for now text or predefined) */}
                {/* Actually, user asked to "check by brand". We can pass unique brands from parent or just use text input for now. 
                    Let's make it a text input "Filter Brand" to be flexible for now, or we need to fetch brands. 
                    Let's use a simple input for visual simplicity or a placeholder select if passed in. 
                    Assuming simple text filter for client-side filtering.
                */}
                <input
                    placeholder="Filter by Brand..."
                    value={filterBrand}
                    onChange={handleBrandChange}
                    style={{
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        width: '150px'
                    }}
                />

                <select
                    value={filterStock}
                    onChange={handleStockChange}
                    style={{
                        padding: '0.75rem',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        width: '150px',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Stock Status</option>
                    <option value="in_stock">In Stock ({'>'}0)</option>
                    <option value="out_of_stock">Out of Stock (0)</option>
                </select>
            </div>

        </div>
    );
}
