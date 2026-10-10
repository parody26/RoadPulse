import React, { useState } from 'react';
import IncidentMap from './IncidentMap';
import IncidentTable from './IncidentTable';
import RiskCard from './RiskCard';
import BudgetOptimizer from './BudgetOptimizer';
import WorkOrderReport from './WorkOrderReport';
import RepairVerificationModal from './RepairVerificationModal';
import { Map, Sliders, FileText, Activity } from 'lucide-react';

export default function AdminDashboard({ incidents, refreshIncidents }) {
  const [adminSubTab, setAdminSubTab] = useState('map');
  const [selectedIncident, setSelectedIncident] = useState(incidents.length > 0 ? incidents[0] : null);
  const [verificationIncident, setVerificationIncident] = useState(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Admin Sub-navigation Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> Municipal Admin Intelligence Command Center
          </h2>
          <p className="text-xs text-slate-400">Review citizen submissions, prioritize risk, optimize budget, and sign off verified repairs</p>
        </div>

        {/* Admin Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setAdminSubTab('map')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              adminSubTab === 'map' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Map & Incidents
          </button>

          <button
            onClick={() => setAdminSubTab('optimizer')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              adminSubTab === 'optimizer' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Budget Optimizer
          </button>

          <button
            onClick={() => setAdminSubTab('reports')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              adminSubTab === 'reports' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Work Orders
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Map & Dashboard */}
      {adminSubTab === 'map' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <IncidentMap
                incidents={incidents}
                selectedIncident={selectedIncident}
                setSelectedIncident={setSelectedIncident}
                onOpenVerification={(inc) => setVerificationIncident(inc)}
              />
            </div>

            <div className="lg:col-span-1">
              <RiskCard
                incident={selectedIncident}
                onVerifyClick={(inc) => setVerificationIncident(inc)}
                onUpdateIncident={refreshIncidents}
              />
            </div>
          </div>

          <IncidentTable
            incidents={incidents}
            selectedIncident={selectedIncident}
            setSelectedIncident={setSelectedIncident}
            onVerifyClick={(inc) => setVerificationIncident(inc)}
          />
        </div>
      )}

      {/* Sub-Tab 2: Budget Optimizer */}
      {adminSubTab === 'optimizer' && (
        <BudgetOptimizer
          incidents={incidents}
          onSelectTab={setAdminSubTab}
        />
      )}

      {/* Sub-Tab 3: Work Order Reports */}
      {adminSubTab === 'reports' && (
        <WorkOrderReport
          incidents={incidents}
        />
      )}

      {/* Human Repair Verification Modal */}
      {verificationIncident && (
        <RepairVerificationModal
          incident={verificationIncident}
          onClose={() => setVerificationIncident(null)}
          onVerificationSuccess={refreshIncidents}
        />
      )}
    </div>
  );
}
