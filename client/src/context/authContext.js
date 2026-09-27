import { createContext, useContext } from 'react';

/**
 * The context object and the hook that reads it live here, separate from the
 * provider component. Keeping AuthProvider.jsx free of non-component exports
 * is what makes React Fast Refresh work in development.
 */
export const AuthContext = createContext(null);

/** @throws if called outside <AuthProvider> */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
