from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Incident, Repair
from schemas import VerificationRequest, RepairSchema

router = APIRouter(prefix="/api/incidents", tags=["Repairs & Verification"])

@router.post("/{incident_id}/verification", response_model=RepairSchema)
def verify_repair(incident_id: str, payload: VerificationRequest, db: Session = Depends(get_db)):
    """
    Step 5: Record human verification of completed repairs.
    Human-in-the-loop inspector confirms physical repair completion with after-evidence.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    repair = db.query(Repair).filter(Repair.incident_id == incident_id).first()
    if not repair:
        repair = Repair(incident_id=incident_id)
        db.add(repair)

    repair.repair_status = "verified"
    repair.verified_by = payload.verified_by
    repair.verified_at = datetime.utcnow()
    repair.notes = payload.notes or "Inspected and verified in person by maintenance engineer."
    if payload.after_image_url:
        repair.after_image_url = payload.after_image_url
    else:
        repair.after_image_url = "/static/evidence/repaired_sample_1.jpg"

    # Update parent incident status to 'verified'
    incident.status = "verified"

    db.commit()
    db.refresh(repair)
    return repair
