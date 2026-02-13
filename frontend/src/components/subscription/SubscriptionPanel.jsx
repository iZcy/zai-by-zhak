import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function SubscriptionPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeReferrals, setActiveReferrals] = useState([]);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referredByCode, setReferredByCode] = useState(null);
  const [stockFilter, setStockFilter] = useState('active'); // 'active', 'all'
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Update referredByCode when user changes
  useEffect(() => {
    console.log('User changed in SubscriptionPanel:', {
      email: user?.email,
      referralCodeUsed: user?.referralCodeUsed
    });
    if (user?.referralCodeUsed) {
      setReferredByCode(user.referralCodeUsed);
    } else {
      setReferredByCode(null);
    }
  }, [user]);

  const fetchData = async () => {
    console.log('fetchData called, user:', user?.email);
    try {
      const [dashboardRes, referralRes, subscriptionsRes, activeReferralsRes, withdrawRes] = await Promise.all([
        api.get('/subscription/dashboard'),
        api.get('/subscription/referral/code'),
        api.get('/subscription/my'),
        api.get('/subscription/referral/active'),
        api.get('/subscription/withdraw/history').catch(() => ({ data: { withdraws: [] } }))
      ]);

      console.log('API responses received:', {
        dashboard: dashboardRes.data,
        referralCode: referralRes.data.referralCode,
        subscriptions: subscriptionsRes.data.subscriptions?.length
      });

      setDashboard(dashboardRes.data.dashboard || { stockCount: 0, activeReferrals: 0, monthlyProfit: 0, netCost: 0, withdrawableBalance: 0 });
      setReferralCode(referralRes.data.referralCode);
      setSubscriptions(subscriptionsRes.data.subscriptions || []);
      setActiveReferrals(activeReferralsRes.data.activeReferrals || []);
      setWithdrawHistory(withdrawRes.data.withdraws || []);

      // Get the user's referral code used from the current user object (not from initial mount)
      // The user object in AuthContext should have referralCodeUsed from the backend
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      // Don't set fallback values - let the UI show empty state
      setDashboard({ stockCount: 0, activeReferrals: 0, monthlyProfit: 0, netCost: 0 });
      setReferralCode('');
      setSubscriptions([]);
      setActiveReferrals([]);
      setReferredByCode(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.showSuccess('Referral code copied!');
  };

  const handleBuySubscription = async (e) => {
    e.preventDefault();

    if (!paymentProof) {
      toast.showError('Please provide payment proof');
      return;
    }

    const formData = new FormData();
    formData.append('paymentProof', paymentProof);

    try {
      const response = await api.post('/subscription/request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.showSuccess('Subscription request submitted! Wait for admin approval.');
      setShowBuyModal(false);
      setPaymentProof(null);
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.showError('Please enter a valid amount');
      return;
    }

    try {
      await api.post('/subscription/withdraw/request', { amount });
      toast.showSuccess('Withdraw request submitted! Wait for admin approval.');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to submit withdraw request');
    }
  };

  // Filter subscriptions based on stockFilter
  const filteredSubscriptions = stockFilter === 'active'
    ? subscriptions.filter(sub => sub.isActive && !sub.isExpired)
    : subscriptions;

  if (loading) return <div className="text-stone-400">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-stone-800 bg-black">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-stone-500">Active Referrals</span>
            <iconify-icon icon="solar:users-group-rounded-linear" width="20" className="text-stone-700"></iconify-icon>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-stone-200">{dashboard?.activeReferrals || 0}</span>
            <p className="text-xs text-stone-600 mt-1">$2.50 per payment</p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-stone-800 bg-black">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-stone-500">Monthly Profit</span>
            <iconify-icon icon="solar:wallet-money-linear" width="20" className="text-emerald-500"></iconify-icon>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-emerald-400">${dashboard?.monthlyProfit?.toFixed(2) || '0.00'}</span>
            <p className="text-xs text-stone-600 mt-1">From referrals</p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-stone-800 bg-black">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-stone-500">
              {dashboard?.netCost < 0 ? 'Net Profit' : 'Net Cost'}
            </span>
            <iconify-icon icon="solar:calculator-linear" width="20" className={dashboard?.netCost < 0 ? "text-emerald-500" : "text-stone-700"}></iconify-icon>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-semibold ${dashboard?.netCost < 0 ? 'text-emerald-400' : 'text-stone-200'}`}>
              ${Math.abs(dashboard?.netCost || 0).toFixed(2)}
            </span>
            <p className="text-xs text-stone-600 mt-1">
              {dashboard?.netCost < 0 ? 'Monthly earnings' : 'Monthly cost'}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-stone-800 bg-black">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-stone-500">Withdrawable</span>
            <iconify-icon icon="solar:hand-money-linear" width="20" className="text-blue-500"></iconify-icon>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-blue-400">${(dashboard?.withdrawableBalance || 0).toFixed(2)}</span>
            <p className="text-xs text-stone-600 mt-1">Available to withdraw</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      {dashboard?.netCost < 0 && (
        <div className="p-4 rounded-xl border border-yellow-900/50 bg-yellow-950/20">
          <div className="flex items-start gap-3">
            <iconify-icon icon="solar:info-circle-linear" width="18" className="text-yellow-500 mt-0.5"></iconify-icon>
            <p className="text-xs text-yellow-200/80">
              <span className="font-medium text-yellow-200">Note:</span> You must maintain an active stock subscription to claim referral profits. If all your stocks expire or are cancelled, referral earnings will not be payable.
            </p>
          </div>
        </div>
      )}

      {/* My Stocks */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-stone-100">My Stocks</h2>
          <button
            onClick={() => setShowBuyModal(true)}
            disabled={dashboard?.hasActiveSubscription}
            className={`h-9 px-4 rounded-md text-xs font-medium ${
              dashboard?.hasActiveSubscription
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {dashboard?.hasActiveSubscription ? 'Active Stock Exists' : 'Buy Stock'}
          </button>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setStockFilter('active')}
              className={`px-2 py-1 rounded text-xs font-medium ${
                stockFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2 py-1 rounded text-xs font-medium ${
                stockFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-12">
            <iconify-icon icon="solar:box-linear" width="48" className="mx-auto text-stone-800 mb-4"></iconify-icon>
            <p className="text-stone-500 mb-2">{stockFilter === 'active' ? 'No active stocks' : 'No stocks yet'}</p>
            <p className="text-xs text-stone-600">
              {stockFilter === 'active' ? 'All your stocks are expired or cancelled' : 'Buy your first stock to access API'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubscriptions.map((sub) => (
              <div key={sub.id} className="p-4 rounded-lg border border-stone-800 bg-black">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-stone-200">{sub.stockId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        sub.status === 'active' && sub.isActive && !sub.isExpired
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                          : sub.status === 'pending'
                          ? 'bg-yellow-950 text-yellow-300 border border-yellow-900'
                          : 'bg-stone-900 text-stone-400 border border-stone-800'
                      }`}>
                        {sub.status}
                      </span>
                      {sub.activeUntil && (
                        <span className="text-xs text-stone-600">
                          Until: {new Date(sub.activeUntil).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-stone-200">$10.00</p>
                    <p className="text-xs text-stone-600">per month</p>
                  </div>
                </div>
                {sub.apiToken && sub.isActive && !sub.isExpired && (
                  <div className="mt-3 p-3 rounded-lg bg-stone-900/50 border border-stone-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-500 mb-1">API Token</p>
                        <code className="text-xs font-mono text-emerald-400 break-all">
                          {sub.apiToken}
                        </code>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sub.apiToken);
                          toast.showSuccess('API token copied!');
                        }}
                        className="ml-3 h-8 px-3 rounded text-xs font-medium bg-stone-800 text-stone-300 hover:bg-stone-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral Program */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <h2 className="text-sm font-medium text-stone-100 mb-4">Referral Program</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-stone-800 bg-black">
            <div>
              <p className="text-xs text-stone-500">Your Referral Code</p>
              {referralCode ? (
                <p className="text-lg font-mono font-semibold text-emerald-400 mt-1">{referralCode}</p>
              ) : (
                <p className="text-sm text-stone-600 mt-1">Loading...</p>
              )}
            </div>
            {referralCode && (
              <button
                onClick={handleCopyReferralCode}
                className="h-9 px-4 rounded-md text-xs font-medium bg-stone-100 text-black hover:bg-emerald-100"
              >
                Copy
              </button>
            )}
          </div>

          <div className="p-4 rounded-lg border border-stone-800 bg-black">
            <p className="text-xs text-stone-500 mb-2">Referral Benefits</p>
            <ul className="space-y-2 text-sm text-stone-300">
              <li className="flex items-center gap-2">
                <iconify-icon icon="solar:check-circle-linear" width="16" className="text-emerald-500"></iconify-icon>
                <span>Share your referral code with friends</span>
              </li>
              <li className="flex items-center gap-2">
                <iconify-icon icon="solar:check-circle-linear" width="16" className="text-emerald-500"></iconify-icon>
                <span>When they buy stocks, you earn $2.50 per their payment</span>
              </li>
              <li className="flex items-center gap-2">
                <iconify-icon icon="solar:check-circle-linear" width="16" className="text-emerald-500"></iconify-icon>
                <span>Active = paid within last 30 days</span>
              </li>
            </ul>
          </div>

          {/* Submitted Referral Code - show if user has used a referral code */}
          {referredByCode && (
            <div className="p-4 rounded-lg border border-emerald-900 bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-500">Submitted Referred Code</p>
                  <p className="text-lg font-mono font-semibold text-emerald-400 mt-1">{referredByCode}</p>
                  <p className="text-xs text-stone-600 mt-1">This code cannot be changed</p>
                </div>
                <div className="flex items-center gap-2">
                  <iconify-icon icon="solar:lock-closed-linear" width="16" className="text-emerald-500"></iconify-icon>
                  <span className="text-xs text-emerald-500">Locked</span>
                </div>
              </div>
            </div>
          )}

          <InsertReferralCode onSuccess={fetchData} disabled={!!referredByCode} toast={toast} />
        </div>
      </div>

      {/* Active Referrals List */}
      {activeReferrals.length > 0 && (
        <div className="p-6 rounded-xl border border-stone-800 bg-black">
          <h2 className="text-sm font-medium text-stone-100 mb-4">Active Referrals ({activeReferrals.length})</h2>

          <div className="space-y-3">
            {activeReferrals.map((referral, index) => (
              <div key={index} className="p-4 rounded-lg border border-stone-800 bg-black">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-200">{referral.user.displayName || referral.user.email}</p>
                    <p className="text-xs text-stone-600">{referral.user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">$2.50</p>
                    <p className="text-xs text-stone-600">per month</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw History */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-stone-100">Withdraw History</h2>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={(dashboard?.withdrawableBalance || 0) < 2}
            className={`h-9 px-4 rounded-md text-xs font-medium ${
              (dashboard?.withdrawableBalance || 0) < 2
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Request Withdraw
          </button>
        </div>

        {withdrawHistory.length === 0 ? (
          <div className="text-center py-8">
            <iconify-icon icon="solar:wallet-linear" width="48" className="mx-auto text-stone-800 mb-4"></iconify-icon>
            <p className="text-stone-500 mb-2">No withdraw history</p>
            <p className="text-xs text-stone-600">Request a withdraw to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawHistory.map((w) => (
              <div key={w.id} className="p-4 rounded-lg border border-stone-800 bg-black">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-stone-200">${w.netAmount?.toFixed(2)}</p>
                    <p className="text-xs text-stone-500">Fee: ${w.fee?.toFixed(2)}</p>
                  </div>
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
                <p className="text-xs text-stone-600">
                  Requested: {new Date(w.requestedAt).toLocaleDateString()}
                </p>
                {w.processedAt && (
                  <p className="text-xs text-stone-600">
                    Processed: {new Date(w.processedAt).toLocaleDateString()}
                  </p>
                )}
                {w.adminNote && (
                  <p className="text-xs text-stone-500 mt-2">Note: {w.adminNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy Stock Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-stone-100 mb-4">Buy Stock - $10/month</h2>

            <form onSubmit={handleBuySubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Payment Proof (Screenshot)</label>
                <input
                  type="file"
                  onChange={(e) => setPaymentProof(e.target.files[0])}
                  required
                  accept="image/*,.pdf"
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="p-3 rounded-lg border border-stone-800 bg-black">
                <p className="text-xs text-stone-400">Payment Instructions:</p>
                <ul className="mt-2 space-y-1 text-xs text-stone-500">
                  <li>1. Send $10 to: [Your Payment Details]</li>
                  <li>2. Upload screenshot of payment</li>
                  <li>3. Stock ID will be auto-generated</li>
                  <li>4. Wait for admin approval</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBuyModal(false)}
                  className="flex-1 h-10 rounded-lg text-sm font-medium border border-stone-800 text-stone-300 hover:bg-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-stone-100 mb-4">Request Withdraw</h2>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-stone-800 bg-stone-900/50">
                <p className="text-xs text-stone-500">Available Balance</p>
                <p className="text-2xl font-semibold text-blue-400">${(dashboard?.withdrawableBalance || 0).toFixed(2)}</p>
                <p className="text-xs text-stone-600 mt-1">
                  Max withdrawable: ${((dashboard?.withdrawableBalance || 0) - 1).toFixed(2)} (after $1 fee)
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Withdraw Amount ($)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  step="0.01"
                  min="1"
                  max={(dashboard?.withdrawableBalance || 0) - 1}
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-blue-700"
                  placeholder="Enter amount"
                />
              </div>

              <div className="p-3 rounded-lg border border-yellow-900/50 bg-yellow-950/20">
                <div className="flex items-start gap-2">
                  <iconify-icon icon="solar:info-circle-linear" width="16" className="text-yellow-500 mt-0.5"></iconify-icon>
                  <p className="text-xs text-yellow-200/80">
                    A $1 processing fee will be deducted from your withdrawable balance.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                  }}
                  className="flex-1 h-10 rounded-lg text-sm font-medium border border-stone-800 text-stone-300 hover:bg-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWithdrawRequest}
                  className="flex-1 h-10 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsertReferralCode({ onSuccess, disabled, toast }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/subscription/referral/insert', { referralCode: code });
      toast.showSuccess('Referral code applied successfully!');
      setCode('');
      onSuccess();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to apply referral code');
    } finally {
      setLoading(false);
    }
  };

  // Don't show input if user already has a referral code
  if (disabled) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter referral code (only once)"
        className="flex-1 px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-emerald-700"
        maxLength="20"
      />
      <button
        type="submit"
        disabled={loading || !code}
        className="h-10 px-4 rounded-lg text-sm font-medium bg-stone-100 text-black hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Applying...' : 'Apply'}
      </button>
    </form>
  );
}
