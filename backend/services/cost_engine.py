"""
Indian Municipal Road Repair Cost Estimation Engine
Calculates scientifically accurate repair costs in Indian Rupees (INR - ₹)
based on Indian Roads Congress (IRC:82-2015, IRC:116) and
Central Public Works Department (CPWD) Delhi Schedule of Rates (DSR).
"""

from typing import Dict, Any

# CPWD DSR / IRC:82 Base Rates (in INR - ₹)
RATES = {
    "Pothole": {
        "standard": "IRC:82-2015 / IRC:116 (Cold Mix Bituminous Patching)",
        "methodology": "Edge squaring, RS-1 tack coat, 40mm Bituminous Concrete/Cold Mix & vibratory compaction",
        "prep_base": 450.0,          # Base mobilization and edge sawing
        "unit_rate_sqm": 1550.0,     # Rate per m² (material + labor as per CPWD DSR)
        "compaction": 300.0,         # Vibratory plate compaction
        "min_area": 0.35,            # Min defect area in m²
        "max_area_factor": 0.90      # Area scaling with severity
    },
    "Alligator Crack": {
        "standard": "IRC:82-2015 Cl. 5.3 (Fatigue Pavement Rehabilitation)",
        "methodology": "Scarifying/milling distressed wearing course (50mm), tack coat, 50mm DBM + 30mm BC overlay",
        "prep_base": 1200.0,         # Milling machinery mobilization
        "unit_rate_sqm": 2100.0,     # Rate per m² (DBM + BC + Tack Coat as per CPWD DSR)
        "compaction": 500.0,
        "min_area": 1.20,
        "max_area_factor": 2.80
    },
    "Longitudinal Crack": {
        "standard": "IRC:82-2015 Cl. 5.2 (Pavement Joint & Crack Sealing)",
        "methodology": "Crack routing (10x15mm), high-pressure air cleaning, hot elastomeric polymer-modified bitumen sealant",
        "prep_base": 350.0,          # Air compressor and router setup
        "unit_rate_m": 320.0,        # Rate per running meter (IRC:82 polymer sealant)
        "min_len": 2.0,              # Min crack length in meters
        "max_len_factor": 5.0
    },
    "Transverse Crack": {
        "standard": "IRC:82-2015 Cl. 5.1 (Thermal & Transverse Crack Sealing)",
        "methodology": "Crack widening (15x20mm), emulsified bitumen primer, rubberized bitumen sealant with stone dust blinding",
        "prep_base": 400.0,
        "unit_rate_m": 360.0,        # Rate per running meter
        "min_len": 2.5,
        "max_len_factor": 4.5
    }
}

def calculate_repair_cost(damage_type: str, severity: float, road_importance: float = 0.8) -> float:
    """
    Computes realistic municipal repair cost in INR (₹) for a given defect.
    Considers severity, defect dimensions, and road traffic importance multiplier.
    """
    sev = max(0.1, min(1.0, float(severity)))
    config = RATES.get(damage_type, RATES["Pothole"])

    if "unit_rate_sqm" in config:
        # Area-based defect (Pothole or Alligator crack)
        area = config["min_area"] + (sev * config["max_area_factor"])
        material_cost = area * config["unit_rate_sqm"]
        total = config["prep_base"] + material_cost + config.get("compaction", 0.0)
    else:
        # Linear defect (Cracks)
        length = config["min_len"] + (sev * config["max_len_factor"])
        material_cost = length * config["unit_rate_m"]
        total = config["prep_base"] + material_cost

    # Major arterial roads / highways incur slight traffic diversion & night shift surcharge (up to 15%)
    if road_importance > 0.85:
        total *= 1.15
    elif road_importance > 0.70:
        total *= 1.08

    # Round to nearest ₹50 for practical tender estimation
    return float(round(total / 50.0) * 50)

def get_cost_breakdown(damage_type: str, severity: float, road_importance: float = 0.8) -> Dict[str, Any]:
    """
    Returns itemized cost estimation breakdown according to CPWD Schedule of Rates.
    """
    sev = max(0.1, min(1.0, float(severity)))
    config = RATES.get(damage_type, RATES["Pothole"])
    total = calculate_repair_cost(damage_type, sev, road_importance)

    if "unit_rate_sqm" in config:
        dim_str = f"Estimated Area: {round(config['min_area'] + (sev * config['max_area_factor']), 2)} m²"
    else:
        dim_str = f"Estimated Crack Length: {round(config['min_len'] + (sev * config['max_len_factor']), 1)} m"

    return {
        "total_cost_inr": total,
        "formatted_cost": f"₹{int(total):,}",
        "standard": config["standard"],
        "methodology": config["methodology"],
        "dimensions": dim_str,
        "currency": "INR",
        "currency_symbol": "₹"
    }
