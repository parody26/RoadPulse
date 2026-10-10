import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserPortal from './components/UserPortal';
import AdminDashboard from './components/AdminDashboard';
import AdminPasscodeModal from './components/AdminPasscodeModal';

export default function App() {
  const [userRole, setUserRole] = useState('user'); // Default: 'user' ONLY (Citizen Portal)
  const [incidents, setIncidents] = useState(() => {
    try {
      const saved = localStorage.getItem('roadpulse_real_incidents');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Strictly purge any legacy mock/example cases from previous runs
        const realOnly = Array.isArray(parsed)
          ? parsed.filter(i => i.id && !i.id.toString().startsWith('inc_'))
          : [];
        return realOnly;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        const realOnly = Array.isArray(data)
          ? data.filter(i => i.id && !i.id.toString().startsWith('inc_'))
          : [];
        setIncidents(realOnly);
        try {
          localStorage.setItem('roadpulse_real_incidents', JSON.stringify(realOnly));
        } catch (e) {
          console.warn(e);
        }
        return;
      }
    } catch (err) {
      console.warn("Backend API note: using local persistent real incidents.");
    }
  };

  const handleNewSubmission = (newIncident) => {
    setIncidents(prev => {
      const updated = [newIncident, ...prev];
      try {
        localStorage.setItem('roadpulse_real_incidents', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const handleClearIncidents = async () => {
    if (window.confirm("Are you sure you want to clear all reported incidents? The Admin Portal will be reset to empty.")) {
      setIncidents([]);
      try {
        localStorage.removeItem('roadpulse_real_incidents');
        localStorage.removeItem('roadpulse_user_submissions');
      } catch (e) {
        console.warn(e);
      }
      try {
        await fetch('/api/incidents/clear', { method: 'POST' });
      } catch (e) {
        console.warn("Backend clear note:", e);
      }
    }
  };

  const totalRiskSum = incidents.reduce((acc, curr) => acc + (curr.risk_score || 0), 0).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Header with Protected Admin Control */}
      <Header
        userRole={userRole}
        onAdminLockClick={() => setShowPasscodeModal(true)}
        onAdminLogout={() => setUserRole('user')}
        incidentCount={incidents.length}
        totalRisk={totalRiskSum}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {userRole === 'user' ? (
          /* Default Public Citizen Portal: Live Camera Recording + GPS Location + Retrain Model */
          <UserPortal
            onSubmissionSuccess={handleNewSubmission}
          />
        ) : (
          /* Protected Admin Dashboard: Map, Risk Engine, Budget Optimizer, Work Orders */
          <AdminDashboard
            incidents={incidents}
            refreshIncidents={fetchIncidents}
            onClearIncidents={handleClearIncidents}
          />
        )}
      </main>

      {/* Protected Admin PIN Modal */}
      <AdminPasscodeModal
        isOpen={showPasscodeModal}
        onClose={() => setShowPasscodeModal(false)}
        onSuccess={() => {
          setShowPasscodeModal(false);
          setUserRole('admin');
        }}
      />

      {/* Footer with Protected Admin Access Link */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        <div>
          RoadPulse &copy; 2026. Live Camera Video & Geolocation Authenticated.
        </div>
        <div>
          {userRole === 'user' && (
            <button
              onClick={() => setShowPasscodeModal(true)}
              className="text-slate-400 hover:text-cyan-400 underline underline-offset-4 transition-colors"
            >
              🔒 Municipal Admin Access (PIN 4040)
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
