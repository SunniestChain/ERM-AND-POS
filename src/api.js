const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

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

    createSale: (data) => request('/sales', {
        method: 'POST',
        body: JSON.stringify(data)
    })
};
