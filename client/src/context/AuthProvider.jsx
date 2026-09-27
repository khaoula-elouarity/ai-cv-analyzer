import { useEffect, useMemo, useState, useCallback } from 'react';
import API, { setUnauthorizedHandler } from '../api/axios';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" covers the initial /me probe. Route guards must wait for it,
  // otherwise a refresh on a protected page bounces the user to /login.
  const [status, setStatus] = useState('loading');

  const logout = useCallback(async () => {
    try {
      await API.post('/auth/logout');
    } catch {
      // Even if the network call fails, drop local state — the cookie may
      // already be gone and a stale user object is worse than none.
    }
    setUser(null);
    setStatus('guest');
  }, []);

  // Restore the session from the httpOnly cookie on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await API.get('/auth/me');
        if (!cancelled) {
          setUser(data.user);
          setStatus('authed');
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setStatus('guest');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('guest');
    });
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await API.post('/auth/login', credentials);
    setUser(data.user);
    setStatus('authed');
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await API.post('/auth/register', payload);
    setUser(data.user);
    setStatus('authed');
    return data.user;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await API.patch('/auth/me', payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authed',
      isLoading: status === 'loading',
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, status, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
