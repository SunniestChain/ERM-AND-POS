import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load user from localStorage
        const storedUser = localStorage.getItem('app_user');
        const storedToken = localStorage.getItem('app_token');
        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
        } else {
            // Clear partial data
            localStorage.removeItem('app_user');
            localStorage.removeItem('app_token');
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const data = await api.login(username, password);
            if (data.success && data.user) {
                setUser(data.user);
                localStorage.setItem('app_user', JSON.stringify(data.user));
                if (data.token) {
                    localStorage.setItem('app_token', data.token);
                }
                return { success: true };
            }
            return { success: false, error: data.error || 'Invalid response' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const register = async (username, password, email) => {
        try {
            const API_URL = '/api';
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });
            const data = await res.json();

            if (data.success) {
                // Check if OTP verification is needed
                if (data.needsVerification) {
                    return { success: true, needsVerification: true, email: data.email };
                }
                return { success: true };
            }
            return { success: false, error: data.error || 'Registration failed' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const verifyOTP = async (email, code) => {
        try {
            const data = await api.verifyOTP(email, code);
            return { success: data.success, message: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const resendOTP = async (email) => {
        try {
            const data = await api.resendOTP(email);
            return { success: data.success, message: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('app_user');
        localStorage.removeItem('app_token');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyOTP, resendOTP, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
