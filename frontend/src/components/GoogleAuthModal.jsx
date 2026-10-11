import React, { useState } from 'react';
import { X, Shield, Sparkles, CheckCircle, ArrowRight, User } from 'lucide-react';

const PRESET_ACCOUNTS = [
  {
    name: 'Arjun Sharma',
    email: 'arjun.sharma@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    initialPoints: 200
  },
  {
    name: 'Priya Patel',
    email: 'priya.patel@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    initialPoints: 300
  },
  {
    name: 'Rohan Verma',
    email: 'rohan.verma@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    initialPoints: 100
  }
];

export default function GoogleAuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSelectAccount = async (account) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          name: account.name,
          avatar: account.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${account.email}`,
          google_id: `goog_${Date.now()}`
        })
      });

      if (resp.ok) {
        const user = await resp.json();
        onLoginSuccess(user);
        onClose();
      } else {
        setError('Failed to authenticate with Google. Please try again.');
      }
    } catch (err) {
      // Local fallback if offline
      const fallbackUser = {
        id: `cit_${Date.now().toString(36)}`,
        name: account.name,
        email: account.email,
        avatar: account.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${account.email}`,
        points: account.initialPoints || 100,
        potholes_reported: 0,
        total_reports: 0
      };
      onLoginSuccess(fallbackUser);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      setError('Please enter a valid Google email address.');
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    handleSelectAccount({
      name,
      email: customEmail.trim().toLowerCase(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${customEmail}`
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Header */}
        <div className="text-center space-y-2 pt-2">
          {/* Official Google 'G' Logo SVG */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-xl shadow-cyan-500/10 mb-1">
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-white">Sign in with Google</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Choose your Google account to access RoadPulse Citizen Portal and earn civic points.
          </p>
        </div>

        {/* Welcome Bonus Callout */}
        <div className="p-3 bg-gradient-to-r from-cyan-950/60 to-emerald-950/60 border border-cyan-800/50 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>+100 Welcome Points</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-semibold">Instant</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Earn <b>+100 Points</b> for every pothole verified by AI!
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 text-center">
            {error}
          </div>
        )}

        {/* Account Selector */}
        {!customMode ? (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              Select an account
            </div>

            <div className="space-y-1.5">
              {PRESET_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  disabled={loading}
                  onClick={() => handleSelectAccount(acc)}
                  className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-between group text-left"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{acc.email}</div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setCustomMode(true)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-800"
              >
                <User className="w-3.5 h-3.5" /> Use another Google Account
              </button>
            </div>
          </div>
        ) : (
          /* Custom Google Account Form */
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Vikram Sharma"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Google Email Address *</label>
              <input
                type="email"
                required
                placeholder="your.name@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}

        <div className="text-[10px] text-slate-500 text-center border-t border-slate-800/80 pt-3">
          By continuing, Google shares your name, email address, and profile picture with RoadPulse.
        </div>
      </div>
    </div>
  );
}
