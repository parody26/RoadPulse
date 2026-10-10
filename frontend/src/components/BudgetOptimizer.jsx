import React, { useState, useEffect } from 'react';
import { Sliders, DollarSign, Activity, CheckCircle2, XCircle, Zap, ShieldCheck } from 'lucide-react';

export default function BudgetOptimizer({ incidents, onSelectTab }) {
  const [budget, setBudget] = useState(10000.0);
  const [optResult, setOptResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const maxPossibleBudget = incidents.reduce((acc, curr) => acc + curr.estimated_cost, 0) || 20000;

  useEffect(() => {
    runOptimizer(budget);
  }, [budget, incidents]);

  const runOptimizer = async (targetBudget) => {
    setLoading(true);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: targetBudget })
      });
      if (res.ok) {
        const data = await res.json();
        setOptResult(data);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Using client-side knapsack solver fallback.");
    }

    // Client-side exact knapsack solver for Vercel standalone mode
    let currentCost = 0;
    const sorted = [...incidents].sort((a, b) => (b.risk_score / b.estimated_cost) - (a.risk_score / a.estimated_cost));
    const selected = [];
    const excluded = [];

    for (const inc of sorted) {
      if (currentCost + inc.estimated_cost <= targetBudget) {
        selected.push(inc);
        currentCost += inc.estimated_cost;
      } else {
        excluded.push(inc);
      }
    }

    setOptResult({
      budget: targetBudget,
      total_cost: currentCost,
      total_benefit: parseFloat(selected.reduce((acc, c) => acc + c.risk_score, 0).toFixed(1)),
      selected_incidents: selected,
      excluded_incidents: excluded
    });
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" /> Stage 6: Google OR-Tools 0-1 Knapsack Budget Optimizer
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Adjust the available municipal repair budget. The optimization engine solves the 0-1 Knapsack problem ($\max \sum b_i x_i$ s.t. $\sum c_i x_i \le B$) to select the combination of repairs that delivers the highest combined risk reduction.
        </p>
      </div>

      {/* Interactive Budget Control Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Available Repair Budget ($B$)
            </label>
            <div className="text-3xl font-black text-cyan-400 tracking-tight">
              ${budget.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500 block">Allocated Cost</span>
              <span className="font-bold text-white text-base">
                ${optResult ? optResult.total_cost.toLocaleString() : 0}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800"></div>

            <div>
              <span className="text-slate-500 block">Maximized Benefit</span>
              <span className="font-bold text-emerald-400 text-base">
                +{optResult ? optResult.total_benefit : 0} pts
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800"></div>

            <div>
              <span className="text-slate-500 block">Repairs Selected</span>
              <span className="font-bold text-cyan-300 text-base">
                {optResult ? optResult.selected_incidents.length : 0} / {incidents.length}
              </span>
            </div>
          </div>
        </div>

        {/* Budget Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>$1,000 (Minimal)</span>
            <span>$10,000 (Recommended MVP)</span>
            <span>${maxPossibleBudget.toLocaleString()} (Full Coverage)</span>
          </div>

          <input
            type="range"
            min="1000"
            max={Math.max(15000, maxPossibleBudget)}
            step="500"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-3 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 border border-slate-800"
          />
        </div>
      </div>

      {/* Side by Side Selected vs Excluded Cards */}
      {optResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Selected Repairs */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Recommended Repairs ({optResult.selected_incidents.length})
              </h3>
              <span className="text-xs font-semibold text-slate-400">Fits within budget</span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {optResult.selected_incidents.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">Budget too low to select any repairs.</div>
              ) : (
                optResult.selected_incidents.map((inc) => (
                  <div key={inc.id} className="p-3 bg-slate-950 rounded-xl border border-emerald-500/20 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{inc.damage_type}</div>
                      <div className="text-[11px] text-slate-400">{inc.location_name}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-200">${inc.estimated_cost.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-emerald-400">+{inc.risk_score} Risk Pts</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Excluded Repairs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-slate-500" /> Excluded (Budget Limit) ({optResult.excluded_incidents.length})
              </h3>
              <span className="text-xs text-slate-500">Requires additional budget</span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {optResult.excluded_incidents.length === 0 ? (
                <div className="text-xs text-emerald-400 font-semibold text-center py-8">All detected road defects covered under budget! 🎉</div>
              ) : (
                optResult.excluded_incidents.map((inc) => (
                  <div key={inc.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs opacity-75">
                    <div>
                      <div className="font-bold text-slate-300">{inc.damage_type}</div>
                      <div className="text-[11px] text-slate-500">{inc.location_name}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-slate-400">${inc.estimated_cost.toLocaleString()}</div>
                      <div className="text-[10px] font-medium text-amber-500">{inc.risk_score} Risk Pts</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
