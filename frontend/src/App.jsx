import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserPortal from './components/UserPortal';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [userRole, setUserRole] = useState('user'); // 'user' (Citizen/Inspector) | 'admin' (Municipal Authority)
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incidents');
      const data = await res.json();
      setIncidents(data);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalRiskSum = incidents.reduce((acc, curr) => acc + curr.risk_score, 0).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Header with Role Switcher */}
      <Header
        userRole={userRole}
        setUserRole={setUserRole}
        incidentCount={incidents.length}
        totalRisk={totalRiskSum}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {userRole === 'user' ? (
          /* User Interface: Live Camera Recorder + GPS Location Attachment */
          <UserPortal
            onSubmissionSuccess={fetchIncidents}
          />
        ) : (
          /* Admin Interface: Master Command Center, Map, Risk Engine, Budget Optimizer, Reports */
          <AdminDashboard
            incidents={incidents}
            refreshIncidents={fetchIncidents}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        RoadPulse AI-Powered Road Intelligence & Repair Prioritization &copy; 2026 Hackathon MVP. Citizen Live Location & Direct Video Recording Authenticated.
      </footer>
    </div>
  );
}
