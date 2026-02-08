import { useAuth } from '../../contexts/AuthContext';

function LoginButton() {
  const { user, loginWithGoogle, logout, isAdmin } = useAuth();

  if (user) {
    return (
      <div className="auth-container">
        <div className="user-info">
          {user.picture && (
            <img src={user.picture} alt={user.displayName} className="user-avatar" />
          )}
          <div className="user-details">
            <span className="user-name">{user.displayName || user.email}</span>
            <span className={`user-role ${isAdmin() ? 'admin' : 'user'}`}>
              {isAdmin() ? '👑 Admin' : '👤 User'}
            </span>
          </div>
        </div>
        <button onClick={logout} className="btn btn-secondary">
          Logout
        </button>
      </div>
    );
  }

  return (
    <button onClick={loginWithGoogle} className="btn btn-primary google-login">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M17.64 9.2c0-.637-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.144 0-3.993-1.457-4.646-3.43H2.366v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M4.354 9c0-.718.117-1.413.323-2.07L1.836 5.658A8.997 8.997 0 0 0 1.836 12.342h2.518v-3.342z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 1 9 1 5.656 1 2.228 1.836 1.836 5.658l2.518 2.342C4.471 5.027 4.354 4.282 4.354 3.58z" fill="#EA4335"/>
      </svg>
      Sign in with Google
    </button>
  );
}

export default LoginButton;
