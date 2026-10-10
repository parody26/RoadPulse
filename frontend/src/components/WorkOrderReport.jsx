import React, { useState } from 'react';
import { FileText, Printer, Download, CheckCircle2, ShieldCheck, Building2 } from 'lucide-react';
import { formatINR } from '../utils/costEstimator';

export default function WorkOrderReport({ incidents }) {
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    const totalCostNum = incidents.reduce((acc, c) => acc + (c.estimated_cost || 0), 0);
    const targetBudget = Math.max(50000, Math.round(totalCostNum * 1.2 / 1000) * 1000);

    try {
      const selectedIds = incidents.map(i => i.id);
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Municipal Road Repair & Maintenance Order (IRC:82 / CPWD DSR)',
          budget_allocated: targetBudget,
          incident_ids: selectedIds
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        setGenerating(false);
        return;
      }
    } catch (err) {
      console.warn("Using client-side work order report generator fallback.");
    }

    // Client-side report generation fallback
    const totalBenefit = incidents.reduce((acc, c) => acc + c.risk_score, 0);
    const items = incidents.map((inc, idx) => ({
      item_no: idx + 1,
      damage_type: inc.damage_type,
      location_name: inc.location_name,
      latitude: inc.latitude,
      longitude: inc.longitude,
      severity: `${Math.round(inc.severity * 100)}%`,
      risk_score: inc.risk_score,
      estimated_cost: formatINR(inc.estimated_cost)
    }));

    setReport({
      report_id: `RP-WO-${Date.now().toString().slice(-6)}`,
      title: 'Municipal Road Repair & Maintenance Order (IRC:82 / CPWD DSR)',
      generated_at: new Date().toISOString(),
      budget_allocated: formatINR(targetBudget),
      total_estimated_cost: formatINR(totalCostNum),
      total_risk_reduced: parseFloat(totalBenefit.toFixed(1)),
      total_incidents_selected: incidents.length,
      work_order_items: items
    });
    setGenerating(false);
  };

  if (incidents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
        <FileText className="w-10 h-10 text-cyan-400 mx-auto animate-pulse" />
        <h3 className="text-base font-bold text-white">No Work Orders to Generate Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          All mock example cases have been cleared. Once real road hazards are reported through the Citizen Portal, you can generate official municipal repair work orders in Rupees (₹) here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" /> Stage 7: Official Municipal Repair Work Order
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Generate formal procurement and repair work orders compliant with Indian Roads Congress (IRC:82) and CPWD Schedule of Rates (DSR) in Indian Rupees (₹).
          </p>
        </div>

        <button
          onClick={generateReport}
          disabled={generating}
          className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          {generating ? 'Compiling Order...' : 'Generate Official Work Order'}
        </button>
      </div>

      {/* Generated Report Printable Sheet */}
      {report && (
        <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-200 space-y-6 printable-area">
          
          {/* Municipal Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-xl text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">
                  Municipal Corporation Infrastructure Division
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Road Maintenance & Defect Rectification Wing • Standard Schedule of Rates (DSR)
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs">
              <div className="font-bold font-mono text-slate-800">{report.report_id}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Date: {new Date(report.generated_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Title & Authorization */}
          <div>
            <h2 className="text-base font-bold text-slate-900">{report.title}</h2>
            <p className="text-xs text-slate-600 mt-1">
              Authorized repair package prioritized via AI Explanatory Risk Index and OR-Tools 0-1 Knapsack budget optimizer.
            </p>
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
                  <th className="p-2.5 text-right">Estimated Cost (₹)</th>
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
                    <td className="p-2.5 text-right font-mono font-bold text-cyan-900">{item.estimated_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures & Execution Section */}
          <div className="pt-8 border-t border-slate-300 flex flex-col sm:flex-row justify-between gap-6 text-xs text-slate-600">
            <div>
              <div className="font-bold text-slate-900">Executive Engineer (Roads)</div>
              <div className="text-[11px] text-slate-500 mt-1">Municipal Public Works Department</div>
              <div className="h-10 border-b border-slate-400 w-48 mt-2"></div>
            </div>

            <div>
              <div className="font-bold text-slate-900">Chief Municipal Accounts Officer</div>
              <div className="text-[11px] text-slate-500 mt-1">Budget Allocation Approved (INR)</div>
              <div className="h-10 border-b border-slate-400 w-48 mt-2"></div>
            </div>
          </div>

          {/* Print Action */}
          <div className="flex justify-end gap-3 pt-2 no-print">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow"
            >
              <Printer className="w-3.5 h-3.5" /> Print Work Order
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
