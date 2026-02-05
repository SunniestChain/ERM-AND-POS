import React, { useState, useEffect } from 'react';
import HierarchySelector from '../components/HierarchySelector';
import ProductTable from '../components/ProductTable';
import ProductEditor from '../components/ProductEditor';
import AddProductModal from '../components/AddProductModal';
import { api } from '../api';
import SearchFilterBar from '../components/SearchFilterBar';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    // Selection State
    const [selection, setSelection] = useState({ manufacturerId: '', engineId: '', categoryId: '' });
    const [products, setProducts] = useState([]);

    // Search & Filter State
    const [searchMode, setSearchMode] = useState(false);
    const [filters, setFilters] = useState({ brand: '', stock: 'all' });

    // Modal States
    const [editingProduct, setEditingProduct] = useState(null);
    const [isAddingProduct, setIsAddingProduct] = useState(false);

    // Fetch products when selection changes (if NOT searching)
    useEffect(() => {
        if (!searchMode) {
            // If specific hierarchy selected, use it. Otherwise load default (all).
            if (selection.engineId && selection.categoryId) {
                loadProducts(selection.engineId, selection.categoryId);
            } else {
                loadProducts(); // No params = fetch default all
            }
        }
    }, [selection, searchMode]);

    const loadProducts = async (engId, catId, term = '') => {
        try {
            const data = await api.getProducts(engId, catId, term);
            setProducts(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = (term) => {
        if (term) {
            setSearchMode(true);
            setSelection({ manufacturerId: '', engineId: '', categoryId: '' }); // Reset selection UI
            loadProducts(null, null, term);
        } else {
            setSearchMode(false);
            setProducts([]); // Clear search results
        }
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    // Apply Client-Side Filters
    const filteredProducts = products.filter(p => {
        // Brand Filter
        if (filters.brand) {
            const brandMatch = p.supplier_names && p.supplier_names.toLowerCase().includes(filters.brand.toLowerCase());
            if (!brandMatch) return false;
        }

        // Stock Filter
        if (filters.stock !== 'all') {
            const stock = p.total_stock || 0;
            if (filters.stock === 'in_stock' && stock <= 0) return false;
            if (filters.stock === 'out_of_stock' && stock > 0) return false;
        }

        return true;
    });

    const handleEdit = (product) => {
        setEditingProduct(product);
    };

    const handleCloseEditor = () => {
        setEditingProduct(null);
        loadProducts(); // Refresh
    };

    const handleCloseAdd = () => {
        setIsAddingProduct(false);
        // Always refresh logic to ensure new product shows up even in "Recent" view
        if (searchMode) {
            // If searching, maybe re-search? Or just leave it. 
            // Probably better to clear search or just do nothing if search matches.
            // But if we are in default view:
            loadProducts();
        } else if (selection.engineId && selection.categoryId) {
            loadProducts(selection.engineId, selection.categoryId);
        } else {
            loadProducts(); // Refresh default list
        }
    };

    const handleDelete = async (productId) => {
        try {
            await api.deleteProduct(productId);
            // Refresh logic
            if (searchMode) {
                // Re-run search or clear? Usually refresh current view.
                // Ideally we know the search term. For now, let's just clear product from local state to be fast.
                setProducts(prev => prev.filter(p => p.id !== productId));
            } else {
                if (selection.engineId && selection.categoryId) {
                    loadProducts(selection.engineId, selection.categoryId);
                } else {
                    loadProducts();
                }
            }
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '2rem' }}>
                <div>
                    <h2 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Inventory Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Welcome back, <span style={{ color: 'var(--primary)' }}>Admin</span></p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/management">
                        <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-highlight)' }}>
                            Management Console
                        </button>
                    </Link>
                    <button className="btn-primary" onClick={() => setIsAddingProduct(true)}>
                        + Add New Product
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <SearchFilterBar onSearch={handleSearch} onFilterChange={handleFilterChange} />

            {/* Only show Hierarchy if NOT searching (or let user choose) */}
            {!searchMode && <HierarchySelector onSelectionChange={setSelection} />}

            <div style={{ marginTop: '2rem' }}>
                <ProductTable
                    products={filteredProducts}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            {editingProduct && (
                <ProductEditor
                    product={editingProduct}
                    onClose={handleCloseEditor}
                />
            )}

            {isAddingProduct && (
                <AddProductModal
                    preSelection={selection}
                    onClose={handleCloseAdd}
                />
            )}
        </div>
    );
}
