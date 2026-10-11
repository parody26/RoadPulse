// Indian Municipal Road Repair Cost Estimation Engine
// Pothole repair cost is strictly fixed at ₹2,700 flat per unit.

export const FIXED_POTHOLE_COST = 2700;

export const IRC_COST_SPECIFICATIONS = {
  "Pothole": {
    standard: "Municipal Tender Schedule (IRC:82 & IRC:116)",
    description: "Cold mix / Bituminous concrete edge squaring & compaction",
    fixedCost: 2700
  },
  "Safe Bituminous Patch": {
    standard: "IRC:82-2015 (Repaired Surface)",
    description: "Existing compacted bitumen patch - road surface flush and safe",
    fixedCost: 0
  },
  "No Defects Detected": {
    standard: "IRC:SP:16 (Acceptable Surface Quality)",
    description: "Good road surface condition - zero repair cost",
    fixedCost: 0
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

export function calculateIRCCost(damageType, severity = 0.8, roadImportance = 0.8, count = 1) {
  if (!damageType || damageType === 'None' || damageType === 'Clean' || damageType === 'Safe' || 
      damageType.includes('Safe') || damageType.includes('No Defect') || count <= 0) {
    return 0;
  }

  // Strictly ₹2,700 flat per pothole
  if (damageType.toLowerCase().includes('pothole')) {
    return (count || 1) * FIXED_POTHOLE_COST;
  }

  const spec = IRC_COST_SPECIFICATIONS[damageType] || IRC_COST_SPECIFICATIONS["Pothole"];
  if (spec.fixedCost !== undefined) {
    return (count || 1) * spec.fixedCost;
  }

  const sev = Math.max(0.1, Math.min(1.0, parseFloat(severity) || 0.8));
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
