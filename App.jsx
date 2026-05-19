import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const API = 'http://localhost:5000';

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-indigo-500',
  };
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl text-white font-semibold shadow-2xl transition-all ${colors[toast.type] || 'bg-gray-700'}`}>
      <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>{toast.msg}</span>
    </div>
  );
}

// ─── Logout Confirmation Modal ─────────────────────────────────────────────────
function LogoutConfirm({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-600 rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 text-center">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-white mb-2">Logout?</h2>
        <p className="text-gray-400 mb-6">Are you sure you want to logout?</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold transition"
          >
            No, Stay
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition"
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Modal (Sign In / Sign Up) ───────────────────────────────────────────
function AuthModal({ mode, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [localMode, setLocalMode] = useState(mode);
  const [registerSent, setRegisterSent] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.password) return showToast('error', 'Email and password are required.');
    if (localMode === 'register' && !form.username) return showToast('error', 'Username is required.');
    setLoading(true);
    try {
      if (localMode === 'register') {
        const res = await fetch(`${API}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
          setRegisterSent(true);
          showToast('success', 'Verification email sent! Check your inbox. 📧');
        } else {
          showToast('error', data.msg || 'Registration failed.');
        }
      } else {
        const res = await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
          showToast('success', 'Welcome back! 🎉');
          onSuccess(data.access_token);
        } else {
          showToast('error', data.msg || 'Authentication failed.');
        }
      }
    } catch {
      showToast('error', 'Server error. Is backend running?');
    }
    setLoading(false);
  };

  const handleGoogle = async (credentialResponse) => {
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        showToast('success', 'Signed in with Google! 🎉');
        onSuccess(data.access_token);
      } else {
        showToast('error', data.msg || 'Google auth failed.');
      }
    } catch {
      showToast('error', 'Google sign-in failed. Is backend running?');
    }
  };

  if (registerSent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-extrabold text-white mb-3">Check Your Email!</h2>
          <p className="text-gray-400 mb-6">
            We've sent a verification link to <span className="text-cyan-400 font-semibold">{form.email}</span>.
            Click the link to verify and then sign in.
          </p>
          <button
            onClick={() => { setRegisterSent(false); setLocalMode('login'); }}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold rounded-xl transition"
          >
            Go to Sign In
          </button>
          <button onClick={onClose} className="mt-3 text-gray-500 hover:text-gray-300 text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-5 text-gray-500 hover:text-white text-2xl font-bold">&times;</button>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{localMode === 'login' ? '🔑' : '🚀'}</div>
          <h2 className="text-2xl font-extrabold text-white">
            {localMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {localMode === 'login' ? 'Sign in to access your history' : 'Register to save your search history'}
          </p>
        </div>

        {/* Google Button */}
        <div className="flex justify-center mb-5">
          <GoogleLogin
            onSuccess={handleGoogle}
            onError={() => showToast('error', 'Google Login Failed')}
            theme="filled_blue"
            shape="pill"
            text={localMode === 'login' ? 'signin_with' : 'signup_with'}
          />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="text-xs text-gray-500 uppercase font-bold">or email</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>

        <div className="space-y-3">
          {localMode === 'register' && (
            <input
              type="text"
              placeholder="Username"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold rounded-xl transition shadow-lg disabled:opacity-50"
          >
            {loading ? 'Please wait...' : localMode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          {localMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => setLocalMode(localMode === 'login' ? 'register' : 'login')}
            className="ml-2 text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {localMode === 'login' ? 'Register now' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Search History Panel ──────────────────────────────────────────────────────
function HistoryPanel({ token, onSearch, refreshKey, onSessionExpired }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/api/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401 || r.status === 422) {
          // Token expired or invalid — trigger re-login
          onSessionExpired();
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setHistory(d.history || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load history. Check your connection.');
        setLoading(false);
      });
  }, [token]);

  // Re-fetch whenever refreshKey changes (after new search) or token changes
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/api/history/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // silently ignore
    }
  };

  const handleClearAll = async () => {
    try {
      await fetch(`${API}/api/history/clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory([]);
    } catch {
      // silently ignore
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          🕒 Your Search History
        </h3>
        <div className="flex gap-2">
          <button
            onClick={fetchHistory}
            className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition flex items-center gap-1"
          >
            🔄 Refresh
          </button>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded-lg transition"
            >
              🗑 Clear All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchHistory}
            className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm underline"
          >
            Try again
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-400 font-medium">No searches yet!</p>
          <p className="text-gray-600 text-sm mt-1">Your search history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600/80 rounded-xl transition group"
            >
              <button
                onClick={() => onSearch(item.keyword)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-sm">🔍</span>
                  <span className="text-gray-200 text-sm font-medium capitalize">{item.keyword}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5 ml-5">{formatDate(item.date)}</div>
              </button>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-cyan-400 text-xs opacity-0 group-hover:opacity-100 transition">Search again →</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  className="text-gray-600 hover:text-red-400 transition text-sm"
                  title="Remove from history"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick Recent Searches Dashboard Overlay ──────────────────────────────────
function RecentSearchesPreview({ token, onSearch, refreshKey }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r && r.ok ? r.json() : null)
      .then((d) => {
        if (d) setHistory(d.history?.slice(0, 5) || []);
      })
      .catch(() => {});
  }, [token, refreshKey]);

  if (history.length === 0) return null;

  return (
    <div className="w-full">
      <span className="text-xs text-gray-500 uppercase tracking-widest block mb-3">Recently Searched:</span>
      <div className="flex flex-wrap justify-center gap-3">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSearch(item.keyword)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-sm text-gray-300 transition-all flex items-center gap-2 hover:border-cyan-500/50"
          >
            <span>🔍</span>
            <span className="capitalize">{item.keyword}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


// ─── Wishlist Panel ───────────────────────────────────────────────────────────
function WishlistPanel({ token, showToast, onSessionExpired }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401 || r.status === 422) {
          onSessionExpired();
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setWishlist(d.wishlist || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const removeWish = async (id) => {
    try {
      const res = await fetch(`${API}/api/wishlist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWishlist((prev) => prev.filter((w) => w.id !== id));
        showToast('info', 'Removed from wishlist.');
      }
    } catch {
      showToast('error', 'Failed to remove from wishlist.');
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          ❤️ Your Wishlist
        </h3>
        <button
          onClick={fetchWishlist}
          className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">❤️</div>
          <p className="text-gray-400 font-medium">Your wishlist is empty!</p>
          <p className="text-gray-600 text-sm mt-1">Found something you like? Add it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wishlist.map((item) => (
            <div key={item.id} className="flex gap-4 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition border border-transparent hover:border-indigo-500/30 group relative">
              {item.image && (
                <div className="w-16 h-16 rounded-lg bg-white p-1 overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-200 line-clamp-1 mb-1">{item.name}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">₹{item.price?.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full uppercase tracking-tight">{item.store}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition text-center"
                >
                  Buy Now
                </a>
                <button
                  onClick={() => removeWish(item.id)}
                  className="text-gray-500 hover:text-red-400 text-xs transition underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'history' | 'wishlist'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0); // increment to force history refresh

  // Show toast helper
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Helper: get display name from user object
  const getUserDisplay = (u) => {
    if (!u) return '';
    if (typeof u === 'string') return u;
    return u.username || u.name || u.email || 'User';
  };

  const getUserInitial = (u) => {
    const display = getUserDisplay(u);
    return display.charAt(0).toUpperCase() || 'U';
  };

  // Init user from stored token
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // User claims are now safely at the top level, or fallback to sub if only ID is needed
        const identity = {
          id: decoded.id || decoded.sub,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role
        };
        setUser(identity);
      } catch {
        localStorage.removeItem('token');
        setToken('');
      }
    }
  }, [token]);

  // Handle email verification link
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const t = path.split('/')[2];
      fetch(`${API}/api/auth/verify/${t}`)
        .then((r) => r.json())
        .then((d) => {
          showToast('success', d.msg || 'Email verified! You can now sign in.');
          window.history.replaceState({}, '', '/');
        });
    }
  }, []);

  const handleAuthSuccess = (newToken) => {
    setToken(newToken);
    try {
      const decoded = jwtDecode(newToken);
      const identity = {
        id: decoded.id || decoded.sub,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
      setUser(identity);
    } catch {}
    setAuthModal(null);
    setActiveTab('dashboard');
    showToast('success', 'Logged in successfully! 🎉');
  };

  const handleLogoutConfirm = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setShowLogoutConfirm(false);
    setActiveTab('dashboard');
    googleLogout();
    showToast('info', 'You have been logged out.');
  };

  const doSearch = useCallback(async (kw) => {
    const searchKeyword = (kw || keyword).trim();
    if (!searchKeyword) return;
    setKeyword(searchKeyword);
    setLoading(true);
    setAnalytics(null);
    setProducts([]);
    try {
      const res = await fetch(`${API}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ keyword: searchKeyword }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        showToast('error', data.error || data.msg || 'Search failed');
        setLoading(false);
        return;
      }

      setProducts(data.products || []);

      // If it was a generic search (not a direct URL), fetch analytics
      if (!searchKeyword.startsWith('http') && data.products?.length > 0) {
        const statsRes = await fetch(
          `${API}/api/product/analytics?keyword=${encodeURIComponent(searchKeyword)}`,
          { headers: { ...(token && { Authorization: `Bearer ${token}` }) } }
        );
        const statsData = await statsRes.json();
        setAnalytics(statsData);
      }

      // ✅ Increment history refresh key so history panel auto-refreshes
      if (token) {
        setHistoryRefreshKey((k) => k + 1);
      }
    } catch {
      showToast('error', 'Backend connection failed. Make sure Flask is running on port 5000.');
    }
    setLoading(false);
  }, [keyword, token]);

  const lineChartData = analytics?.history_data?.length > 0 ? {
    labels: analytics.history_data.map((h) => new Date(h.date).toLocaleDateString()),
    datasets: [{
      label: 'Historical Price',
      data: analytics.history_data.map((h) => h.price),
      borderColor: 'rgb(34, 211, 238)',
      backgroundColor: 'rgba(34, 211, 238, 0.1)',
      tension: 0.4,
    }],
  } : null;

  const compareChartData = products.length > 0 ? (() => {
    const storeBest = {};
    products.forEach(p => {
      if (!storeBest[p.store] || p.price < storeBest[p.store]) {
        storeBest[p.store] = p.price;
      }
    });
    const entries = Object.entries(storeBest).sort((a, b) => a[1] - b[1]).slice(0, 7);
    return {
      labels: entries.map(e => e[0]),
      datasets: [{
        label: 'Best Price',
        data: entries.map(e => e[1]),
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(34, 211, 238, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderRadius: 8,
      }],
    };
  })() : null;

  const addToWishlist = async (product) => {
    if (!user) {
      showToast('info', 'Please login to save products to your wishlist.');
      setAuthModal('login');
      return;
    }

    try {
      const res = await fetch(`${API}/api/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          store: product.store,
          link: product.link,
          image: product.image
        })
      });
      if (res.ok) {
        showToast('success', 'Added to Wishlist! ❤️');
      } else {
        showToast('error', 'Failed to add to wishlist');
      }
    } catch {
      showToast('error', 'Backend connection error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Toast toast={toast} />
      {showLogoutConfirm && (
        <LogoutConfirm onConfirm={handleLogoutConfirm} onCancel={() => setShowLogoutConfirm(false)} />
      )}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
          showToast={showToast}
        />
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 glass-card border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 transition-transform hover:scale-105 cursor-pointer">
          <div className="w-10 h-10 btn-premium rounded-xl flex items-center justify-center text-xl shadow-indigo-500/40">
            🤖
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-gradient">
            AI PRICE INTEL
          </h1>
        </div>

        {/* Nav Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            🏠 Dashboard
          </button>
          <button
            onClick={() => {
              if (!user) {
                showToast('info', 'Please login to see your search history.');
                setAuthModal('login');
              } else {
                setActiveTab('history');
                // Refresh history when switching to tab
                setHistoryRefreshKey((k) => k + 1);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            🕒 My History {!user && <span className="ml-1 text-xs opacity-60">(Login)</span>}
          </button>
          <button
            onClick={() => {
              if (!user) {
                showToast('info', 'Please login to see your wishlist.');
                setAuthModal('login');
              } else {
                setActiveTab('wishlist');
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'wishlist' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            ❤️ Wishlist
          </button>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold">
                  {getUserInitial(user)}
                </div>
                <span className="text-sm font-medium text-gray-200 max-w-[120px] truncate">
                  {getUserDisplay(user)}
                </span>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setAuthModal('login')}
                className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition"
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthModal('register')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition shadow-lg"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* History Tab */}
        {activeTab === 'history' && user && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-white">🕒 My Search History</h2>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1"
              >
                ← Back to Dashboard
              </button>
            </div>
            <HistoryPanel
              token={token}
              refreshKey={historyRefreshKey}
              onSearch={(kw) => { setActiveTab('dashboard'); doSearch(kw); }}
              onSessionExpired={() => {
                // Token is expired / invalid — clear and prompt re-login
                localStorage.removeItem('token');
                setToken('');
                setUser(null);
                setActiveTab('dashboard');
                googleLogout();
                setAuthModal('login');
              }}
            />
          </div>
        )}

        {/* Wishlist Tab */}
        {activeTab === 'wishlist' && user && (
          <div className="max-w-2xl mx-auto">
             <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-white">❤️ My Wishlist</h2>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1"
              >
                ← Back to Dashboard
              </button>
            </div>
            <WishlistPanel
              token={token}
              showToast={showToast}
              onSessionExpired={() => {
                localStorage.removeItem('token');
                setToken('');
                setUser(null);
                setActiveTab('dashboard');
                googleLogout();
                setAuthModal('login');
              }}
            />
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Hero / Search */}
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
                Compare Prices with{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  AI Intelligence
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Search any product and get real-time comparisons, price predictions, and AI insights.
                {!user && (
                  <span className="text-indigo-400 ml-2">
                    <button onClick={() => setAuthModal('register')} className="underline hover:text-indigo-300">
                      Sign up
                    </button>
                    {' '}to save your search history.
                  </span>
                )}
              </p>
              {/* Search Box */}
              <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto group">
                <div className="relative flex-1">
                   <input
                    type="text"
                    className="w-full bg-gray-900/50 border-2 border-white/5 rounded-3xl px-8 py-5 text-xl text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-gray-500 shadow-2xl backdrop-blur-xl"
                    placeholder="Search product (e.g. iPhone 15 Pro, RTX 4090)..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors">
                    ⌘K
                  </div>
                </div>
                <button
                  onClick={() => doSearch()}
                  disabled={loading}
                  className="btn-premium text-white font-black px-10 py-5 rounded-3xl shadow-2xl transition-all disabled:opacity-50 whitespace-nowrap text-lg flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : '🔍 Analyze Now'}
                </button>
              </div>

              {/* Quick History Preview */}
              {user && !loading && !analytics && products.length === 0 && (
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                   <RecentSearchesPreview token={token} onSearch={(kw) => doSearch(kw)} refreshKey={historyRefreshKey} />
                </div>
              )}
            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-pulse">
                <div className="xl:col-span-2 space-y-4">
                  <div className="h-48 bg-gray-800 rounded-2xl"></div>
                  <div className="h-64 bg-gray-800 rounded-2xl"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-40 bg-gray-800 rounded-2xl"></div>
                  <div className="h-40 bg-gray-800 rounded-2xl"></div>
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && (products.length > 0 || analytics) && (
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Categorization Sidebar */}
                {products.length > 0 && (
                  <aside className="lg:w-48 flex-shrink-0">
                    <div className="sticky top-24 space-y-2">
                       <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 px-2">Categories</h3>
                       {[
                         { id: 'All', name: 'All Products', icon: '🌐' },
                         { id: 'Phones', name: 'Phones', icon: '📱' },
                         { id: 'Chargers', name: 'Chargers', icon: '🔌' },
                         { id: 'TVs', name: 'TVs', icon: '📺' },
                         { id: 'Headphones', name: 'Headphones', icon: '🎧' }
                       ].map(cat => (
                         <button
                           key={cat.id}
                           onClick={() => setSelectedCategory(cat.id)}
                           className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                             selectedCategory === cat.id 
                               ? 'btn-premium text-white shadow-lg' 
                               : 'bg-gray-900/40 text-gray-400 hover:bg-gray-800 hover:text-white border border-white/5'
                           }`}
                         >
                           <span className="text-xl">{cat.icon}</span>
                           <span>{cat.name}</span>
                         </button>
                       ))}
                    </div>
                  </aside>
                )}

                <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6">

                  {/* Left: Products & Charts */}
                  <section className="xl:col-span-2 space-y-6">

                    {/* Product Table */}
                    {products.length > 0 && (
                      <div className="glass-card rounded-[2rem] p-8 overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-2xl font-black flex items-center gap-3">
                            <span className="p-2 btn-premium rounded-lg text-sm">📊</span> 
                            {selectedCategory === 'All' ? 'Market Comparison' : `${selectedCategory} Results`}
                            <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-gray-500 font-medium">
                              {products.filter(p => {
                                if (selectedCategory === 'All') return true;
                                const n = p.name.toLowerCase();
                                if (selectedCategory === 'Phones') return n.includes('phone') || n.includes('mobile') || n.includes('iphone') || n.includes('galaxy') || n.includes('redmi') || n.includes('realme');
                                if (selectedCategory === 'Chargers') return n.includes('charger') || n.includes('adapter') || n.includes('cable') ;
                                if (selectedCategory === 'TVs') return n.includes('tv') || n.includes('television');
                                if (selectedCategory === 'Headphones') return n.includes('headphone') || n.includes('earphone') || n.includes('buds') || n.includes('airpods') ;
                                return false;
                              }).length} Matches
                            </span>
                          </h2>
                        </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                              <th className="py-3 px-3">Platform</th>
                              <th className="py-3 px-3">Product</th>
                              <th className="py-3 px-3">Price</th>
                              <th className="py-3 px-3">Badge</th>
                              <th className="py-3 px-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products
                              .filter(p => {
                                if (selectedCategory === 'All') return true;
                                const n = p.name.toLowerCase();
                                if (selectedCategory === 'Phones') return n.includes('phone') || n.includes('mobile') || n.includes('iphone') || n.includes('galaxy') || n.includes('redmi') || n.includes('realme');
                                if (selectedCategory === 'Chargers') return n.includes('charger') || n.includes('adapter') || n.includes('cable') ;
                                if (selectedCategory === 'TVs') return n.includes('tv') || n.includes('television');
                                if (selectedCategory === 'Headphones') return n.includes('headphone') || n.includes('earphone') || n.includes('buds') || n.includes('airpods') ;
                                return false;
                              })
                              .slice(0, 30).map((p, idx) => (
                              <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition">
                                <td className="py-3 px-3 font-semibold text-gray-300 text-sm">{p.store}</td>
                                <td className="py-3 px-3">
                                  {p.link ? (
                                    <a
                                      href={p.link}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      className="text-sm text-gray-200 hover:text-cyan-400 font-medium transition line-clamp-2"
                                      title={p.name}
                                    >
                                      {p.name}
                                    </a>
                                  ) : (
                                    <span className="text-sm text-gray-400 line-clamp-2">{p.name}</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-base font-bold text-emerald-400">₹{p.price?.toLocaleString()}</td>
                                <td className="py-3 px-3">
                                  {idx === 0 && (
                                    <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-[10px] rounded-full font-black border border-white/10 shadow-lg shadow-cyan-500/20">
                                      SMART BUY ✨
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {p.link ? (
                                    <div className="flex items-center gap-3">
                                      <a
                                        href={p.link}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium hover:underline transition"
                                      >
                                        View Deal <span className="text-xs">↗</span>
                                      </a>
                                      <button
                                        onClick={() => addToWishlist(p)}
                                        className="p-1.5 bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition"
                                        title="Add to Wishlist"
                                      >
                                        ❤️
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-600 text-sm">No link</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Line Chart */}
                    {lineChartData && (
                      <div className="glass-card rounded-3xl p-8 hover:bg-white/[0.02] transition-colors">
                        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                           <span className="text-indigo-400">📈</span> 30-Day Trend
                        </h2>
                        <div className="h-64">
                          <Line data={lineChartData} options={{
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280' } },
                              x: { grid: { display: false }, ticks: { color: '#6b7280' } },
                            }
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Bar Chart */}
                    {compareChartData && (
                      <div className="glass-card rounded-3xl p-8 hover:bg-white/[0.02] transition-colors">
                        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                           <span className="text-fuchsia-400">📊</span> Platform Delta
                        </h2>
                        <div className="h-64">
                          <Bar data={compareChartData} options={{
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280' } },
                              x: { grid: { display: false }, ticks: { color: '#6b7280' } },
                            }
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Right: Analytics */}
                {analytics?.metrics && (
                  <aside className="space-y-5">

                    {/* Buy Score */}
                    <div className={`p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group border ${
                      analytics.metrics.recommendation === 'Strong Buy'
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : analytics.metrics.recommendation === 'Consider'
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}>
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <span className="text-6xl text-white">🎯</span>
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50 mb-1">Buy Score Index</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-7xl font-black text-white tracking-tight">{analytics.metrics.buy_score}</span>
                        <span className="text-white/30 font-bold">/100</span>
                      </div>
                      <div className={`mt-6 px-5 py-2 rounded-2xl font-black text-sm text-center shadow-lg inline-block ${
                         analytics.metrics.recommendation === 'Strong Buy' ? 'bg-emerald-500 shadow-emerald-500/30' :
                         analytics.metrics.recommendation === 'Consider' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-red-500 shadow-red-500/30'
                      }`}>
                        {analytics.metrics.recommendation.toUpperCase()}
                      </div>
                    </div>

                    {/* Price Prediction */}
                    {analytics.predictions && (
                      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                        <h3 className="font-bold text-indigo-300 mb-3 flex items-center gap-2">🔮 Price Prediction</h3>
                        {analytics.predictions.error ? (
                          <div className="bg-gray-800/50 p-4 rounded-xl text-center text-sm text-gray-400 italic">
                            ⚠️ {analytics.predictions.error}
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="bg-gray-800 rounded-xl p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">7 Days</div>
                                <div className="font-bold text-white">₹{analytics.predictions.predictions?.['7_days']?.toFixed(0) || 'N/A'}</div>
                              </div>
                              <div className="bg-gray-800 rounded-xl p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">30 Days</div>
                                <div className="font-bold text-white">₹{analytics.predictions.predictions?.['30_days']?.toFixed(0) || 'N/A'}</div>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm bg-indigo-500/10 p-3 rounded-xl">
                              <span className="text-indigo-300">Trend</span>
                              <span className={`font-bold ${analytics.predictions.trend === 'Dropping' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {analytics.predictions.trend === 'Dropping' ? '📉' : '📈'} {analytics.predictions.trend}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Discount Info */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                      <h3 className="font-bold text-emerald-400 mb-3">💰 Discount Analysis</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Real Discount</span>
                          <span className="text-white font-bold">{analytics.metrics.real_discount_pct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Savings</span>
                          <span className="text-emerald-400 font-bold">₹{analytics.metrics.savings_amount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Fake Discount?</span>
                          {analytics.metrics.fake_discount_detected
                            ? <span className="text-red-400 font-bold text-xs border border-red-500/40 px-2 py-1 rounded-lg">⚠️ Inflated MRP</span>
                            : <span className="text-emerald-400 font-bold text-xs border border-emerald-500/40 px-2 py-1 rounded-lg">✅ Legitimate</span>}
                        </div>
                      </div>
                    </div>

                    {/* Volatility */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                      <h3 className="font-bold text-amber-400 mb-3">📊 Market Volatility</h3>
                      <div className="flex items-center gap-3 bg-gray-800 p-4 rounded-xl">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${analytics.metrics.volatility_class === 'Stable' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {analytics.metrics.volatility_class === 'Stable' ? '🟢' : '🔴'}
                        </div>
                        <div>
                          <div className="font-bold text-white">{analytics.metrics.volatility_class}</div>
                          <div className="text-xs text-gray-500">Based on price history</div>
                        </div>
                      </div>
                    </div>

                    {/* AI Verdict */}
                    {analytics.ai_verdict && (
                      <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-2xl p-5 shadow-xl">
                        <h3 className="font-bold text-indigo-300 mb-3 flex items-center gap-2">✨ AI Verdict</h3>
                        <p className="text-gray-300 text-sm italic leading-relaxed">"{analytics.ai_verdict}"</p>
                        <div className="mt-3 text-xs text-indigo-400/60 tracking-widest uppercase">Powered by Gemini AI</div>
                      </div>
                    )}

                    {/* History CTA - Only if not logged in */}
                    {!user && products.length > 0 && (
                      <div className="bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 border border-indigo-500/20 rounded-2xl p-5 text-center">
                        <div className="text-2xl mb-2">🔐</div>
                        <p className="text-sm text-gray-300 mb-3">Sign up to save this search and track price history!</p>
                        <button
                          onClick={() => setAuthModal('register')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition"
                        >
                          Create Free Account
                        </button>
                      </div>
                    )}
                  </aside>
                )}
              </div>
                {/* Empty State */}
                {!loading && products.length === 0 && !analytics && (
                  <div className="text-center py-32 animate-float">
                    <div className="w-24 h-24 btn-premium rounded-[2rem] flex items-center justify-center text-5xl mx-auto mb-8 shadow-indigo-500/50">
                      🛍️
                    </div>
                    <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Ready to save?</h3>
                    <p className="text-gray-500 text-lg max-w-sm mx-auto">Analyze products across the web for the best deals automatically.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
