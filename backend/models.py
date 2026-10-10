import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    gps_data_json = Column(Text, nullable=True) # GeoJSON or list of timestamps & coords
    user_latitude = Column(Float, nullable=True) # Live GPS Lat captured at recording time
    user_longitude = Column(Float, nullable=True) # Live GPS Lon captured at recording time
    processing_status = Column(String, default="pending") # pending | processing | completed | failed
    frame_count = Column(Integer, default=0)
    duration_sec = Column(Float, default=0.0)

    evidence = relationship("Evidence", back_populates="video", cascade="all, delete-orphan")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=generate_uuid)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    damage_type = Column(String, nullable=False) # Pothole | Longitudinal Crack | Transverse Crack | Alligator Crack
    severity = Column(Float, nullable=False) # 0.0 to 1.0
    confidence = Column(Float, nullable=False) # 0.0 to 1.0
    road_importance = Column(Float, default=0.7) # 0.0 to 1.0
    exposure_factor = Column(Float, default=0.6) # 0.0 to 1.0
    risk_score = Column(Float, nullable=False) # 0.0 to 100.0
    status = Column(String, default="reported") # reported | reviewed | in_progress | completed | verified
    estimated_cost = Column(Float, default=2500.0)
    location_name = Column(String, default="MG Road, Sector 4")
    created_at = Column(DateTime, default=datetime.utcnow)

    evidence = relationship("Evidence", back_populates="incident", cascade="all, delete-orphan")
    repairs = relationship("Repair", back_populates="incident", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=generate_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    video_id = Column(String, ForeignKey("videos.id"), nullable=True)
    frame_timestamp = Column(Float, default=0.0)
    image_url = Column(String, nullable=False)
    bbox_json = Column(Text, nullable=True) # JSON string of bounding box: {x, y, w, h, class, conf}

    incident = relationship("Incident", back_populates="evidence")
    video = relationship("Video", back_populates="evidence")

class Repair(Base):
    __tablename__ = "repairs"

    id = Column(String, primary_key=True, default=generate_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    assigned_team = Column(String, default="Municipal Maintenance Unit #3")
    repair_status = Column(String, default="pending") # pending | in_progress | completed | verified
    before_image_url = Column(String, nullable=True)
    after_image_url = Column(String, nullable=True)
    verified_by = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    incident = relationship("Incident", back_populates="repairs")
