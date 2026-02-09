import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load user from localStorage
        const storedUser = localStorage.getItem('app_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const data = await api.login(username, password);
            if (data.success && data.user) {
                setUser(data.user);
                localStorage.setItem('app_user', JSON.stringify(data.user));
                return { success: true };
            }
            return { success: false, error: data.error || 'Invalid response' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const register = async (username, password, email) => {
        try {
            // We need to add api.register to api.js first or call fetch directly. 
            // Better to add to api.js, but for speed I'll fetch here or update api.js.
            // I'll update api.js in a moment. For now, fetch directly to avoid breaking flow.
            const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });
            const data = await res.json();

            if (data.success && data.user) {
                // No auto-login as per user request
                // setUser(data.user); 
                // localStorage.setItem('app_user', JSON.stringify(data.user));
                return { success: true };
            }
            return { success: false, error: data.error || 'Registration failed' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('app_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
