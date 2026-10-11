"""
Indian Municipal Road Repair Cost Estimation Engine
Calculates scientifically accurate repair costs in Indian Rupees (INR - ₹)
based on Indian Roads Congress (IRC:82-2015, IRC:116) and
Central Public Works Department (CPWD) Delhi Schedule of Rates (DSR).
"""

from typing import Dict, Any

FIXED_POTHOLE_COST = 2700.0

# Base Rates (in INR - ₹)
RATES = {
    "Pothole": {
        "standard": "Standard Municipal Tender Rate (IRC:82-2015 & IRC:116)",
        "methodology": "Edge squaring, RS-1 tack coat, 40mm Bituminous Concrete/Cold Mix & plate compaction",
        "fixed_cost": 2700.0,
        "description": "Standard Flat Repair Cost per Pothole: ₹2,700"
    },
    "Safe Bituminous Patch": {
        "standard": "IRC:82-2015 (Repaired Surface)",
        "methodology": "Existing compacted bitumen patch - road surface flush and safe",
        "fixed_cost": 0.0,
        "description": "Repaired road patch - no maintenance required: ₹0"
    },
    "No Defects Detected": {
        "standard": "IRC:SP:16 (Acceptable Surface Quality)",
        "methodology": "Sound road pavement in satisfactory riding condition",
        "fixed_cost": 0.0,
        "description": "Good road condition - zero repair cost: ₹0"
    },
    "Alligator Crack": {
        "standard": "IRC:82-2015 Cl. 5.3 (Fatigue Pavement Rehabilitation)",
        "methodology": "Scarifying/milling distressed wearing course (50mm), tack coat, 50mm DBM + 30mm BC overlay",
        "prep_base": 1200.0,
        "unit_rate_sqm": 2100.0,
        "compaction": 500.0,
        "min_area": 1.20,
        "max_area_factor": 2.80
    },
    "Longitudinal Crack": {
        "standard": "IRC:82-2015 Cl. 5.2 (Pavement Joint & Crack Sealing)",
        "methodology": "Crack routing (10x15mm), high-pressure air cleaning, hot elastomeric polymer-modified bitumen sealant",
        "prep_base": 350.0,
        "unit_rate_m": 320.0,
        "min_len": 2.0,
        "max_len_factor": 5.0
    },
    "Transverse Crack": {
        "standard": "IRC:82-2015 Cl. 5.1 (Thermal & Transverse Crack Sealing)",
        "methodology": "Crack widening (15x20mm), emulsified bitumen primer, rubberized bitumen sealant with stone dust blinding",
        "prep_base": 400.0,
        "unit_rate_m": 360.0,
        "min_len": 2.5,
        "max_len_factor": 4.5
    }
}

def calculate_repair_cost(damage_type: str, severity: float = 0.8, road_importance: float = 0.8, defect_count: int = 1) -> float:
    """
    Computes repair cost in INR (₹).
    - Every pothole has a strictly fixed cost of ₹2,700.
    - Zero defects or safe patches incur ₹0.
    """
    if damage_type in ["None", "Clean", "Safe", "Safe Bituminous Patch", "No Defects Detected", "No Road Defects Detected"]:
        return 0.0

    if defect_count <= 0:
        return 0.0

    # Strictly ₹2,700 flat per pothole
    if "pothole" in damage_type.lower():
        return float(defect_count * FIXED_POTHOLE_COST)

    sev = max(0.1, min(1.0, float(severity)))
    config = RATES.get(damage_type, RATES["Pothole"])

    if "fixed_cost" in config:
        return float(config["fixed_cost"] * defect_count)

    if "unit_rate_sqm" in config:
        area = config["min_area"] + (sev * config["max_area_factor"])
        material_cost = area * config["unit_rate_sqm"]
        total = config["prep_base"] + material_cost + config.get("compaction", 0.0)
    else:
        length = config["min_len"] + (sev * config["max_len_factor"])
        material_cost = length * config["unit_rate_m"]
        total = config["prep_base"] + material_cost

    if road_importance > 0.85:
        total *= 1.15
    elif road_importance > 0.70:
        total *= 1.08

    return float(round(total / 50.0) * 50)

def get_cost_breakdown(damage_type: str, severity: float = 0.8, road_importance: float = 0.8, defect_count: int = 1) -> Dict[str, Any]:
    """
    Returns itemized cost estimation breakdown in INR.
    """
    if damage_type in ["None", "Clean", "Safe", "Safe Bituminous Patch", "No Defects Detected", "No Road Defects Detected"] or defect_count <= 0:
        return {
            "total_cost_inr": 0.0,
            "formatted_cost": "₹0",
            "standard": "IRC Surface Standards",
            "methodology": "No structural defect detected - road in safe condition",
            "dimensions": "0 defects",
            "currency": "INR",
            "currency_symbol": "₹"
        }

    total = calculate_repair_cost(damage_type, severity, road_importance, defect_count)
    config = RATES.get(damage_type, RATES["Pothole"])

    if "pothole" in damage_type.lower():
        dim_str = f"{defect_count} Pothole(s) @ ₹2,700 fixed tender rate per unit"
    elif "unit_rate_sqm" in config:
        dim_str = f"Estimated Area: {round(config['min_area'] + (severity * config['max_area_factor']), 2)} m²"
    else:
        dim_str = f"Estimated Crack Length: {round(config['min_len'] + (severity * config['max_len_factor']), 1)} m"

    return {
        "total_cost_inr": total,
        "formatted_cost": f"₹{int(total):,}",
        "standard": config.get("standard", "Standard Municipal Tender Rate"),
        "methodology": config.get("methodology", "Cold Mix / Bituminous Concrete Compaction"),
        "dimensions": dim_str,
        "currency": "INR",
        "currency_symbol": "₹"
    }
