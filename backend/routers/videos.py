import os
import shutil
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Video, Incident, Evidence, Repair
from schemas import VideoSchema
from config import UPLOADS_DIR
from services.cv_pipeline import process_video_cv
from services.deduplicator import merge_duplicate_detections
from services.risk_engine import calculate_risk_score

router = APIRouter(prefix="/api/videos", tags=["Videos"])

@router.post("", response_model=VideoSchema)
def upload_video(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Step 1: Citizens / Inspectors submit live recorded road inspection videos with live GPS coordinates.
    Direct website recording guarantees location authenticity.
    """
    video_id = str(file.filename.split('.')[0]) + "_" + str(os.urandom(4).hex())
    file_extension = os.path.splitext(file.filename)[1] or ".mp4"
    save_filename = f"{video_id}{file_extension}"
    save_path = os.path.join(UPLOADS_DIR, save_filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    video_record = Video(
        id=video_id,
        filename=file.filename,
        user_latitude=latitude,
        user_longitude=longitude,
        processing_status="uploaded"
    )
    db.add(video_record)
    db.commit()
    db.refresh(video_record)
    return video_record

@router.post("/{video_id}/process", response_model=VideoSchema)
def process_video(video_id: str, db: Session = Depends(get_db)):
    """
    Step 2 & 3: Run Computer Vision damage detection, extract frames,
    associate live user GPS coordinates, and spatially deduplicate incidents.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    video.processing_status = "processing"
    db.commit()

    file_extension = os.path.splitext(video.filename)[1] or ".mp4"
    save_filename = f"{video.id}{file_extension}"
    save_path = os.path.join(UPLOADS_DIR, save_filename)

    try:
        # Pass live user GPS coordinates to CV pipeline if available
        user_gps = (video.user_latitude, video.user_longitude) if (video.user_latitude and video.user_longitude) else None
        duration_sec, frame_count, raw_detections = process_video_cv(save_path, video.id, user_gps=user_gps)
        
        # Deduplicate detections
        clusters = merge_duplicate_detections(raw_detections)

        for cluster in clusters:
            # Calculate explainable risk score
            r_score = calculate_risk_score(
                severity=cluster['severity'],
                road_importance=cluster['road_importance'],
                exposure_factor=cluster['exposure_factor'],
                confidence=cluster['confidence']
            )

            incident = Incident(
                latitude=cluster['latitude'],
                longitude=cluster['longitude'],
                damage_type=cluster['damage_type'],
                severity=cluster['severity'],
                confidence=cluster['confidence'],
                road_importance=cluster['road_importance'],
                exposure_factor=cluster['exposure_factor'],
                risk_score=r_score,
                status="reported",
                estimated_cost=cluster['detections'][0]['estimated_cost'],
                location_name=cluster['location_name']
            )
            db.add(incident)
            db.flush()

            # Create default repair record for tracking workflow
            repair = Repair(
                incident_id=incident.id,
                assigned_team="Municipal Road Maintenance Team #4",
                repair_status="pending"
            )
            db.add(repair)

            # Link evidence images
            for det in cluster['detections']:
                evidence = Evidence(
                    incident_id=incident.id,
                    video_id=video.id,
                    frame_timestamp=det['frame_timestamp'],
                    image_url=det['image_url'],
                    bbox_json=det['bbox_json']
                )
                db.add(evidence)

        video.processing_status = "completed"
        video.duration_sec = duration_sec
        video.frame_count = frame_count
        db.commit()
        db.refresh(video)
        return video

    except Exception as e:
        video.processing_status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.get("/{video_id}", response_model=VideoSchema)
def get_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video
