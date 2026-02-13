import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function AdminSubscriptionPanel() {
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [usersStats, setUsersStats] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [apiToken, setApiToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [imageDataUrls, setImageDataUrls] = useState({});
  const [editingToken, setEditingToken] = useState(null);
  const [tokenValue, setTokenValue] = useState('');
  const [showReferralsPopup, setShowReferralsPopup] = useState(null);
  const [showApproveWithdraw, setShowApproveWithdraw] = useState(null);
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawReceipt, setWithdrawReceipt] = useState(null);
  const [editingActiveUntil, setEditingActiveUntil] = useState(null);
  const [activeUntilValue, setActiveUntilValue] = useState('');
  const toast = useToast();

  // Filters
  const [activeUntilFrom, setActiveUntilFrom] = useState('');
  const [activeUntilTo, setActiveUntilTo] = useState('');
  const [expiredFilter, setExpiredFilter] = useState('all'); // 'all', 'yes', 'no'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'enabled', 'disabled'
  const [userFilter, setUserFilter] = useState('all'); // 'all', 'existing'
  const [stockIdSearch, setStockIdSearch] = useState('');

  useEffect(() => {
    // Skip auth check in dev mode
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, subscriptionsRes, usersRes, withdrawRes] = await Promise.all([
        api.get('/subscription/admin/subscriptions/pending').catch(() => ({ data: { subscriptions: [] } })),
        api.get('/subscription/admin/subscriptions/all').catch(() => ({ data: { subscriptions: [] } })),
        api.get('/subscription/admin/users/stats').catch(() => ({ data: { users: [] } })),
        api.get('/subscription/admin/withdraw/requests').catch(() => ({ data: { withdraws: [] } }))
      ]);

      const pending = pendingRes.data.subscriptions || [];
      const subscriptions = subscriptionsRes.data.subscriptions || [];
      const users = usersRes.data.users || [];
      const withdraws = withdrawRes.data.withdraws || [];

      setPendingSubscriptions(pending);
      setActiveSubscriptions(subscriptions);
      setUsersStats(users);
      setWithdrawRequests(withdraws);

      // Pre-fetch payment proof images with authentication
      await fetchPaymentProofImages([...pending, ...subscriptions]);
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
      toast.showError('Please provide an API token');
      return;
    }

    try {
      const subId = selectedSubscription._id || selectedSubscription.id;
      console.log('Approving subscription:', subId, 'API Token:', apiToken);

      const response = await api.post(`/subscription/admin/subscriptions/${subId}/approve`, {
        apiToken: apiToken
      });

      console.log('Approve response:', response.data);
      toast.showSuccess('Subscription approved!');
      setSelectedSubscription(null);
      setApiToken('');
      fetchData();
    } catch (error) {
      console.error('Approve error:', error);
      console.error('Error response:', error.response);
      toast.showError(error.response?.data?.message || error.message || 'Failed to approve subscription');
    }
  };

  const handleReject = async (subscription) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.post(`/subscription/admin/subscriptions/${subscription._id || subscription.id}/reject`, {
        reason
      });

      toast.showSuccess('Subscription rejected');
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to reject subscription');
    }
  };

  const handleToggleRole = async (userId) => {
    try {
      const response = await api.post(`/subscription/admin/users/${userId}/toggle-role`);
      toast.showSuccess(`User role changed to ${response.data.user.role}`);
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to toggle role');
    }
  };

  const handleUpdateToken = async (subscriptionId) => {
    try {
      await api.put(`/subscription/admin/subscriptions/${subscriptionId}/token`, {
        apiToken: tokenValue
      });
      toast.showSuccess('API token updated!');
      setEditingToken(null);
      setTokenValue('');
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to update API token');
    }
  };

  const handleToggleSubscription = async (subscriptionId) => {
    try {
      const response = await api.post(`/subscription/admin/subscriptions/${subscriptionId}/toggle`);
      toast.showSuccess(response.data.message);
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to toggle subscription');
    }
  };

  const handleUpdateActiveUntil = async (subscriptionId, newDate) => {
    try {
      await api.put(`/subscription/admin/subscriptions/${subscriptionId}/active-until`, {
        activeUntil: newDate
      });
      toast.showSuccess('Active until date updated!');
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to update date');
    }
  };

  const handleApproveWithdraw = async () => {
    if (!withdrawReceipt) {
      toast.showError('Please upload a receipt');
      return;
    }

    const formData = new FormData();
    formData.append('receipt', withdrawReceipt);
    if (withdrawNote) {
      formData.append('note', withdrawNote);
    }

    try {
      await api.post(`/subscription/admin/withdraw/${showApproveWithdraw.id}/approve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.showSuccess('Withdraw approved and receipt uploaded!');
      setShowApproveWithdraw(null);
      setWithdrawNote('');
      setWithdrawReceipt(null);
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to approve withdraw');
    }
  };

  const handleRejectWithdraw = async (withdrawId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.post(`/subscription/admin/withdraw/${withdrawId}/reject`, { reason });
      toast.showSuccess('Withdraw request rejected');
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to reject withdraw');
    }
  };

  // Get list of user IDs that have subscriptions (existing users)
  const existingUserIds = [...new Set(activeSubscriptions.map(sub => sub.user?._id || sub.user?.id).filter(Boolean))];

  // Sort subscriptions: expired but enabled first, then by date
  const sortedSubscriptions = [...activeSubscriptions].sort((a, b) => {
    const aIsExpiredButEnabled = a.isActive && a.activeUntil && new Date(a.activeUntil) < new Date();
    const bIsExpiredButEnabled = b.isActive && b.activeUntil && new Date(b.activeUntil) < new Date();

    // Expired but enabled subscriptions first
    if (aIsExpiredButEnabled && !bIsExpiredButEnabled) return -1;
    if (!aIsExpiredButEnabled && bIsExpiredButEnabled) return 1;

    // Then sort by activeUntil (newest first)
    const aDate = a.activeUntil ? new Date(a.activeUntil).getTime() : 0;
    const bDate = b.activeUntil ? new Date(b.activeUntil).getTime() : 0;
    return bDate - aDate;
  });

  // Filter subscriptions based on filter states
  const filteredSubscriptions = sortedSubscriptions.filter((sub) => {
    // Filter by Stock ID search
    if (stockIdSearch) {
      const searchLower = stockIdSearch.toLowerCase();
      if (!sub.stockId?.toLowerCase().includes(searchLower)) return false;
    }

    // Filter by User (existing users)
    if (userFilter === 'existing') {
      const userId = sub.user?._id || sub.user?.id;
      if (!userId || !existingUserIds.includes(userId)) return false;
    }

    // Filter by Active Until date range
    if (activeUntilFrom && sub.activeUntil) {
      const fromDate = new Date(activeUntilFrom);
      const untilDate = new Date(sub.activeUntil);
      if (untilDate < fromDate) return false;
    }
    if (activeUntilTo && sub.activeUntil) {
      const toDate = new Date(activeUntilTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      const untilDate = new Date(sub.activeUntil);
      if (untilDate > toDate) return false;
    }

    // Filter by Expired (yes/no)
    if (expiredFilter !== 'all') {
      const isExpired = sub.activeUntil && new Date(sub.activeUntil) < new Date();
      if (expiredFilter === 'yes' && !isExpired) return false;
      if (expiredFilter === 'no' && isExpired) return false;
    }

    // Filter by Status (enabled/disabled)
    if (statusFilter !== 'all') {
      if (statusFilter === 'enabled' && !sub.isActive) return false;
      if (statusFilter === 'disabled' && sub.isActive) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setActiveUntilFrom('');
    setActiveUntilTo('');
    setExpiredFilter('all');
    setStatusFilter('all');
    setUserFilter('all');
    setStockIdSearch('');
  };

  const hasActiveFilters = activeUntilFrom || activeUntilTo || expiredFilter !== 'all' || statusFilter !== 'all' || userFilter !== 'all' || stockIdSearch;

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

      {/* Withdraw Requests */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <h2 className="text-sm font-medium text-stone-100 mb-4">
          Withdraw Requests ({withdrawRequests.filter(w => w.status === 'pending').length} pending)
        </h2>

        {withdrawRequests.length === 0 ? (
          <p className="text-stone-500 text-center py-8">No withdraw requests</p>
        ) : (
          <div className="space-y-4">
            {withdrawRequests.map((w) => (
              <div key={w.id} className={`p-4 rounded-lg border ${w.status === 'pending' ? 'border-yellow-900/50 bg-yellow-950/10' : 'border-stone-800'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-950 flex items-center justify-center">
                        <iconify-icon icon="solar:wallet-linear" width="20" className="text-blue-400"></iconify-icon>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-200">{w.user?.displayName || w.user?.email}</p>
                        <p className="text-xs text-stone-600">{w.user?.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <div>
                        <p className="text-xs text-stone-500">Amount</p>
                        <p className="text-lg font-semibold text-blue-400">${w.netAmount?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Fee</p>
                        <p className="text-sm text-stone-400">${w.fee?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Requested</p>
                        <p className="text-sm text-stone-300">{new Date(w.requestedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Status</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          w.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                            : w.status === 'rejected'
                            ? 'bg-red-950 text-red-300 border border-red-900'
                            : 'bg-yellow-950 text-yellow-300 border border-yellow-900'
                        }`}>
                          {w.status}
                        </span>
                      </div>
                    </div>
                    {w.adminNote && (
                      <p className="text-xs text-stone-500 mt-2">Note: {w.adminNote}</p>
                    )}
                  </div>

                  {w.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setShowApproveWithdraw(w)}
                        className="h-9 px-3 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectWithdraw(w.id)}
                        className="h-9 px-3 rounded-lg text-xs font-medium border border-red-900 text-red-400 hover:bg-red-950"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users Stats */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <h2 className="text-sm font-medium text-stone-100 mb-4">
          Users ({usersStats.length})
        </h2>

        {usersStats.length === 0 ? (
          <p className="text-stone-500 text-center py-8">No users with subscriptions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">User</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Active Stocks</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Stocks Fee</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Active Referrals</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Bonus</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Withdrawable</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Net Value</th>
                </tr>
              </thead>
              <tbody>
                {usersStats.map((user) => (
                  <tr key={user.id} className="border-b border-stone-800">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm text-stone-200">{user.displayName || user.email}</p>
                        <p className="text-xs text-stone-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-300">{user.activeStocks}</td>
                    <td className="py-3 px-4 text-sm text-stone-300">${user.stocksFee.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => user.activeReferralsCount > 0 && setShowReferralsPopup(user)}
                        className={`text-sm ${user.activeReferralsCount > 0 ? 'text-blue-400 hover:text-blue-300 cursor-pointer underline' : 'text-stone-500'}`}
                        disabled={user.activeReferralsCount === 0}
                      >
                        {user.activeReferralsCount}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-emerald-400 font-medium">${user.bonus.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-blue-400 font-medium">
                      ${Math.max(0, (user.withdrawableBalance || 0) - 1).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      <span className={user.netValue >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {user.netValue >= 0 ? '+' : ''}${Math.abs(user.netValue).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-stone-100">
            Subscriptions ({filteredSubscriptions.length} / {activeSubscriptions.length})
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs px-2 py-1 rounded border border-stone-700 text-stone-400 hover:bg-stone-900 hover:text-stone-200"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-4 p-3 rounded-lg border border-stone-800 bg-stone-900/30">
          <div className="flex flex-wrap gap-4">
            {/* Stock ID Search */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500">Stock ID:</label>
              <input
                type="text"
                value={stockIdSearch}
                onChange={(e) => setStockIdSearch(e.target.value)}
                placeholder="Search..."
                className="px-2 py-1 text-xs bg-black border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-emerald-700 w-32"
              />
            </div>

            {/* User Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500">User:</label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-black border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-emerald-700"
              >
                <option value="all">All</option>
                <option value="existing">Existing Users</option>
              </select>
            </div>

            {/* Active Until Date Range */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500">Active Until:</label>
              <input
                type="date"
                value={activeUntilFrom}
                onChange={(e) => setActiveUntilFrom(e.target.value)}
                className="px-2 py-1 text-xs bg-black border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-emerald-700"
              />
              <span className="text-xs text-stone-600">to</span>
              <input
                type="date"
                value={activeUntilTo}
                onChange={(e) => setActiveUntilTo(e.target.value)}
                className="px-2 py-1 text-xs bg-black border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-emerald-700"
              />
            </div>

            {/* Expired Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500">Expired:</label>
              <select
                value={expiredFilter}
                onChange={(e) => setExpiredFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-black border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-emerald-700"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-black border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-emerald-700"
              >
                <option value="all">All</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <p className="text-stone-500 text-center py-8">
            {hasActiveFilters ? 'No subscriptions match the filters' : 'No active subscriptions'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">User</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Stock ID</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">API Token</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Active Until</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Expired</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Receipt</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub) => {
                  const isExpiredButEnabled = sub.isActive && sub.activeUntil && new Date(sub.activeUntil) < new Date();
                  return (
                    <tr
                      key={sub.id}
                      className={`border-b ${isExpiredButEnabled ? 'bg-orange-950/30 border-orange-900/50' : 'border-stone-800'}`}
                    >
                    <td className="py-3 px-4 text-sm text-stone-300">{sub.user.displayName || sub.user.email}</td>
                    <td className="py-3 px-4 text-sm font-mono text-stone-400">{sub.stockId}</td>
                    <td className="py-3 px-4">
                      {editingToken === sub.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tokenValue}
                            onChange={(e) => setTokenValue(e.target.value)}
                            className="w-48 px-2 py-1 text-xs bg-stone-900 border border-stone-700 rounded text-emerald-400 focus:outline-none focus:border-emerald-600"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateToken(sub.id)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingToken(null);
                              setTokenValue('');
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <code
                            className="text-xs bg-stone-900 px-2 py-1 rounded text-emerald-400 cursor-pointer hover:bg-stone-800"
                            onClick={() => {
                              setEditingToken(sub.id);
                              setTokenValue(sub.apiToken || '');
                            }}
                            title="Click to edit"
                          >
                            {sub.apiToken || 'Not set'}
                          </code>
                          <button
                            onClick={() => {
                              setEditingToken(sub.id);
                              setTokenValue(sub.apiToken || '');
                            }}
                            className="text-stone-500 hover:text-stone-300 text-xs"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingActiveUntil === sub.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={activeUntilValue}
                            onChange={(e) => setActiveUntilValue(e.target.value)}
                            className="px-2 py-1 text-xs bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-emerald-600"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              handleUpdateActiveUntil(sub.id, activeUntilValue);
                              setEditingActiveUntil(null);
                              setActiveUntilValue('');
                            }}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setEditingActiveUntil(null);
                              setActiveUntilValue('');
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-stone-300">
                            {sub.activeUntil ? new Date(sub.activeUntil).toLocaleDateString() : '-'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingActiveUntil(sub.id);
                              setActiveUntilValue(sub.activeUntil ? new Date(sub.activeUntil).toISOString().split('T')[0] : '');
                            }}
                            className="text-stone-500 hover:text-stone-300 text-xs"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {sub.activeUntil ? (
                        new Date(sub.activeUntil) < new Date() ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-950 text-red-300 border border-red-900">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-900">
                            No
                          </span>
                        )
                      ) : (
                        <span className="text-stone-600 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sub.isActive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                          : 'bg-red-950 text-red-300 border border-red-900'
                      }`}>
                        {sub.isActive ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {sub.paymentProof && imageDataUrls[sub.id] ? (
                        <img
                          src={imageDataUrls[sub.id]}
                          alt="Receipt"
                          className="w-12 h-12 object-cover rounded border border-stone-700 cursor-pointer hover:border-emerald-700"
                          onClick={() => window.open(imageDataUrls[sub.id], '_blank')}
                        />
                      ) : sub.paymentProof ? (
                        <div className="w-12 h-12 rounded border border-stone-800 bg-stone-900/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-600">No receipt</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleSubscription(sub.id)}
                        className={`text-xs px-2 py-1 rounded border ${
                          sub.isActive
                            ? 'border-red-900 text-red-400 hover:bg-red-950'
                            : 'border-emerald-900 text-emerald-400 hover:bg-emerald-950'
                        }`}
                      >
                        {sub.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                  );
                })}
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

      {/* Active Referrals Popup */}
      {showReferralsPopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-stone-100">
                Active Referrals ({showReferralsPopup.displayName || showReferralsPopup.email})
              </h2>
              <button
                onClick={() => setShowReferralsPopup(null)}
                className="text-stone-500 hover:text-stone-300"
              >
                ✕
              </button>
            </div>

            {showReferralsPopup.activeReferrals?.length > 0 ? (
              <div className="space-y-3">
                {showReferralsPopup.activeReferrals.map((ref, idx) => (
                  <div key={ref.id || idx} className="p-3 rounded-lg border border-stone-800 bg-stone-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-stone-200">{ref.user?.displayName || ref.user?.email}</p>
                        <p className="text-xs text-stone-500">{ref.user?.email}</p>
                      </div>
                      <span className="text-emerald-400 text-sm font-medium">
                        +${ref.profitPerMonth?.toFixed(2) || '2.50'}/mo
                      </span>
                    </div>
                    {ref.activeSince && (
                      <p className="text-xs text-stone-600 mt-2">
                        Active since: {new Date(ref.activeSince).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
                <div className="pt-3 border-t border-stone-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">Total Bonus:</span>
                    <span className="text-emerald-400 font-medium">
                      ${showReferralsPopup.bonusAmount?.toFixed(2) || '0.00'}/mo
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-stone-500 text-center py-4">No active referrals</p>
            )}

            <button
              onClick={() => setShowReferralsPopup(null)}
              className="w-full mt-4 h-10 rounded-lg text-sm font-medium border border-stone-800 text-stone-300 hover:bg-stone-900"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Approve Withdraw Modal */}
      {showApproveWithdraw && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-stone-100 mb-4">Approve Withdraw</h2>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg border border-stone-800 bg-black">
                <p className="text-xs text-stone-500">User</p>
                <p className="text-sm text-stone-200">{showApproveWithdraw.user?.displayName || showApproveWithdraw.user?.email}</p>
                <p className="text-xs text-stone-600">{showApproveWithdraw.user?.email}</p>
              </div>

              <div className="p-4 rounded-lg border border-blue-900/50 bg-blue-950/20">
                <p className="text-xs text-stone-500">Withdraw Amount</p>
                <p className="text-2xl font-semibold text-blue-400">${showApproveWithdraw.netAmount?.toFixed(2)}</p>
                <p className="text-xs text-stone-600 mt-1">+ ${showApproveWithdraw.fee?.toFixed(2)} fee = ${(showApproveWithdraw.netAmount + showApproveWithdraw.fee)?.toFixed(2)} total deduction</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-blue-700"
                  placeholder="Add a note for the user"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Withdraw Receipt *
                </label>
                <input
                  type="file"
                  onChange={(e) => setWithdrawReceipt(e.target.files[0])}
                  required
                  accept="image/*,.pdf"
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveWithdraw(null);
                  setWithdrawNote('');
                  setWithdrawReceipt(null);
                }}
                className="flex-1 h-10 rounded-lg text-sm font-medium border border-stone-800 text-stone-300 hover:bg-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveWithdraw}
                className="flex-1 h-10 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Approve & Upload Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
