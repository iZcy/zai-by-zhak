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
        // For development, auto-login as first dev user
        if (import.meta.env.DEV) {
          await devLogin('admin@zai.dev');
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      // For development, auto-login as first dev user
      if (import.meta.env.DEV) {
        await devLogin('admin@zai.dev');
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const devLogin = async (email) => {
    try {
      console.log('Attempting dev login for email:', email);
      const response = await api.post('/auth/dev/login', { email });
      console.log('Dev login response:', response.data);

      if (response.data.success && response.data.user) {
        // Store token
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        setUser(response.data.user);
        console.log('User set successfully:', response.data.user);
      }
    } catch (error) {
      console.error('Dev login failed:', error);
      setUser(null);
    }
  };

  const switchTestUser = async (email) => {
    console.log('switchTestUser called with email:', email);
    setLoading(true);
    await devLogin(email);
    setLoading(false);
  };

  const loginWithGoogle = () => {
    // Direct redirect to Google OAuth
    const clientId = '951242789573-tajkvlmef0t3fiovvj232t772gbgjo8r.apps.googleusercontent.com';
    // Use API base URL for redirect (backend handles the callback)
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const redirectUri = `${apiBase}/auth/google/callback`;
    const scope = 'profile email';
    const responseType = 'code';

    // Debug: Log the redirect URI
    console.log('🔍 Google OAuth Debug:');
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('apiBase:', apiBase);
    console.log('redirectUri:', redirectUri);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${encodeURIComponent(responseType)}&` +
      `scope=${encodeURIComponent(scope)}`;

    console.log('Full auth URL:', authUrl);
    window.location.href = authUrl;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state on error
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    logout,
    isAdmin,
    switchTestUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
