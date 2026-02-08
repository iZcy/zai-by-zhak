import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

function AuthCallback() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const created = params.get('created');

      if (token) {
        // Store token for api calls
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Check authentication status
        await checkAuth();

        // Redirect to home after short delay
        setTimeout(() => {
          window.location.href = window.location.origin + '/';
        }, 1000);
      } else {
        // Redirect to home with error
        window.location.href = window.location.origin + '/?auth=failed';
      }
    };

    handleCallback();
  }, [checkAuth]);

  return (
    <div className="auth-callback">
      <div className="loading-spinner">
        <h2>Processing login...</h2>
        <p>Please wait while we verify your account.</p>
      </div>
    </div>
  );
}

export default AuthCallback;
