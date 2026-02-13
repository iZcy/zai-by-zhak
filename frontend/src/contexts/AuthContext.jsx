import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const authToken = urlParams.get('token');
    const authStatus = urlParams.get('auth');

    if (authStatus === 'success' && authToken) {
      // Store token in localStorage
      localStorage.setItem('token', authToken);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Check auth will use the new token
      checkAuth();
      return;
    }

    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');

      if (response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    // Direct redirect to Google OAuth
    const clientId = '951242789573-tajkvlmef0t3fiovvj232t772gbgjo8r.apps.googleusercontent.com';
    // Use API base URL for redirect (backend handles the callback)
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const redirectUri = `${apiBase}/auth/google/callback`;
    const scope = 'profile email';
    const responseType = 'code';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${encodeURIComponent(responseType)}&` +
      `scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Logout failed
    } finally {
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    logout,
    isAdmin,
    refreshUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
