import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, AlertCircle, Settings } from 'lucide-react';

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function GoogleAuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [googleClientId, setGoogleClientId] = useState(() => {
    return (
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      localStorage.getItem('roadpulse_google_client_id') ||
      ''
    );
  });
  const [showSettings, setShowSettings] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const googleBtnRef = useRef(null);
  const tokenClientRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    const activeClientId = googleClientId.trim();
    if (!activeClientId) return;

    const initGoogle = () => {
      if (typeof window === 'undefined' || !window.google?.accounts) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: activeClientId,
          callback: handleCredentialResponse,
          auto_select: false
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: authMode === 'signup' ? 'signup_with' : 'signin_with',
            width: 320
          });
        }

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'openid email profile',
          callback: handleTokenResponse
        });

        return true;
      } catch (e) {
        console.warn("GIS init note:", e);
        return false;
      }
    };

    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) clearInterval(interval);
      }, 300);
      const timeout = setTimeout(() => clearInterval(interval), 3000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, googleClientId, authMode]);

  if (!isOpen) return null;

  const handleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setLoading(true);
    setError(null);

    try {
      const decoded = decodeJwt(response.credential);
      const authPayload = {
        credential: response.credential,
        email: decoded?.email,
        name: decoded?.name,
        avatar: decoded?.picture,
        google_id: decoded?.sub
      };

      let user = null;
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authPayload)
        });
        if (res.ok) user = await res.json();
      } catch (e) {
        console.warn(e);
      }

      if (!user) {
        user = {
          id: `cit_${(decoded?.sub || Date.now()).toString().slice(-8)}`,
          email: decoded?.email || 'citizen@gmail.com',
          name: decoded?.name || 'Citizen User',
          avatar: decoded?.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${decoded?.email}`,
          google_id: decoded?.sub || `goog_${Date.now()}`,
          points: 100,
          potholes_reported: 0,
          total_reports: 0
        };
      }

      onLoginSuccess(user);
      onClose();
    } catch {
      setError("Failed to complete Google authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleTokenResponse = async (tokenResponse) => {
    if (tokenResponse.error) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });
      const profile = await profileRes.json();

      const authPayload = {
        access_token: tokenResponse.access_token,
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        google_id: profile.sub
      };

      let user = null;
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authPayload)
        });
        if (res.ok) user = await res.json();
      } catch (e) {
        console.warn(e);
      }

      if (!user) {
        user = {
          id: `cit_${(profile.sub || Date.now()).toString().slice(-8)}`,
          email: profile.email,
          name: profile.name || profile.given_name || 'Citizen User',
          avatar: profile.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.email}`,
          google_id: profile.sub,
          points: 100,
          potholes_reported: 0,
          total_reports: 0
        };
      }

      onLoginSuccess(user);
      onClose();
    } catch {
      setError("Failed to fetch verified profile from Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError(null);
    if (!googleClientId) {
      setShowSettings(true);
      return;
    }

    if (tokenClientRef.current) {
      setLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError("Google authentication service is initializing. Please try again.");
    }
  };

  const handleSaveClientId = (e) => {
    e.preventDefault();
    const clean = clientIdInput.trim();
    if (clean) {
      setGoogleClientId(clean);
      try {
        localStorage.setItem('roadpulse_google_client_id', clean);
      } catch (e) {
        console.warn(e);
      }
    }
    setShowSettings(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-150">
        
        {/* Top Controls: Settings Gear & Close */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-slate-500 hover:text-slate-300 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
            title="Google OAuth Client ID Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimal Google Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-lg mb-1">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-white">
            {authMode === 'signup' ? 'Create Citizen Account' : 'Welcome to RoadPulse'}
          </h3>
          <p className="text-xs text-slate-400">
            {authMode === 'signup'
              ? 'Sign up with Google to report hazards & earn rewards'
              : 'Sign in with your Google account to continue'}
          </p>
        </div>

        {/* Clean Login / Signup Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              authMode === 'login'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              authMode === 'signup'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Discrete Client ID Settings (Only when toggled via gear icon) */}
        {showSettings ? (
          <form onSubmit={handleSaveClientId} className="space-y-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div className="font-semibold text-slate-300">Google OAuth Client ID:</div>
            <input
              type="text"
              placeholder="e.g. 123456789-xxx.apps.googleusercontent.com"
              value={clientIdInput || googleClientId}
              onChange={(e) => setClientIdInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex-1 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          /* Main Clean Action: Just Google Login / Signup */
          <div className="space-y-3">
            <button
              onClick={handleGoogleClick}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 border border-slate-200 hover:scale-[1.01]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span className="text-sm">
                {loading
                  ? 'Connecting to Google...'
                  : authMode === 'signup'
                  ? 'Sign Up with Google'
                  : 'Log In with Google'}
              </span>
            </button>

            {/* Embedded Google Identity Services button container if ready */}
            <div className="flex justify-center" ref={googleBtnRef}></div>
          </div>
        )}

        {/* Clean Rewards Note */}
        <div className="text-center pt-1 border-t border-slate-800/80">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            +100 Civic Points Welcome Bonus
          </span>
        </div>
      </div>
    </div>
  );
}
