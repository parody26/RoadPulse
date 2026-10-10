import os
import shutil
from datetime import datetime
from database import engine, Base, SessionLocal
from models import Video, Incident, Evidence, Repair
from services.risk_engine import calculate_risk_score
from config import EVIDENCE_DIR

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create dummy evidence image placeholders if not exist
    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    
    # Check if data already exists
    if db.query(Incident).count() > 0:
        db.close()
        return

    print("Seeding RoadPulse database with initial hackathon MVP data...")

    # Sample Video
    video = Video(
        id="vid_demo_mg_road",
        filename="inspection_mg_road_sector4.mp4",
        processing_status="completed",
        frame_count=450,
        duration_sec=15.0
    )
    db.add(video)

    # 6 Sample Incidents across MG Road corridor
    sample_data = [
        {
            "id": "inc_001",
            "lat": 12.9716, "lon": 77.5946,
            "type": "Pothole",
            "sev": 0.92, "conf": 0.94, "imp": 0.85, "exp": 0.80, "cost": 3500.0,
            "loc": "MG Road near Metro Pillar 142", "status": "reported",
            "img": "pothole_high.jpg"
        },
        {
            "id": "inc_002",
            "lat": 12.9738, "lon": 77.5968,
            "type": "Alligator Crack",
            "sev": 0.81, "conf": 0.88, "imp": 0.80, "exp": 0.75, "cost": 2800.0,
            "loc": "MG Road & Residency Rd Junction", "status": "reviewed",
            "img": "alligator_crack.jpg"
        },
        {
            "id": "inc_003",
            "lat": 12.9762, "lon": 77.5991,
            "type": "Pothole",
            "sev": 0.65, "conf": 0.89, "imp": 0.70, "exp": 0.60, "cost": 2200.0,
            "loc": "MG Road Signal North", "status": "in_progress",
            "img": "pothole_med.jpg"
        },
        {
            "id": "inc_004",
            "lat": 12.9791, "lon": 77.6023,
            "type": "Longitudinal Crack",
            "sev": 0.48, "conf": 0.82, "imp": 0.65, "exp": 0.50, "cost": 1500.0,
            "loc": "Brigade Road Turning", "status": "reported",
            "img": "longitudinal_crack.jpg"
        },
        {
            "id": "inc_005",
            "lat": 12.9825, "lon": 77.6055,
            "type": "Transverse Crack",
            "sev": 0.42, "conf": 0.85, "imp": 0.60, "exp": 0.45, "cost": 1200.0,
            "loc": "Cubbon Park Entrance Road", "status": "verified",
            "img": "transverse_crack.jpg"
        },
        {
            "id": "inc_006",
            "lat": 12.9856, "lon": 77.6087,
            "type": "Pothole",
            "sev": 0.88, "conf": 0.95, "imp": 0.90, "exp": 0.85, "cost": 4000.0,
            "loc": "Trinity Circle Flyover Ramp", "status": "reported",
            "img": "pothole_flyover.jpg"
        }
    ]

    for item in sample_data:
        risk = calculate_risk_score(item["sev"], item["imp"], item["exp"], item["conf"])
        inc = Incident(
            id=item["id"],
            latitude=item["lat"],
            longitude=item["lon"],
            damage_type=item["type"],
            severity=item["sev"],
            confidence=item["conf"],
            road_importance=item["imp"],
            exposure_factor=item["exp"],
            risk_score=risk,
            status=item["status"],
            estimated_cost=item["cost"],
            location_name=item["loc"]
        )
        db.add(inc)

        # Evidence image
        evidence = Evidence(
            incident_id=inc.id,
            video_id=video.id,
            frame_timestamp=3.5,
            image_url=f"/static/evidence/{item['img']}",
            bbox_json='{"x": 140, "y": 120, "w": 200, "h": 150, "class": "' + item["type"] + '", "confidence": ' + str(item["conf"]) + '}'
        )
        db.add(evidence)

        # Repair status record
        repair = Repair(
            incident_id=inc.id,
            assigned_team="Municipal Maintenance Unit #3",
            repair_status="verified" if item["status"] == "verified" else ("in_progress" if item["status"] == "in_progress" else "pending"),
            verified_by="Eng. Rajesh Kumar" if item["status"] == "verified" else None,
            verified_at=datetime.utcnow() if item["status"] == "verified" else None,
            notes="Physical inspection confirmed repair completion." if item["status"] == "verified" else "Assigned to maintenance queue."
        )
        db.add(repair)

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed()
