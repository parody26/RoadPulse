from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Incident
from schemas import IncidentSchema, IncidentUpdateSchema
from services.risk_engine import calculate_risk_score

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentSchema])
def list_incidents(
    status: Optional[str] = Query(None),
    damage_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if damage_type:
        query = query.filter(Incident.damage_type == damage_type)
    
    incidents = query.order_by(Incident.risk_score.desc()).all()
    return incidents

@router.get("/{incident_id}", response_model=IncidentSchema)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.patch("/{incident_id}", response_model=IncidentSchema)
def update_incident(incident_id: str, payload: IncidentUpdateSchema, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if payload.status is not None:
        incident.status = payload.status
    if payload.severity is not None:
        incident.severity = payload.severity
    if payload.road_importance is not None:
        incident.road_importance = payload.road_importance
    if payload.exposure_factor is not None:
        incident.exposure_factor = payload.exposure_factor
    if payload.estimated_cost is not None:
        incident.estimated_cost = payload.estimated_cost

    # Recalculate explainable risk score
    incident.risk_score = calculate_risk_score(
        severity=incident.severity,
        road_importance=incident.road_importance,
        exposure_factor=incident.exposure_factor,
        confidence=incident.confidence
    )

    db.commit()
    db.refresh(incident)
    return incident

@router.post("/clear")
def clear_all_incidents(db: Session = Depends(get_db)):
    from models import Evidence, Repair, Video
    db.query(Evidence).delete()
    db.query(Repair).delete()
    db.query(Incident).delete()
    db.query(Video).delete()
    db.commit()
    return {"message": "All incidents cleared successfully", "count": 0}

