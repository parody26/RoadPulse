import React from 'react';
import { Activity, ShieldAlert, User, Shield, Camera, LayoutDashboard, Sliders } from 'lucide-react';

export default function Header({ userRole, setUserRole, incidentCount, totalRisk }) {
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
              <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                {userRole === 'user' ? 'Citizen Portal' : 'Admin Command Center'}
              </span>
            </div>
            <p className="text-xs text-slate-400">AI Road Intelligence & Repair Prioritization</p>
          </div>
        </div>

        {/* Quick System Metrics (Admin Mode) */}
        {userRole === 'admin' && (
          <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Total Incidents:</span>
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

        {/* Role Interface Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setUserRole('user')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              userRole === 'user'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <User className="w-4 h-4" /> Citizen / User Portal
          </button>

          <button
            onClick={() => setUserRole('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              userRole === 'admin'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-300" /> Admin Command Center
          </button>
        </div>

      </div>
    </header>
  );
}
