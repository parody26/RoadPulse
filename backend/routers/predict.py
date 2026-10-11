import os
import base64
import logging
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
try:
    from services.risk_engine import calculate_risk_score
    from services.indian_road_ai import inspect_road_frame
    from services.train_indian_potholes import generate_indian_pothole_dataset, train_indian_pothole_yolo
except ImportError:
    from backend.services.risk_engine import calculate_risk_score
    from backend.services.indian_road_ai import inspect_road_frame
    from backend.services.train_indian_potholes import generate_indian_pothole_dataset, train_indian_pothole_yolo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predict", tags=["Realtime Prediction & Training"])

class FramePredictRequest(BaseModel):
    image_base64: str  # data:image/jpeg;base64,...
    confidence_threshold: float = 0.25

class DetectionBox(BaseModel):
    damage_type: str
    confidence: float
    severity: float
    risk_score: float
    estimated_cost: Optional[float] = 0.0
    bbox: List[int]  # [x, y, w, h]

class FramePredictResponse(BaseModel):
    annotated_image_base64: str
    detections: List[DetectionBox]
    defect_detected: bool
    pothole_count: int
    total_cost: Optional[float] = 0.0
    primary_defect: str
    highest_risk_score: float
    fps_estimate: float = 30.0

@router.post("/frame", response_model=FramePredictResponse)
def predict_frame(payload: FramePredictRequest):
    """
    Indian Road AI Real-Time Frame Inspector.
    Discriminates between flat bituminous patches (safe/non-hazard)
    and authentic 3D pothole cavities on Indian street surfaces.
    """
    try:
        raw_b64 = payload.image_base64.split(",")[-1]
        img_bytes = base64.b64decode(raw_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image frame encoding")

        # Run Indian Road AI Inspector
        result = inspect_road_frame(img, conf_threshold=payload.confidence_threshold)

        detection_boxes = []
        for det in result["detections"]:
            detection_boxes.append(DetectionBox(
                damage_type=det["damage_type"],
                confidence=det["confidence"],
                severity=det["severity"],
                risk_score=det["risk_score"],
                estimated_cost=0.0,
                bbox=det["bbox"]
            ))

        # Encode annotated image back to base64
        _, buffer = cv2.imencode('.jpg', result["annotated_frame"], [cv2.IMWRITE_JPEG_QUALITY, 85])
        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

        return FramePredictResponse(
            annotated_image_base64=annotated_b64,
            detections=detection_boxes,
            defect_detected=result["defect_detected"],
            pothole_count=result["pothole_count"],
            total_cost=0.0,
            primary_defect=result["primary_defect"],
            highest_risk_score=result["highest_risk_score"]
        )

    except Exception as e:
        logger.error(f"Error in predict_frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _run_training_job():
    try:
        yaml_path = generate_indian_pothole_dataset(num_train=300, num_val=60)
        train_indian_pothole_yolo(yaml_path, epochs=10)
    except Exception as e:
        logger.error(f"Training job error: {e}")

@router.post("/train")
def trigger_training(background_tasks: BackgroundTasks):
    """
    Triggers local model training in background on Indian street pothole dataset.
    """
    background_tasks.add_task(_run_training_job)
    return {
        "status": "Training started",
        "message": "Indian road pothole model training initiated in background."
    }
