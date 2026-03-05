const API_URL = '/api';

function getToken() {
    return localStorage.getItem('app_token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();
    if (!response.ok) {
        // If 401, clear stored auth (token expired or invalid)
        if (response.status === 401) {
            localStorage.removeItem('app_token');
            localStorage.removeItem('app_user');
        }
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

        const headers = {};
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${url}?${params.toString()}`, { headers });
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

    createSale: (saleData) => {
        const token = getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        return fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers,
            body: JSON.stringify(saleData)
        }).then(res => res.json());
    },

    getSale: (id) => request(`/sales/${id}`),

    getSales: () => request('/sales'),

    getAdminStats: () => {
        const token = getToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        return fetch(`${API_URL}/admin/stats`, { headers }).then(res => res.json());
    },

    importInventory: (csvText) => {
        const token = getToken();
        const headers = { 'Content-Type': 'text/csv' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        return request('/inventory/import', {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: csvText
        });
    },

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

    getAdminActiveCarts: () => request('/admin/active-carts'),

    // --- OTP Verification ---
    verifyOTP: (email, code) => request('/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code })
    }),

    resendOTP: (email) => request('/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
    }),
};
