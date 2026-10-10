import React, { useState } from 'react';
import { FileText, Printer, Download, CheckCircle2, ShieldCheck, Building2 } from 'lucide-react';

export default function WorkOrderReport({ incidents }) {
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const selectedIds = incidents.map(i => i.id);
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Municipal Road Repair & Maintenance Order',
          budget_allocated: 15000.0,
          incident_ids: selectedIds
        })
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" /> Stage 7: Municipal Work Order & Inspection Report
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate an official work order report containing evidence photos, coordinates, risk scores, and repair cost estimations.
          </p>
        </div>

        <button
          onClick={generateReport}
          disabled={generating}
          className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <FileText className="w-4 h-4" />
          {report ? 'Regenerate Report' : 'Generate Work Order'}
        </button>
      </div>

      {/* Report Paper Preview */}
      {report && (
        <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl space-y-6 border border-slate-200">
          
          {/* Official Letterhead Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-700 font-black text-lg">
                <Building2 className="w-6 h-6" /> CITY MUNICIPAL ROAD MAINTENANCE AUTHORITY
              </div>
              <p className="text-xs text-slate-600 mt-0.5">Automated Inspection & Repair Prioritization Unit</p>
            </div>

            <div className="text-right text-xs">
              <div className="font-bold font-mono text-slate-800">{report.report_id}</div>
              <div className="text-slate-500">{new Date(report.generated_at).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-100 p-4 rounded-xl border border-slate-300 text-xs">
            <div>
              <span className="text-slate-500 block">Total Items</span>
              <span className="font-bold text-slate-900 text-sm">{report.total_incidents_selected} Repairs</span>
            </div>
            <div>
              <span className="text-slate-500 block">Allocated Budget</span>
              <span className="font-bold text-slate-900 text-sm">{report.budget_allocated}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Estimated Cost</span>
              <span className="font-bold text-cyan-800 text-sm">{report.total_estimated_cost}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Risk Reduced</span>
              <span className="font-bold text-emerald-700 text-sm">+{report.total_risk_reduced} pts</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 font-bold">
                  <th className="p-2.5">Item #</th>
                  <th className="p-2.5">Damage Category</th>
                  <th className="p-2.5">Location & Coordinates</th>
                  <th className="p-2.5 text-center">Severity</th>
                  <th className="p-2.5 text-center">Risk Score</th>
                  <th className="p-2.5 text-right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {report.work_order_items.map((item) => (
                  <tr key={item.item_no} className="hover:bg-slate-50 font-medium">
                    <td className="p-2.5 font-bold">#{item.item_no}</td>
                    <td className="p-2.5 font-bold text-slate-900">{item.damage_type}</td>
                    <td className="p-2.5">
                      <div>{item.location_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">({item.latitude}, {item.longitude})</div>
                    </td>
                    <td className="p-2.5 text-center font-bold text-rose-700">{item.severity}</td>
                    <td className="p-2.5 text-center font-bold text-amber-700">{item.risk_score}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{item.estimated_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Print Button */}
          <div className="flex justify-end border-t border-slate-300 pt-4">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print / Save Work Order PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
