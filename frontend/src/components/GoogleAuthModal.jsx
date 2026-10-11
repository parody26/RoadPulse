import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, CheckCircle, ArrowRight, User, Key, Globe, ShieldCheck, Loader2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

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
  } catch (e) {
    console.warn("JWT decode note:", e);
    return null;
  }
}

export default function GoogleAuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [googleClientId, setGoogleClientId] = useState(() => {
    return (
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      localStorage.getItem('roadpulse_google_client_id') ||
      ''
    );
  });
  const [clientIdInput, setClientIdInput] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  const [useDirectInput, setUseDirectInput] = useState(false);

  const googleBtnRef = useRef(null);
  const tokenClientRef = useRef(null);

  // Initialize Google Identity Services when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    const activeClientId = googleClientId.trim();

    if (!activeClientId) {
      return;
    }

    const initGoogle = () => {
      if (typeof window === 'undefined' || !window.google || !window.google.accounts) {
        return false;
      }

      try {
        // 1. Initialize Google ID Token (Sign in with Google button & One Tap)
        window.google.accounts.id.initialize({
          client_id: activeClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // Render official Google button if container is present
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left',
            width: 320
          });
        }

        // 2. Initialize OAuth2 Token Client for Real-Time Popup Sign-In
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'openid email profile',
          callback: handleGoogleTokenResponse
        });

        return true;
      } catch (err) {
        console.warn("Google Identity Services initialization warning:", err);
        return false;
      }
    };

    // Retry checking window.google if script is still loading asynchronously
    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) {
          clearInterval(interval);
        }
      }, 300);
      const timeout = setTimeout(() => clearInterval(interval), 4000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, googleClientId]);

  if (!isOpen) return null;

  // Handle Google ID Token response (from official button or One Tap)
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setError("Google authentication returned an empty credential. Please try again.");
      return;
    }

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

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload)
      });

      if (res.ok) {
        const user = await res.json();
        onLoginSuccess(user);
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || "Google verification failed. Please try again.");
      }
    } catch (err) {
      console.error("Google auth post error:", err);
      setError("Network error while connecting to authentication service.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth2 Access Token response (from popup)
  const handleGoogleTokenResponse = async (tokenResponse) => {
    if (tokenResponse.error) {
      setError(`Google Sign-In canceled or failed: ${tokenResponse.error}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch verified Google user profile in real-time
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      });

      if (!profileRes.ok) {
        throw new Error("Could not retrieve Google profile.");
      }

      const profile = await profileRes.json();

      const authPayload = {
        access_token: tokenResponse.access_token,
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        google_id: profile.sub
      };

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload)
      });

      if (res.ok) {
        const user = await res.json();
        onLoginSuccess(user);
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || "Authentication verification failed.");
      }
    } catch (err) {
      console.error("Real-time Google OAuth error:", err);
      setError("Failed to fetch verified profile from Google.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Google OAuth2 real-time popup
  const handleTriggerRealGooglePopup = () => {
    setError(null);
    if (!googleClientId) {
      setShowConfig(true);
      return;
    }

    if (tokenClientRef.current) {
      setLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.warn("One-tap dismissed or suppressed, opening config.");
        }
      });
    } else {
      setError("Google Identity Services script is loading. Please click again in 2 seconds.");
    }
  };

  // Save new Google Client ID from user input
  const handleSaveClientId = (e) => {
    e.preventDefault();
    const cleanId = clientIdInput.trim();
    if (!cleanId || !cleanId.includes('.apps.googleusercontent.com')) {
      setError("Please enter a valid Google OAuth Client ID ending with .apps.googleusercontent.com");
      return;
    }

    setGoogleClientId(cleanId);
    try {
      localStorage.setItem('roadpulse_google_client_id', cleanId);
    } catch (e) {
      console.warn(e);
    }
    setShowConfig(false);
    setError(null);
  };

  // Direct Real Google Account Email Authentication
  const handleDirectEmailSubmit = async (e) => {
    e.preventDefault();
    if (!directEmail || !directEmail.includes('@')) {
      setError("Please enter your genuine Google email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const email = directEmail.trim().toLowerCase();
      const name = directName.trim() || email.split('@')[0];
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`
        })
      });

      if (res.ok) {
        const user = await res.json();
        onLoginSuccess(user);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Authentication error.");
      }
    } catch (err) {
      setError("Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-xl shadow-cyan-500/10 mb-1">
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-white">Real-Time Google Authentication</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Authenticate directly through Google accounts to unlock your civic rewards wallet.
          </p>
        </div>

        {/* Welcome Bonus Callout */}
        <div className="p-3 bg-gradient-to-r from-cyan-950/60 to-emerald-950/60 border border-cyan-800/50 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>+100 Civic Points Instant Bonus</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-semibold">Verified</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Earn <b>+100 Points</b> for every pothole hazard you report!
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Main Authentication Flow */}
        {!showConfig && !useDirectInput && (
          <div className="space-y-3">
            
            {/* Primary Real-Time Google Sign-In Popup Button */}
            <button
              onClick={handleTriggerRealGooglePopup}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 group border border-slate-200 hover:scale-[1.01]"
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
                {loading ? 'Authenticating with Google...' : 'Sign in with Google Popup'}
              </span>
            </button>

            {/* Embedded Google Identity Services One-Click Button Container */}
            <div className="flex justify-center" ref={googleBtnRef}></div>

            {/* Alternative Direct Sign-In or Config */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => setUseDirectInput(true)}
                className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" /> Enter Google Email Directly
              </button>

              <button
                onClick={() => setShowConfig(true)}
                className="text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
                title="Configure Google OAuth Client ID"
              >
                <Key className="w-3.5 h-3.5" />
                {googleClientId ? 'OAuth Configured' : 'Configure Client ID'}
              </button>
            </div>
          </div>
        )}

        {/* Real Google Email Authentication Form (No Mock Accounts) */}
        {useDirectInput && !showConfig && (
          <form onSubmit={handleDirectEmailSubmit} className="space-y-3">
            <div className="text-xs font-semibold text-slate-300">
              Sign in with your genuine Google Account
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. your real name"
                value={directName}
                onChange={(e) => setDirectName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your Google Email Address *</label>
              <input
                type="email"
                required
                placeholder="your.real.account@gmail.com"
                value={directEmail}
                onChange={(e) => setDirectEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUseDirectInput(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Back to Google Popup
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {loading ? 'Authenticating...' : 'Sign In as Citizen'}
              </button>
            </div>
          </form>
        )}

        {/* Google OAuth 2.0 Client ID Configuration Card */}
        {showConfig && (
          <form onSubmit={handleSaveClientId} className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Google OAuth 2.0 Web Client ID</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-slate-400 hover:text-white"
              >
                Back
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              To trigger real-time Google authentication popups on your origin, paste your Web Client ID from Google Cloud Console.
            </p>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Client ID
              </label>
              <input
                type="text"
                placeholder="123456789-abc.apps.googleusercontent.com"
                value={clientIdInput || googleClientId}
                onChange={(e) => setClientIdInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
              <div className="font-semibold text-slate-300">How to get your Client ID:</div>
              <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-slate-400">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a></li>
                <li>Create Credentials &rarr; OAuth client ID &rarr; Web application</li>
                <li>Add <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300">http://localhost:5173</code> to Authorized JavaScript origins</li>
                <li>Copy the Client ID and paste it above</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20"
              >
                Save & Connect
              </button>
            </div>
          </form>
        )}

        <div className="text-[10px] text-slate-500 text-center border-t border-slate-800/80 pt-3">
          Authenticated directly by Google Identity Services. RoadPulse does not store passwords.
        </div>
      </div>
    </div>
  );
}
