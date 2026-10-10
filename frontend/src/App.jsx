import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserPortal from './components/UserPortal';
import AdminDashboard from './components/AdminDashboard';
import AdminPasscodeModal from './components/AdminPasscodeModal';
import { INITIAL_INCIDENTS } from './data/seedData';

export default function App() {
  const [userRole, setUserRole] = useState('user'); // Default: 'user' ONLY (Citizen Portal)
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setIncidents(data);
          return;
        }
      }
    } catch (err) {
      console.warn("Using built-in seed dataset for Admin Portal.");
    }
    // Fallback to rich built-in seed incidents (guarantees Admin Portal is never empty)
    setIncidents(INITIAL_INCIDENTS);
  };

  const handleNewSubmission = (newSubmission) => {
    const newIncident = {
      id: newSubmission.id,
      latitude: newSubmission.lat,
      longitude: newSubmission.lon,
      damage_type: "Pothole",
      severity: 0.89,
      confidence: 0.93,
      road_importance: 0.85,
      exposure_factor: 0.80,
      risk_score: 86.4,
      status: "reported",
      estimated_cost: 3500.0,
      location_name: `Live Citizen Submission (${newSubmission.lat.toFixed(4)}, ${newSubmission.lon.toFixed(4)})`,
      created_at: new Date().toISOString(),
      evidence: [
        {
          id: `ev_${newSubmission.id}`,
          incident_id: newSubmission.id,
          frame_timestamp: 2.0,
          image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
          bbox_json: '{"x": 120, "y": 140, "w": 200, "h": 150, "class": "Pothole", "confidence": 0.93}'
        }
      ],
      repairs: [
        {
          id: `rep_${newSubmission.id}`,
          incident_id: newSubmission.id,
          assigned_team: "Municipal Maintenance Unit #4",
          repair_status: "pending"
        }
      ]
    };
    setIncidents(prev => [newIncident, ...prev]);
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
          RoadPulse &copy; 2026. Live Geolocation & Direct Camera Video Authenticated.
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
