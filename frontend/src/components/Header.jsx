import React from 'react';
import { Activity, ShieldAlert, Shield, Lock, Unlock, LogOut, Camera } from 'lucide-react';

export default function Header({ userRole, onAdminLockClick, onAdminLogout, incidentCount, totalRisk }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
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

        {/* Right Action: Protected Admin Access / Exit */}
        <div>
          {userRole === 'user' ? (
            <button
              onClick={onAdminLockClick}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/40 flex items-center gap-2 transition-all shadow-sm"
              title="Protected Municipal Engineer Portal"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> Admin Access (PIN Protected)
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
