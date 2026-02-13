import { useState, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const showSuccess = useCallback((message) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message) => showToast(message, 'error'), [showToast]);
  const showInfo = useCallback((message) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
      {children}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[100] animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-red-950 border-red-800 text-red-200'
              : 'bg-stone-900 border-stone-700 text-stone-200'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' && (
                <iconify-icon icon="solar:check-circle-linear" width="18" className="text-emerald-400"></iconify-icon>
              )}
              {toast.type === 'error' && (
                <iconify-icon icon="solar:close-circle-linear" width="18" className="text-red-400"></iconify-icon>
              )}
              {toast.type === 'info' && (
                <iconify-icon icon="solar:info-circle-linear" width="18" className="text-stone-400"></iconify-icon>
              )}
              <span className="text-sm">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
