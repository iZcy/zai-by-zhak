import { useAuth } from '../../contexts/AuthContext';

function LoginButton() {
  const { user, loginWithGoogle, logout, isAdmin } = useAuth();

  if (user) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-stone-900/50">
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-emerald-900 text-emerald-300">
            {user.email?.slice(0, 2).toUpperCase() || 'US'}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-stone-300">
            {user.displayName || user.email?.split('@')[0]}
          </span>
          <span className="text-[10px] text-stone-600">
            {isAdmin() ? '👑 Admin' : '👤 User'}
          </span>
        </div>
        <button
          onClick={logout}
          className="ml-2 p-1.5 rounded-md text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
          title="Logout"
        >
          <iconify-icon icon="solar:logout-linear" width="16"></iconify-icon>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={loginWithGoogle}
      className="h-9 px-4 rounded-md text-xs font-medium shadow-sm transition-all flex items-center gap-2 bg-stone-100 text-black hover:bg-emerald-100"
    >
      <svg width="16" height="16" viewBox="0 0 18 18">
        <path d="M17.64 9.2c0-.637-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.144 0-3.993-1.457-4.646-3.43H2.366v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M4.354 9c0-.718.117-1.413.323-2.07L1.836 5.658A8.997 8.997 0 0 0 1.836 12.342h2.518v-3.342z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 1 9 1 5.656 1 2.228 1.836 1.836 5.658l2.518 2.342C4.471 5.027 4.354 4.282 4.354 3.58z" fill="#EA4335"/>
      </svg>
      Sign in
    </button>
  );
}

export default LoginButton;
