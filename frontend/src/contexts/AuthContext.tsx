import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';

interface User {
    id: number;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<string | null>;
    register: (email: string, password: string) => Promise<string | null>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('wiki_token'));
    const [loading, setLoading] = useState(true);

    const fetchMe = useCallback(async (t: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
                headers: { Authorization: `Bearer ${t}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                return true;
            }
        } catch { }
        return false;
    }, []);

    useEffect(() => {
        if (token) {
            fetchMe(token).then(ok => {
                if (!ok) {
                    localStorage.removeItem('wiki_token');
                    setToken(null);
                }
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [token, fetchMe]);

    const login = async (email: string, password: string): Promise<string | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('wiki_token', data.access_token);
                setToken(data.access_token);
                await fetchMe(data.access_token);
                return null;
            }
            const err = await res.json();
            return err.detail || 'Login failed';
        } catch {
            return 'Network error';
        }
    };

    const register = async (email: string, password: string): Promise<string | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                return await login(email, password);
            }
            const err = await res.json();
            return err.detail || 'Registration failed';
        } catch {
            return 'Network error';
        }
    };

    const logout = () => {
        localStorage.removeItem('wiki_token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
