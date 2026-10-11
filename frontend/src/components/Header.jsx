import React, { useState } from 'react';
import { Activity, ShieldAlert, Shield, Lock, LogOut, Sparkles, Award, User, ChevronDown } from 'lucide-react';

export default function Header({
  userRole,
  onAdminLockClick,
  onAdminLogout,
  incidentCount,
  totalRisk,
  currentUser,
  onOpenLoginModal,
  onLogoutUser
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">RoadPulse</h1>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                userRole === 'admin'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              }`}>
                {userRole === 'admin' ? '🏛️ Admin Command Center' : '📱 Citizen Reporting Portal'}
              </span>
            </div>
            <p className="text-xs text-slate-400">AI Road Intelligence & Live Repair Prioritization</p>
          </div>
        </div>

        {/* Admin Metrics (Shown only when unlocked as Admin) */}
        {userRole === 'admin' && (
          <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Mapped Defects:</span>
              <span className="font-bold text-slate-200">{incidentCount}</span>
            </div>
            <div className="h-3 w-px bg-slate-800"></div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">Total Risk Index:</span>
              <span className="font-bold text-cyan-300">{totalRisk} pts</span>
            </div>
          </div>
        )}

        {/* Right Action: User Profile / Google Login & Admin Lock */}
        <div className="flex items-center gap-3">
          
          {/* Citizen Google Profile or Sign In Button */}
          {userRole === 'user' && (
            currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-2xl flex items-center gap-2.5 transition-all text-xs"
                >
                  <img
                    src={currentUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.email}`}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-full object-cover border border-slate-700"
                  />
                  <span className="font-semibold text-white hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
                  
                  {/* Glowing Points Badge */}
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold text-[11px] flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{currentUser.points} Pts</span>
                  </span>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-3 animate-in fade-in duration-150 text-xs">
                    <div className="border-b border-slate-800 pb-2.5">
                      <div className="font-bold text-white text-sm">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{currentUser.email}</div>
                      <div className="text-[10px] text-cyan-400 mt-0.5">Citizen ID: #{currentUser.id}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Reward Points</span>
                        <span className="font-bold text-amber-400 text-sm">⭐ {currentUser.points}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Potholes Found</span>
                        <span className="font-bold text-cyan-400 text-sm">{currentUser.potholes_reported || 0}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Earn <b>+100 Points</b> for every verified pothole reported!</span>
                    </div>

                    <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          if (onLogoutUser) onLogoutUser();
                        }}
                        className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-rose-950/40 transition-colors w-full justify-center"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out of Google
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-3.5 py-1.5 rounded-2xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 flex items-center gap-2 transition-all shadow-md shadow-cyan-500/10 border border-slate-200"
              >
                {/* Google G logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Sign in with Google</span>
              </button>
            )
          )}

          {/* Admin Lock / Exit button */}
          {userRole === 'user' ? (
            <button
              onClick={onAdminLockClick}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/40 flex items-center gap-1.5 transition-all shadow-sm"
              title="Protected Municipal Engineer Portal"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Admin Access</span>
            </button>
          ) : (
            <button
              onClick={onAdminLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" /> Exit Admin Mode
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
