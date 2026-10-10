def calculate_risk_score(severity: float, road_importance: float, exposure_factor: float, confidence: float) -> float:
    """
    Calculates an explainable risk score between 0.0 and 100.0 based on:
    - S (Severity): 0.45 weight
    - R (Road Importance): 0.25 weight
    - E (Exposure Factor): 0.20 weight
    - C (Detection Confidence): 0.10 weight
    """
    s = max(0.0, min(1.0, severity))
    r = max(0.0, min(1.0, road_importance))
    e = max(0.0, min(1.0, exposure_factor))
    c = max(0.0, min(1.0, confidence))

    score = 100.0 * (0.45 * s + 0.25 * r + 0.20 * e + 0.10 * c)
    return round(score, 1)

def explain_risk_score(severity: float, road_importance: float, exposure_factor: float, confidence: float) -> dict:
    """
    Provides a detailed breakdown of factor contributions to the total risk score.
    """
    total = calculate_risk_score(severity, road_importance, exposure_factor, confidence)
    return {
        "total_score": total,
        "factors": {
            "severity": {
                "val": round(severity, 2),
                "weight": 0.45,
                "points": round(45.0 * severity, 1)
            },
            "road_importance": {
                "val": round(road_importance, 2),
                "weight": 0.25,
                "points": round(25.0 * road_importance, 1)
            },
            "exposure_factor": {
                "val": round(exposure_factor, 2),
                "weight": 0.20,
                "points": round(20.0 * exposure_factor, 1)
            },
            "confidence": {
                "val": round(confidence, 2),
                "weight": 0.10,
                "points": round(10.0 * confidence, 1)
            }
        },
        "urgency_level": "Critical" if total >= 75 else ("High" if total >= 55 else ("Medium" if total >= 35 else "Low"))
    }
