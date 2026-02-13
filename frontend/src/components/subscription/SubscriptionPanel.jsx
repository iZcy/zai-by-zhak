import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Pagination from './Pagination';

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
  const [stockFilter, setStockFilter] = useState('ongoing'); // 'ongoing', 'all', 'rejected'
  const [exchangeRate, setExchangeRate] = useState(null);
  const [viewingPaymentProof, setViewingPaymentProof] = useState(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState(null);
  const [cancellingSubscription, setCancellingSubscription] = useState(null);
  // Continue Stock states
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [continuableStocks, setContinuableStocks] = useState([]);
  const [selectedStockToContinue, setSelectedStockToContinue] = useState(null);
  const [continuePaymentProof, setContinuePaymentProof] = useState(null);
  // Account Info states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({
    displayName: '',
    whatsappNumber: '',
    bankProvider: '',
    bankNumber: ''
  });
  // Random transaction suffix (generated once on mount)
  const [transactionSuffix] = useState(() => Math.floor(Math.random() * 900) + 100); // 100-999
  // Pagination states
  const ITEMS_PER_PAGE = 5;
  const [stocksPage, setStocksPage] = useState(1);
  const [referralsPage, setReferralsPage] = useState(1);
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  // Helper function to format IDR price with random suffix
  const formatIdrPrice = (usdAmount) => {
    if (!exchangeRate) return null;
    const baseIdr = Math.floor((usdAmount * exchangeRate) / 1000) * 1000; // Round down to nearest 1000
    return baseIdr + transactionSuffix; // Add random 3 digits
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Fetch exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        setExchangeRate(data.rates.IDR);
      } catch (error) {
        // Failed to fetch exchange rate
      }
    };
    fetchExchangeRate();
  }, []);

  // Update referredByCode when user changes
  useEffect(() => {
    if (user?.referralCodeUsed) {
      setReferredByCode(user.referralCodeUsed);
    } else {
      setReferredByCode(null);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [dashboardRes, referralRes, subscriptionsRes, activeReferralsRes, withdrawRes, continuableRes] = await Promise.all([
        api.get('/subscription/dashboard'),
        api.get('/subscription/referral/code'),
        api.get('/subscription/my'),
        api.get('/subscription/referral/active'),
        api.get('/subscription/withdraw/history').catch(() => ({ data: { withdraws: [] } })),
        api.get('/subscription/continuable').catch(() => ({ data: { continuableStocks: [] } }))
      ]);

      setDashboard(dashboardRes.data.dashboard || { stockCount: 0, activeReferrals: 0, monthlyProfit: 0, netCost: 0, withdrawableBalance: 0 });
      setReferralCode(referralRes.data.referralCode);
      setSubscriptions(subscriptionsRes.data.subscriptions || []);
      setActiveReferrals(activeReferralsRes.data.activeReferrals || []);
      setWithdrawHistory(withdrawRes.data.withdraws || []);
      setContinuableStocks(continuableRes.data.continuableStocks || []);

      // Get the user's referral code used from the current user object (not from initial mount)
      // The user object in AuthContext should have referralCodeUsed from the backend
    } catch (error) {
      // Error fetching subscription data
      // Don't set fallback values - let the UI show empty state
      setDashboard({ stockCount: 0, activeReferrals: 0, monthlyProfit: 0, netCost: 0 });
      setReferralCode('');
      setSubscriptions([]);
      setActiveReferrals([]);
      setReferredByCode(null);
      setContinuableStocks([]);
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

  const handleContinueStock = async (e) => {
    e.preventDefault();

    if (!selectedStockToContinue) {
      toast.showError('Please select a stock to continue');
      return;
    }

    if (!continuePaymentProof) {
      toast.showError('Please provide payment proof');
      return;
    }

    const formData = new FormData();
    formData.append('paymentProof', continuePaymentProof);

    try {
      const response = await api.post(`/subscription/continue/${selectedStockToContinue.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.showSuccess('Continuation request submitted! Wait for admin approval.');
      setShowContinueModal(false);
      setSelectedStockToContinue(null);
      setContinuePaymentProof(null);
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to submit continuation request');
    }
  };

  // Check if user has pending stocks
  const hasPendingStocks = subscriptions.some(sub => sub.status === 'pending');

  // Filter subscriptions based on stockFilter
  // "ongoing" shows both active and pending stocks
  // "rejected" shows rejected and cancelled stocks (cancelled was old rejection status)
  // "all" shows everything
  const filteredSubscriptions = stockFilter === 'ongoing'
    ? subscriptions.filter(sub => (sub.isActive && !sub.isExpired) || sub.status === 'pending')
    : stockFilter === 'rejected'
    ? subscriptions.filter(sub => sub.status === 'rejected' || sub.status === 'cancelled')
    : subscriptions;

  // Pagination calculations
  const stocksTotalPages = Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE);
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (stocksPage - 1) * ITEMS_PER_PAGE,
    stocksPage * ITEMS_PER_PAGE
  );

  const referralsTotalPages = Math.ceil(activeReferrals.length / ITEMS_PER_PAGE);
  const paginatedReferrals = activeReferrals.slice(
    (referralsPage - 1) * ITEMS_PER_PAGE,
    referralsPage * ITEMS_PER_PAGE
  );

  // Reset pagination when filter changes
  useEffect(() => {
    setStocksPage(1);
  }, [stockFilter]);

  const handleViewPaymentProof = async (sub) => {
    if (!sub.paymentProof) return;
    try {
      const response = await api.get(`/subscription/payment-proof/${sub.id}`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setPaymentProofUrl(url);
      setViewingPaymentProof(sub);
    } catch (error) {
      toast.showError('Failed to load payment proof');
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancellingSubscription) return;
    try {
      await api.post(`/subscription/cancel/${cancellingSubscription.id}`);
      toast.showSuccess('Subscription cancelled successfully');
      setCancellingSubscription(null);
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  // Account Info handlers
  const handleOpenAccountModal = async () => {
    try {
      const response = await api.get('/auth/profile');
      const profile = response.data.user;
      setAccountForm({
        displayName: profile.displayName || '',
        whatsappNumber: profile.whatsappNumber || '',
        bankProvider: profile.bankProvider || '',
        bankNumber: profile.bankNumber || ''
      });
      setShowAccountModal(true);
    } catch (error) {
      toast.showError('Failed to load profile');
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', accountForm);
      toast.showSuccess('Account info updated successfully!');
      setShowAccountModal(false);
      await refreshUser();
      fetchData();
    } catch (error) {
      toast.showError(error.response?.data?.message || 'Failed to update account');
    }
  };

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
            <span className="text-xs font-medium text-stone-500">Monthly Cost</span>
            <iconify-icon icon="solar:calculator-linear" width="20" className="text-stone-700"></iconify-icon>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-stone-200">
              ${((dashboard?.activeStocksCount || 0) * 10).toFixed(2)}
            </span>
            <p className="text-xs text-stone-600 mt-1">
              {(dashboard?.activeStocksCount || 0) > 0 ? `${dashboard.activeStocksCount} stock(s) × $10` : 'No active stocks'}
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

      {/* Account Info */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-stone-100">Account Info</h2>
          <button
            onClick={handleOpenAccountModal}
            className="h-9 px-4 rounded-md text-xs font-medium border border-stone-700 text-stone-300 hover:bg-stone-900"
          >
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-stone-800 bg-black">
            <p className="text-xs text-stone-500">Email</p>
            <p className="text-sm text-stone-300 mt-1">{user?.email}</p>
            <p className="text-xs text-stone-600 mt-1">Cannot be changed</p>
          </div>

          <div className="p-4 rounded-lg border border-stone-800 bg-black">
            <p className="text-xs text-stone-500">Display Name</p>
            <p className="text-sm text-stone-300 mt-1">{user?.displayName || '-'}</p>
          </div>

          <div className="p-4 rounded-lg border border-stone-800 bg-black">
            <p className="text-xs text-stone-500">WhatsApp Number</p>
            <p className="text-sm text-stone-300 mt-1">{user?.whatsappNumber || '-'}</p>
            <p className="text-xs text-stone-600 mt-1">e.g. 62825252525</p>
          </div>

          <div className="p-4 rounded-lg border border-stone-800 bg-black">
            <p className="text-xs text-stone-500">Bank Info</p>
            <p className="text-sm text-stone-300 mt-1">
              {user?.bankProvider || user?.bankNumber
                ? `${user?.bankProvider || ''} ${user?.bankNumber ? '- ' + user.bankNumber : ''}`
                : '-'}
            </p>
            <p className="text-xs text-stone-600 mt-1">e.g. BCA - 7540249843</p>
          </div>
        </div>
      </div>

      {/* My Stocks */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-stone-100">My Stocks</h2>
            <button
              onClick={() => setShowBuyModal(true)}
              disabled={dashboard?.hasActiveSubscription || hasPendingStocks}
              className={`h-7 px-3 rounded-md text-xs font-medium ${
                dashboard?.hasActiveSubscription || hasPendingStocks
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {dashboard?.hasActiveSubscription ? 'Active Stock Exists' : hasPendingStocks ? 'Pending Request' : 'Buy Stock'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockFilter('ongoing')}
              className={`px-2 py-1 rounded text-xs font-medium ${
                stockFilter === 'ongoing'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Ongoing
            </button>
            <button
              onClick={() => setStockFilter('rejected')}
              className={`px-2 py-1 rounded text-xs font-medium ${
                stockFilter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Rejected
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
            <p className="text-stone-500 mb-2">
              {stockFilter === 'ongoing' ? 'No ongoing stocks' : stockFilter === 'rejected' ? 'No rejected stocks' : 'No stocks yet'}
            </p>
            <p className="text-xs text-stone-600">
              {stockFilter === 'ongoing' ? 'No active or pending stocks' : stockFilter === 'rejected' ? 'Rejected requests will appear here' : 'Buy your first stock to access API'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedSubscriptions.map((sub) => (
              <div key={sub.id} className={`p-4 rounded-lg border bg-black ${sub.status === 'rejected' ? 'border-red-900/50' : 'border-stone-800'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-stone-200">{sub.stockId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        sub.status === 'active' && sub.isActive && !sub.isExpired
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                          : sub.status === 'pending'
                          ? 'bg-yellow-950 text-yellow-300 border border-yellow-900'
                          : sub.status === 'rejected' || sub.status === 'cancelled'
                          ? 'bg-red-950 text-red-300 border border-red-900'
                          : 'bg-stone-900 text-stone-400 border border-stone-800'
                      }`}>
                        {sub.status === 'cancelled' ? 'Rejected' : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                      {sub.activeUntil && (
                        <span className="text-xs text-stone-600">
                          Until: {new Date(sub.activeUntil).toLocaleDateString()}
                        </span>
                      )}
                      {sub.isContinuation && sub.continuedFrom && (
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                          <iconify-icon icon="solar:refresh-linear" width="12"></iconify-icon>
                          Continued from {sub.continuedFrom.stockId}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-stone-200">$10.00</p>
                    <p className="text-xs text-stone-600">per month</p>
                  </div>
                </div>

                {/* Rejection Reason */}
                {(sub.status === 'rejected' || sub.status === 'cancelled') && (
                  <div className="mt-3 p-3 rounded-lg bg-red-950/20 border border-red-900/50">
                    <div className="flex items-start gap-2">
                      <iconify-icon icon="solar:info-circle-linear" width="16" className="text-red-400 mt-0.5 flex-shrink-0"></iconify-icon>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-red-400 font-medium">Rejection Reason</p>
                          {sub.rejectedAt && (
                            <p className="text-xs text-stone-500">
                              {new Date(sub.rejectedAt).toLocaleDateString()} {new Date(sub.rejectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-stone-300 mt-1">{sub.rejectionReason || 'No reason provided'}</p>
                      </div>
                    </div>
                  </div>
                )}

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

                {/* View Receipt button for all stocks with payment proof */}
                {sub.paymentProof && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleViewPaymentProof(sub)}
                      className="flex-1 h-8 px-3 rounded text-xs font-medium border border-stone-700 text-stone-300 hover:bg-stone-800"
                    >
                      View Receipt
                    </button>
                    {/* Cancel button only for pending subscriptions */}
                    {sub.status === 'pending' && (
                      <button
                        onClick={() => setCancellingSubscription(sub)}
                        className="flex-1 h-8 px-3 rounded text-xs font-medium border border-red-900 text-red-400 hover:bg-red-950"
                      >
                        Cancel Request
                      </button>
                    )}
                    {/* Continue Stock button for active (non-expired) stocks only */}
                    {(() => {
                      const continuableStock = continuableStocks.find(s => String(s.id) === String(sub.id));
                      const isActiveAndNotExpired = sub.status === 'active' && sub.isActive && !sub.isExpired;
                      if (continuableStock && isActiveAndNotExpired && !hasPendingStocks) {
                        return (
                          <button
                            onClick={() => {
                              setSelectedStockToContinue(continuableStock);
                              setShowContinueModal(true);
                            }}
                            className="flex-1 h-8 px-3 rounded text-xs font-medium border border-blue-700 text-blue-400 hover:bg-blue-950 flex items-center justify-center gap-1"
                          >
                            <iconify-icon icon="solar:refresh-linear" width="14"></iconify-icon>
                            Continue
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Continue Stock button for active stocks without payment proof */}
                {!sub.paymentProof && (() => {
                  const continuableStock = continuableStocks.find(s => String(s.id) === String(sub.id));
                  const isActiveAndNotExpired = sub.status === 'active' && sub.isActive && !sub.isExpired;
                  if (continuableStock && isActiveAndNotExpired && !hasPendingStocks) {
                    return (
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            setSelectedStockToContinue(continuableStock);
                            setShowContinueModal(true);
                          }}
                          className="w-full h-8 px-3 rounded text-xs font-medium border border-blue-700 text-blue-400 hover:bg-blue-950 flex items-center justify-center gap-1"
                        >
                          <iconify-icon icon="solar:refresh-linear" width="14"></iconify-icon>
                          Continue Stock
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ))}
          </div>
        )}
        <Pagination
          currentPage={stocksPage}
          totalPages={stocksTotalPages}
          totalItems={filteredSubscriptions.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setStocksPage}
        />
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
                <span>Enter a referral code to get <span className="text-emerald-400 font-medium">$2.50 bonus</span></span>
              </li>
              <li className="flex items-center gap-2">
                <iconify-icon icon="solar:check-circle-linear" width="16" className="text-emerald-500"></iconify-icon>
                <span>Share your referral code with friends</span>
              </li>
              <li className="flex items-center gap-2">
                <iconify-icon icon="solar:check-circle-linear" width="16" className="text-emerald-500"></iconify-icon>
                <span>When they buy stocks, you earn $2.50 per their payment</span>
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
            {paginatedReferrals.map((referral, index) => (
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
          <Pagination
            currentPage={referralsPage}
            totalPages={referralsTotalPages}
            totalItems={activeReferrals.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setReferralsPage}
          />
        </div>
      )}

      {/* Withdraw History */}
      <div className="p-6 rounded-xl border border-stone-800 bg-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-stone-100">Withdraw History</h2>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={(dashboard?.withdrawableBalance || 0) < 2 || !dashboard?.hasActiveSubscription}
            className={`h-9 px-4 rounded-md text-xs font-medium ${
              (dashboard?.withdrawableBalance || 0) < 2 || !dashboard?.hasActiveSubscription
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Request Withdraw
          </button>
          {!dashboard?.hasActiveSubscription && (dashboard?.withdrawableBalance || 0) >= 2 && (
            <p className="text-xs text-stone-600 mt-2">Requires active stock to withdraw</p>
          )}
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
            <h2 className="text-lg font-medium text-stone-100">Buy Stock</h2>

            {/* Price Display */}
            <div className="mt-4 mb-6 p-4 rounded-lg border border-emerald-900/50 bg-emerald-950/20 text-center">
              <p className="text-3xl font-bold text-emerald-400">$10</p>
              <p className="text-sm text-stone-400 mt-1">per month</p>
              {exchangeRate && (
                <p className="text-lg font-semibold text-stone-300 mt-2">
                  Rp{formatIdrPrice(10)?.toLocaleString()}
                </p>
              )}
            </div>

            {exchangeRate && (
              <p className="text-xs text-stone-600 mb-4 text-center">
                * IDR rate is dynamic based on global currency rate. Last 3 digits are unique transaction code.
              </p>
            )}

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
                  <li>1. Send payment to:</li>
                  <li className="pl-4 text-stone-300 font-medium">BCA 7540249843</li>
                  <li className="pl-4 text-stone-300 font-medium">a.n. Yitzhak Edmund Tio Manalu</li>
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

      {/* View Payment Proof Modal */}
      {viewingPaymentProof && paymentProofUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-stone-100">Payment Receipt</h2>
              <button
                onClick={() => {
                  setViewingPaymentProof(null);
                  URL.revokeObjectURL(paymentProofUrl);
                  setPaymentProofUrl(null);
                }}
                className="text-stone-500 hover:text-stone-300"
              >
                ✕
              </button>
            </div>
            <div className="rounded-lg overflow-hidden border border-stone-800">
              <img
                src={paymentProofUrl}
                alt="Payment Proof"
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            </div>
            <p className="text-xs text-stone-600 mt-3">
              Stock ID: {viewingPaymentProof.stockId}
            </p>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {cancellingSubscription && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-stone-100 mb-4">Cancel Subscription Request</h2>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg border border-stone-800 bg-black">
                <p className="text-xs text-stone-500">Stock ID</p>
                <p className="text-sm text-stone-200 font-mono">{cancellingSubscription.stockId}</p>
              </div>

              <div className="p-3 rounded-lg border border-yellow-900/50 bg-yellow-950/20">
                <div className="flex items-start gap-2">
                  <iconify-icon icon="solar:danger-triangle-linear" width="16" className="text-yellow-500 mt-0.5"></iconify-icon>
                  <p className="text-xs text-yellow-200/80">
                    Are you sure you want to cancel this subscription request? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancellingSubscription(null)}
                className="flex-1 h-10 rounded-lg text-sm font-medium border border-stone-800 text-stone-300 hover:bg-stone-900"
              >
                Keep Request
              </button>
              <button
                onClick={handleCancelSubscription}
                className="flex-1 h-10 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Stock Modal */}
      {showContinueModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium text-stone-100 mb-4">Continue Stock - $10/month</h2>

            <form onSubmit={handleContinueStock} className="space-y-4">
              {/* Stock Selection */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-2">Select Stock to Continue</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {continuableStocks.map((stock) => (
                    <div
                      key={stock.id}
                      onClick={() => setSelectedStockToContinue(stock)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStockToContinue?.id === stock.id
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-stone-200">{stock.stockId}</p>
                          <p className="text-xs text-stone-500">
                            Current expiry: {new Date(stock.currentExpiry).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {stock.isExpired ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-900">
                              Expired
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-900">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Show new calculated expiry */}
              {selectedStockToContinue && (
                <div className="p-3 rounded-lg border border-blue-900/50 bg-blue-950/20">
                  <div className="flex items-start gap-2">
                    <iconify-icon icon="solar:calendar-linear" width="16" className="text-blue-400 mt-0.5"></iconify-icon>
                    <div>
                      <p className="text-xs text-blue-400 font-medium">New Active Period</p>
                      <p className="text-sm text-stone-300 mt-1">
                        Until: {new Date(selectedStockToContinue.newExpiry).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        (Previous expiry + 30 days)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Proof */}
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Payment Proof (Screenshot)</label>
                <input
                  type="file"
                  onChange={(e) => setContinuePaymentProof(e.target.files[0])}
                  required
                  accept="image/*,.pdf"
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-blue-700"
                />
              </div>

              {/* Payment Instructions */}
              <div className="p-3 rounded-lg border border-stone-800 bg-black">
                <p className="text-xs text-stone-400">Payment Instructions:</p>
                <ul className="mt-2 space-y-1 text-xs text-stone-500">
                  <li>1. Send payment to:</li>
                  <li className="pl-4 text-stone-300 font-medium">BCA 7540249843</li>
                  <li className="pl-4 text-stone-300 font-medium">a.n. Yitzhak Edmund Tio Manalu</li>
                  <li>2. Upload screenshot of payment</li>
                  <li>3. New stock ID will be auto-generated</li>
                  <li>4. Wait for admin approval</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowContinueModal(false);
                    setSelectedStockToContinue(null);
                    setContinuePaymentProof(null);
                  }}
                  className="flex-1 h-10 rounded-lg text-sm font-medium border border-stone-800 text-stone-300 hover:bg-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStockToContinue || !continuePaymentProof}
                  className="flex-1 h-10 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Info Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-black border border-stone-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-stone-100 mb-4">Edit Account Info</h2>

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Email</label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-stone-900 text-stone-500 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-stone-600 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={accountForm.displayName}
                  onChange={(e) => setAccountForm({ ...accountForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-emerald-700"
                  placeholder="Enter display name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={accountForm.whatsappNumber}
                  onChange={(e) => setAccountForm({ ...accountForm, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-emerald-700"
                  placeholder="e.g. 62825252525"
                />
                <p className="text-xs text-stone-600 mt-1">Include country code without +</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Bank Provider</label>
                <input
                  type="text"
                  value={accountForm.bankProvider}
                  onChange={(e) => setAccountForm({ ...accountForm, bankProvider: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-emerald-700"
                  placeholder="e.g. BCA"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Bank Number</label>
                <input
                  type="text"
                  value={accountForm.bankNumber}
                  onChange={(e) => setAccountForm({ ...accountForm, bankNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-800 bg-black text-stone-200 text-sm focus:outline-none focus:border-emerald-700"
                  placeholder="e.g. 7540249843"
                />
                <p className="text-xs text-stone-600 mt-1">For receiving withdrawal payments</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 h-10 rounded-lg text-sm font-medium border border-stone-800 text-stone-300 hover:bg-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
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
