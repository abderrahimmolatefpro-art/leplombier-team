'use client';

import { useState, useEffect, useCallback } from 'react';
import { Client } from '@/types';

const TOKEN_KEY = 'espace_client_token';

export function useClientAuth() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);

  const setToken = useCallback((t: string | null) => {
    if (typeof window === 'undefined') return;
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      setTokenState(t);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
      setClient(null);
    }
  }, []);

  const fetchClient = useCallback(async (t: string) => {
    const res = await fetch('/api/espace-client/me', {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      setToken(null);
      return;
    }
    const data = await res.json();
    const c = data.client;
    if (c) {
      setClient({
        ...c,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      });
    }
  }, [setToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let t = localStorage.getItem(TOKEN_KEY);

    if (!t) {
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get('espace_client_token');
      if (tokenFromUrl) {
        localStorage.setItem(TOKEN_KEY, tokenFromUrl);
        t = tokenFromUrl;
        params.delete('espace_client_token');
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
        window.history.replaceState({}, '', newUrl);
      }
    }

    setTokenState(t);

    if (t) {
      fetchClient(t).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchClient]);

  const login = useCallback(async (authToken: string) => {
    setToken(authToken);
    await fetchClient(authToken);
  }, [setToken, fetchClient]);

  const logout = useCallback(() => {
    setToken(null);
  }, [setToken]);

  return { client, loading, token, login, logout, setToken };
}
