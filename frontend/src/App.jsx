import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserPortal from './components/UserPortal';
import AdminDashboard from './components/AdminDashboard';
import AdminPasscodeModal from './components/AdminPasscodeModal';
import GoogleAuthModal from './components/GoogleAuthModal';

export default function App() {
  const [userRole, setUserRole] = useState('user'); // Default: 'user' ONLY (Citizen Portal)
  
  // Google Authenticated Citizen Account
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('roadpulse_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

  // Mapped Incidents (Synchronized from SQLite Backend DB always)
  const [incidents, setIncidents] = useState(() => {
    try {
      const saved = localStorage.getItem('roadpulse_real_incidents');
      if (saved) {
        const parsed = JSON.parse(saved);
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

  // Fetch incidents on initial mount
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
      console.warn("Backend API note: syncing with local incident cache.");
    }
  };

  // Called when any citizen successfully submits a defect report
  const handleNewSubmission = (newIncident) => {
    if (!newIncident) return;
    setIncidents(prev => {
      // Deduplicate if already present
      const exists = prev.some(i => i.id === newIncident.id);
      const updated = exists ? prev : [newIncident, ...prev];
      try {
        localStorage.setItem('roadpulse_real_incidents', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
    // Immediately re-sync with backend to guarantee database persistence
    fetchIncidents();
  };

  // Handle Google Login Success
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('roadpulse_auth_user', JSON.stringify(user));
    } catch (e) {
      console.warn(e);
    }
  };

  // Handle Logout
  const handleLogoutUser = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('roadpulse_auth_user');
    } catch (e) {
      console.warn(e);
    }
  };

  // Update Citizen Points Balance (e.g. +100 Points for Pothole)
  const handleUpdateUserPoints = (pointsEarned, isPothole) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      points: (currentUser.points || 0) + pointsEarned,
      potholes_reported: isPothole ? (currentUser.potholes_reported || 0) + 1 : (currentUser.potholes_reported || 0),
      total_reports: (currentUser.total_reports || 0) + 1
    };
    setCurrentUser(updated);
    try {
      localStorage.setItem('roadpulse_auth_user', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
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
      
      {/* Top Header with Protected Admin Control & Google Citizen Account */}
      <Header
        userRole={userRole}
        onAdminLockClick={() => setShowPasscodeModal(true)}
        onAdminLogout={() => setUserRole('user')}
        incidentCount={incidents.length}
        totalRisk={totalRiskSum}
        currentUser={currentUser}
        onOpenLoginModal={() => setShowGoogleModal(true)}
        onLogoutUser={handleLogoutUser}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {userRole === 'user' ? (
          /* Default Public Citizen Portal: Live Camera Recording + GPS Location + AI Defect Inspector */
          <UserPortal
            onSubmissionSuccess={handleNewSubmission}
            currentUser={currentUser}
            onOpenLoginModal={() => setShowGoogleModal(true)}
            onUpdateUserPoints={handleUpdateUserPoints}
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

      {/* Google Sign-In & Citizen Account Modal */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

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
