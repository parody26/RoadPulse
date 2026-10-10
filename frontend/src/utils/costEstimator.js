// Indian Municipal Road Repair Cost Estimation Engine
// Based on Indian Roads Congress (IRC:82-2015 / IRC:116) and CPWD Delhi Schedule of Rates (DSR)

export const IRC_COST_SPECIFICATIONS = {
  "Pothole": {
    standard: "IRC:82-2015 & IRC:116",
    description: "Vertical edge squaring, RS-1 tack coat, 40mm Bituminous Concrete/Cold Mix & mechanical plate compaction",
    prepBase: 450,
    unitRateSqm: 1550,
    compaction: 300,
    minArea: 0.35,
    maxAreaFactor: 0.90
  },
  "Alligator Crack": {
    standard: "IRC:82-2015 Cl. 5.3",
    description: "Scarifying/milling 50mm distressed surface, RS-1 tack coat, 50mm DBM + 30mm BC asphalt overlay",
    prepBase: 1200,
    unitRateSqm: 2100,
    compaction: 500,
    minArea: 1.20,
    maxAreaFactor: 2.80
  },
  "Longitudinal Crack": {
    standard: "IRC:82-2015 Cl. 5.2",
    description: "High-pressure air cleaning, routing (10x15mm), hot polymer-modified elastomeric sealant",
    prepBase: 350,
    unitRateM: 320,
    minLen: 2.0,
    maxLenFactor: 5.0
  },
  "Transverse Crack": {
    standard: "IRC:82-2015 Cl. 5.1",
    description: "Crack widening (15x20mm), emulsified bitumen primer, rubberized bitumen sealant with stone dust blinding",
    prepBase: 400,
    unitRateM: 360,
    minLen: 2.5,
    maxLenFactor: 4.5
  }
};

export function calculateIRCCost(damageType, severity = 0.8, roadImportance = 0.8) {
  const sev = Math.max(0.1, Math.min(1.0, parseFloat(severity) || 0.8));
  const spec = IRC_COST_SPECIFICATIONS[damageType] || IRC_COST_SPECIFICATIONS["Pothole"];

  let total = 0;
  if (spec.unitRateSqm) {
    const area = spec.minArea + (sev * spec.maxAreaFactor);
    total = spec.prepBase + (area * spec.unitRateSqm) + (spec.compaction || 0);
  } else {
    const len = spec.minLen + (sev * spec.maxLenFactor);
    total = spec.prepBase + (len * spec.unitRateM);
  }

  // Major arterial road / highway traffic factor
  if (roadImportance > 0.85) total *= 1.15;
  else if (roadImportance > 0.70) total *= 1.08;

  // Round to nearest 50 Rupees
  return Math.round(total / 50) * 50;
}

export function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return '₹' + Math.round(Number(amount)).toLocaleString('en-IN');
}
