import { useState, useEffect } from 'react';

const AUTH_URL = 'https://functions.poehali.dev/4f508270-f2b5-4829-a964-26aad4952e13';
const TOKEN_KEY = 'tree_auth_token';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'me', token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    const data = await res.json();
    if (data.error) return data.error;
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return null;
  };

  const register = async (email: string, password: string, name: string): Promise<string | null> => {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password, name }),
    });
    const data = await res.json();
    if (data.error) return data.error;
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return null;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return { user, loading, login, register, logout };
}
