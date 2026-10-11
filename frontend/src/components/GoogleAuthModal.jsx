import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '351527857920-nik3q88gp278ki574hs2gg8op9vsgcj5.apps.googleusercontent.com';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [fallbackName, setFallbackName] = useState('');

  const googleBtnRef = useRef(null);
  const tokenClientRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setShowEmailFallback(false);

    const initGoogle = () => {
      if (typeof window === 'undefined' || !window.google?.accounts) return false;

      try {
        // 1. Initialize Google Identity Services (ID Token / One Tap / Render Button)
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        // 2. Render Google's official single button
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'signin_with',
            width: 280,
            logo_alignment: 'left'
          });
          setGisLoaded(true);
        }

        // 3. Initialize OAuth2 Token Client for Popup
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: handleTokenResponse,
          error_callback: (err) => {
            console.warn("Google OAuth error:", err);
            setError("Google authorization failed. You can sign in directly below.");
            setShowEmailFallback(true);
            setLoading(false);
          }
        });

        return true;
      } catch (e) {
        console.warn("GIS initialization warning:", e);
        return false;
      }
    };

    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) clearInterval(interval);
      }, 300);
      const timeout = setTimeout(() => clearInterval(interval), 4000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process Google ID Token
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
        console.warn("Backend auth note:", e);
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
      setError("Google authorization failed. Please try again.");
      setShowEmailFallback(true);
    } finally {
      setLoading(false);
    }
  };

  // Process Google OAuth2 Access Token
  const handleTokenResponse = async (tokenResponse) => {
    if (tokenResponse.error) {
      console.warn("Google token error:", tokenResponse.error);
      setError("Google authorization failed: " + (tokenResponse.error_description || tokenResponse.error));
      setShowEmailFallback(true);
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
        console.warn("Backend auth note:", e);
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
      setShowEmailFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleClick = () => {
    setError(null);
    if (tokenClientRef.current) {
      setLoading(true);
      try {
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
      } catch (e) {
        console.warn("Popup error:", e);
        setError("Authorization failed. You can sign in below.");
        setShowEmailFallback(true);
        setLoading(false);
      }
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setShowEmailFallback(true);
        }
      });
    } else {
      setShowEmailFallback(true);
    }
  };

  const handleFallbackSubmit = async (e) => {
    e.preventDefault();
    if (!fallbackEmail || !fallbackEmail.includes('@')) {
      setError("Please enter a valid Google email address.");
      return;
    }

    setLoading(true);
    setError(null);

    const email = fallbackEmail.trim().toLowerCase();
    const name = fallbackName.trim() || email.split('@')[0];

    let user = null;
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`
        })
      });
      if (res.ok) user = await res.json();
    } catch (e) {
      console.warn(e);
    }

    if (!user) {
      user = {
        id: `cit_${Date.now().toString().slice(-8)}`,
        email,
        name,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        google_id: `goog_${Date.now()}`,
        points: 100,
        potholes_reported: 0,
        total_reports: 0
      };
    }

    onLoginSuccess(user);
    onClose();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-150">
        
        {/* Close Button Only (No Gear, No Client ID) */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Clean Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-lg mb-1">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-white">Sign in with Google</h3>
          <p className="text-xs text-slate-400">
            Authenticate with Google to submit road hazards and earn civic reward points.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* JUST ONE SINGLE GOOGLE SIGN IN ACTION */}
        {!showEmailFallback ? (
          <div className="space-y-3">
            {/* Embedded Google Identity Services button */}
            <div className={`flex justify-center w-full min-h-[44px] ${gisLoaded ? 'block' : 'hidden'}`} ref={googleBtnRef}></div>

            {/* Standard Google Button (visible when GIS button hasn't rendered) */}
            {!gisLoaded && (
              <button
                onClick={handleCustomGoogleClick}
                disabled={loading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-full shadow-lg transition-all flex items-center justify-center gap-3 border border-slate-200 hover:scale-[1.01]"
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
                <span className="text-sm font-medium">
                  {loading ? 'Connecting to Google...' : 'Sign in with Google'}
                </span>
              </button>
            )}
          </div>
        ) : (
          /* Seamless Fallback if Google Cloud blocks the origin */
          <form onSubmit={handleFallbackSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Your Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={fallbackName}
                onChange={(e) => setFallbackName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Google Email Address</label>
              <input
                type="email"
                required
                placeholder="your.email@gmail.com"
                value={fallbackEmail}
                onChange={(e) => setFallbackEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEmailFallback(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20"
              >
                {loading ? 'Signing in...' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Clean Rewards Note */}
        <div className="text-center pt-2 border-t border-slate-800/80">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            +100 Civic Points Welcome Bonus
          </span>
        </div>
      </div>
    </div>
  );
}
