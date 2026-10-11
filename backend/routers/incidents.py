import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Incident, Evidence, Repair, User
from schemas import IncidentSchema, IncidentCreateSchema, IncidentUpdateSchema
from services.risk_engine import calculate_risk_score
from services.cost_engine import FIXED_POTHOLE_COST

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
    
    incidents = query.order_by(Incident.created_at.desc()).all()
    return incidents

@router.post("", response_model=IncidentSchema)
def create_incident(payload: IncidentCreateSchema, db: Session = Depends(get_db)):
    """
    Directly registers citizen defect reports so that any incident reported by any user
    is immediately and permanently persisted to the SQLite database and always
    reflected in the Admin Portal across all sessions.
    """
    incident_id = payload.id or str(uuid.uuid4())

    # Strictly ₹2,700 flat per pothole or ₹0 for sound road
    if "pothole" in payload.damage_type.lower():
        cost = FIXED_POTHOLE_COST
    elif any(k in payload.damage_type.lower() for k in ["safe", "none", "clean", "good"]):
        cost = 0.0
    else:
        cost = payload.estimated_cost

    incident = Incident(
        id=incident_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        damage_type=payload.damage_type,
        severity=payload.severity,
        confidence=payload.confidence,
        road_importance=payload.road_importance,
        exposure_factor=payload.exposure_factor,
        risk_score=payload.risk_score,
        status=payload.status or "reported",
        estimated_cost=cost,
        location_name=payload.location_name,
        reporter_name=payload.reporter_name or "Citizen Reporter",
        reporter_email=payload.reporter_email,
        points_awarded=payload.points_awarded,
        created_at=datetime.utcnow()
    )
    db.add(incident)
    db.flush()

    # Create repair workflow record
    repair = Repair(
        incident_id=incident.id,
        assigned_team="Municipal Maintenance Unit #4",
        repair_status="pending"
    )
    db.add(repair)

    # Attach visual evidence
    evidence_img = payload.evidence_image_url or payload.image_url
    if evidence_img:
        evidence = Evidence(
            incident_id=incident.id,
            frame_timestamp=1.5,
            image_url=evidence_img,
            bbox_json=payload.bbox_json or json.dumps({
                "class": payload.damage_type,
                "confidence": payload.confidence
            })
        )
        db.add(evidence)

    # Credit points to reporting user if user email is present
    if payload.reporter_email:
        user = db.query(User).filter(User.email == payload.reporter_email).first()
        if user:
            user.points += payload.points_awarded
            if "pothole" in payload.damage_type.lower():
                user.potholes_reported += 1
            user.total_reports += 1

    db.commit()
    db.refresh(incident)
    return incident

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

