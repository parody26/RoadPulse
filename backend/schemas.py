from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class EvidenceSchema(BaseModel):
    id: str
    incident_id: str
    video_id: Optional[str] = None
    frame_timestamp: float
    image_url: str
    bbox_json: Optional[str] = None

    class Config:
        from_attributes = True

class RepairSchema(BaseModel):
    id: str
    incident_id: str
    assigned_team: Optional[str] = None
    repair_status: str
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class IncidentSchema(BaseModel):
    id: str
    latitude: float
    longitude: float
    damage_type: str
    severity: float
    confidence: float
    road_importance: float
    exposure_factor: float
    risk_score: float
    status: str
    estimated_cost: float
    location_name: str
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    points_awarded: Optional[int] = 100
    created_at: datetime
    evidence: List[EvidenceSchema] = []
    repairs: List[RepairSchema] = []

    class Config:
        from_attributes = True

class IncidentCreateSchema(BaseModel):
    id: Optional[str] = None
    latitude: float
    longitude: float
    damage_type: str = "Pothole"
    severity: float = 0.85
    confidence: float = 0.94
    road_importance: float = 0.8
    exposure_factor: float = 0.7
    risk_score: float = 82.5
    status: str = "reported"
    estimated_cost: float = 2700.0
    location_name: str = "Live Citizen Report"
    reporter_name: Optional[str] = "Citizen Reporter"
    reporter_email: Optional[str] = None
    points_awarded: int = 100
    evidence_image_url: Optional[str] = None
    image_url: Optional[str] = None
    bbox_json: Optional[str] = None

class UserSchema(BaseModel):
    id: str
    email: str
    name: str
    avatar: Optional[str] = None
    points: int = 100
    potholes_reported: int = 0
    total_reports: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class GoogleAuthRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    avatar: Optional[str] = None
    google_id: Optional[str] = None
    credential: Optional[str] = None
    id_token: Optional[str] = None
    access_token: Optional[str] = None

class IncidentUpdateSchema(BaseModel):
    status: Optional[str] = None
    severity: Optional[float] = None
    road_importance: Optional[float] = None
    exposure_factor: Optional[float] = None
    estimated_cost: Optional[float] = None

class VideoSchema(BaseModel):
    id: str
    filename: str
    uploaded_at: datetime
    processing_status: str
    frame_count: int
    duration_sec: float
    user_latitude: Optional[float] = None
    user_longitude: Optional[float] = None

    class Config:
        from_attributes = True

class OptimizeRequest(BaseModel):
    budget: float
    incident_ids: Optional[List[str]] = None

class OptimizeResponse(BaseModel):
    budget: float
    total_cost: float
    total_benefit: float
    selected_incidents: List[IncidentSchema]
    excluded_incidents: List[IncidentSchema]

class VerificationRequest(BaseModel):
    verified_by: str
    notes: Optional[str] = None
    after_image_url: Optional[str] = None

class ReportRequest(BaseModel):
    title: str = "Municipal Road Repair Work Order"
    budget_allocated: float = 15000.0
    incident_ids: List[str]
