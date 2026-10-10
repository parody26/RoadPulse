from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Incident
from schemas import ReportRequest

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.post("")
def generate_work_order_report(payload: ReportRequest, db: Session = Depends(get_db)):
    """
    Step 5: Generate official municipal repair work order report.
    """
    incidents = db.query(Incident).filter(Incident.id.in_(payload.incident_ids)).all()
    if not incidents:
        raise HTTPException(status_code=400, detail="No incidents provided for report generation")

    total_cost = sum(inc.estimated_cost for inc in incidents)
    total_benefit = sum(inc.risk_score for inc in incidents)

    items = []
    for idx, inc in enumerate(incidents, 1):
        items.append({
            "item_no": idx,
            "incident_id": inc.id,
            "damage_type": inc.damage_type,
            "location_name": inc.location_name,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "severity": f"{int(inc.severity * 100)}%",
            "risk_score": inc.risk_score,
            "estimated_cost": f"₹{int(inc.estimated_cost):,}",
            "status": inc.status
        })

    report = {
        "report_id": f"RP-WO-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
        "title": payload.title,
        "generated_at": datetime.utcnow().isoformat(),
        "municipality": "Municipal Corporation Road Infrastructure Division",
        "budget_allocated": f"₹{int(payload.budget_allocated):,}",
        "total_estimated_cost": f"₹{int(total_cost):,}",
        "budget_remaining": f"₹{int(max(0.0, payload.budget_allocated - total_cost)):,}",
        "total_risk_reduced": round(total_benefit, 1),
        "total_incidents_selected": len(incidents),
        "work_order_items": items
    }
    return report
