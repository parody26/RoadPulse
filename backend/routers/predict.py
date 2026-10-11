import os
import base64
import logging
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from services.risk_engine import calculate_risk_score
from services.cost_engine import FIXED_POTHOLE_COST
from services.indian_road_ai import inspect_road_frame
from ai_training.train_local_model import train_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predict", tags=["Realtime Prediction & Training"])

class FramePredictRequest(BaseModel):
    image_base64: str  # data:image/jpeg;base64,...
    confidence_threshold: float = 0.30

class DetectionBox(BaseModel):
    damage_type: str
    confidence: float
    severity: float
    risk_score: float
    estimated_cost: float
    bbox: List[int]  # [x, y, w, h]

class FramePredictResponse(BaseModel):
    annotated_image_base64: str
    detections: List[DetectionBox]
    defect_detected: bool
    pothole_count: int
    total_cost: float
    primary_defect: str
    highest_risk_score: float
    fps_estimate: float = 30.0

@router.post("/frame", response_model=FramePredictResponse)
def predict_frame(payload: FramePredictRequest):
    """
    Indian Road AI Real-Time Frame Inspector.
    Discriminates between flat bituminous patches (safe/non-hazard, ₹0)
    and authentic 3D pothole cavities (fixed ₹2,700 per pothole).
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
                estimated_cost=FIXED_POTHOLE_COST,
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
            total_cost=result["total_cost"],
            primary_defect=result["primary_defect"],
            highest_risk_score=result["highest_risk_score"]
        )

    except Exception as e:
        logger.error(f"Error in predict_frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train")
def trigger_training(background_tasks: BackgroundTasks):
    """
    Triggers local model training in background.
    """
    background_tasks.add_task(train_model)
    return {
        "status": "Training started",
        "message": "Model training process initiated on local dataset.",
        "pothole_cost": FIXED_POTHOLE_COST
    }
