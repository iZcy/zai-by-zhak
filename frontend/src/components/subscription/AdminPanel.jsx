import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminSubscriptionPanel() {
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [apiToken, setApiToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [imageDataUrls, setImageDataUrls] = useState({});

  useEffect(() => {
    // Skip auth check in dev mode
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, activeRes] = await Promise.all([
        api.get('/subscription/admin/subscriptions/pending').catch(() => ({ data: { subscriptions: [] } })),
        api.get('/subscription/admin/subscriptions/active').catch(() => ({ data: { subscriptions: [] } }))
      ]);

      const pending = pendingRes.data.subscriptions || [];
      const active = activeRes.data.subscriptions || [];

      setPendingSubscriptions(pending);
      setActiveSubscriptions(active);

      // Pre-fetch payment proof images with authentication
      await fetchPaymentProofImages([...pending, ...active]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentProofImages = async (subscriptions) => {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    for (const sub of subscriptions) {
      if (sub.paymentProof) {
        try {
          // Payment proofs are served at /api/subscription/uploads/payment-proofs/:filename
          const imagePath = sub.paymentProof.startsWith('/uploads/')
            ? `/subscription${sub.paymentProof}`
            : sub.paymentProof;

          const response = await fetch(`${apiUrl}${imagePath}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const blob = await response.blob();
            const reader = new FileReader();
            const dataUrl = await new Promise((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            setImageDataUrls(prev => ({ ...prev, [sub._id || sub.id]: dataUrl }));
          } else {
            setImageLoadErrors(prev => ({ ...prev, [sub._id || sub.id]: true }));
          }
        } catch (err) {
          console.error('Failed to load image:', err);
          setImageLoadErrors(prev => ({ ...prev, [sub._id || sub.id]: true }));
        }
      }
    }
  };

  const handleApprove = async () => {
    if (!selectedSubscription || !apiToken) {
      alert('Please provide an API token');
      return;
    }

    try {
      await api.post(`/subscription/admin/subscriptions/${selectedSubscription._id}/approve`, {
        apiToken: apiToken
      });

      alert('Subscription approved!');
      setSelectedSubscription(null);
      setApiToken('');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve subscription');
    }
  };

  const handleReject = async (subscription) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.post(`/subscription/admin/subscriptions/${subscription._id || subscription.id}/reject`, {
        reason
      });

      alert('Subscription rejected');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject subscription');
    }
  };

  const handleToggleRole = async (userId) => {
    try {
      const response = await api.post(`/subscription/admin/users/${userId}/toggle-role`);
      alert(`User role changed to ${response.data.user.role}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to toggle role');
    }
  };

  if (loading) return <div className="text-stone-400">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <h2 className="text-sm font-medium text-stone-100 mb-4">
          Pending Approvals ({pendingSubscriptions.length})
        </h2>

        {pendingSubscriptions.length === 0 ? (
          <p className="text-stone-500 text-center py-8">No pending subscriptions</p>
        ) : (
          <div className="space-y-4">
            {pendingSubscriptions.map((sub) => (
              <div key={sub.id} className="p-4 rounded-lg border border-stone-800 bg-black">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-950 flex items-center justify-center">
                        <iconify-icon icon="solar:user-linear" width="20" className="text-emerald-400"></iconify-icon>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-200">{sub.user.displayName || sub.user.email}</p>
                        <p className="text-xs text-stone-600">{sub.user.email}</p>
                        <p className="text-xs text-stone-500 mt-1">Stock ID: {sub.stockId}</p>
                      </div>
                    </div>

                    {sub.paymentProof && (
                      <div className="mt-3">
                        {imageLoadErrors[sub._id || sub.id] ? (
                          <div className="w-full h-32 rounded border border-red-900 bg-red-950/50 flex items-center justify-center">
                            <p className="text-xs text-red-400">Failed to load image</p>
                          </div>
                        ) : imageDataUrls[sub._id || sub.id] ? (
                          <>
                            <img
                              src={imageDataUrls[sub._id || sub.id]}
                              alt="Payment Proof"
                              className="max-w-full h-auto rounded border border-stone-700 bg-black"
                              onClick={() => window.open(imageDataUrls[sub._id || sub.id], '_blank')}
                              style={{ cursor: 'pointer' }}
                            />
                            <p className="text-xs text-stone-500 mt-1">Click to view full size</p>
                          </>
                        ) : (
                          <div className="w-full h-32 rounded border border-stone-800 bg-stone-900/50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setSelectedSubscription(sub)}
                      className="h-9 px-3 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(sub)}
                      className="h-9 px-3 rounded-lg text-xs font-medium border border-red-900 text-red-400 hover:bg-red-950"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Subscriptions */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <h2 className="text-sm font-medium text-stone-100 mb-4">
          Active Subscriptions ({activeSubscriptions.length})
        </h2>

        {activeSubscriptions.length === 0 ? (
          <p className="text-stone-500 text-center py-8">No active subscriptions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">User</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Stock ID</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">API Token</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Active Until</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeSubscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-stone-800">
                    <td className="py-3 px-4 text-sm text-stone-300">{sub.user.displayName || sub.user.email}</td>
                    <td className="py-3 px-4 text-sm font-mono text-stone-400">{sub.stockId}</td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-stone-900 px-2 py-1 rounded text-emerald-400">
                        {sub.apiToken?.substring(0, 16)}...
                      </code>
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-300">
                      {new Date(sub.activeUntil).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sub.isActivelyPaying
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                          : 'bg-yellow-950 text-yellow-300 border border-yellow-900'
                      }`}>
                        {sub.isActivelyPaying ? 'Active' : 'Expiring Soon'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {selectedSubscription && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-stone-100 mb-4">Approve Subscription</h2>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg border border-stone-800 bg-black">
                <p className="text-xs text-stone-500">User</p>
                <p className="text-sm text-stone-200">{selectedSubscription.user.displayName || selectedSubscription.user.email}</p>
                <p className="text-xs text-stone-600">{selectedSubscription.user.email}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  API Token (30-day access)
                </label>
                <input
                  type="text"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-emerald-700"
                  placeholder="Enter API token for this stock"
                />
                <p className="text-xs text-stone-600 mt-1">
                  This token will be valid for 30 days from approval
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedSubscription(null);
                  setApiToken('');
                }}
                className="flex-1 h-10 rounded-lg text-sm font-medium border border-stone-800 text-stone-300 hover:bg-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 h-10 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Approve & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
