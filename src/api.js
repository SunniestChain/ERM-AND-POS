const API_URL = '/api';

async function request(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || data.error || 'API Request Failed');
    }
    return data;
}

export const api = {
    login: (username, password) => request('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    }),

    getHierarchy: () => request('/hierarchy'),

    getProducts: async (engineId, categoryId, search = '') => {
        let url = `${API_URL}/products`;
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (engineId) params.append('engineId', engineId);
        if (categoryId) params.append('categoryId', categoryId);

        const res = await fetch(`${url}?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
    },

    getVariants: (productId) => request(`/products/${productId}/variants`),

    createProduct: (data) => request('/products', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    deleteProduct: (id) => request(`/products/${id}`, {
        method: 'DELETE'
    }),

    updateProduct: (id, data) => request(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    updateVariant: (id, data) => request(`/variants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    createVariant: (data) => request('/variants', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    deleteVariant: (id) => request(`/variants/${id}`, {
        method: 'DELETE'
    }),

    // Generic CRUD
    createEntity: (entity, data) => request(`/${entity}`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    deleteEntity: (entity, id) => request(`/${entity}/${id}`, {
        method: 'DELETE'
    }),

    createSale: (saleData) => fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
    }).then(res => res.json()),

    getSale: (id) => request(`/sales/${id}`),

    getSales: () => request('/sales'),

    getAdminStats: () => fetch(`${API_URL}/admin/stats`).then(res => res.json()),

    importInventory: (csvText) => request('/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csvText
    }),

    // --- Cart Management ---
    getCart: (userId) => request(`/cart?userId=${userId}`),

    addToCart: (userId, variantId, quantity) => request('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ userId, variantId, quantity })
    }),

    removeFromCart: (userId, variantId, quantity = null) => request('/cart/remove', {
        method: 'POST',
        body: JSON.stringify({ userId, variantId, quantity })
    }),

    clearCart: (userId) => request('/cart/clear', {
        method: 'POST',
        body: JSON.stringify({ userId })
    }),

    getAdminActiveCarts: () => request('/admin/active-carts')
};
