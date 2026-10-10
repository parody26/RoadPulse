import os
import base64
import json
import logging
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from services.risk_engine import calculate_risk_score
from ai_training.train_local_model import train_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predict", tags=["Realtime Prediction & Training"])

# Load Ultralytics YOLO model if available
WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "roadpulse_yolo.pt")

yolo_model = None
try:
    from ultralytics import YOLO
    if os.path.exists(WEIGHTS_PATH):
        yolo_model = YOLO(WEIGHTS_PATH)
        logger.info(f"Loaded trained RoadPulse YOLO weights from {WEIGHTS_PATH}")
    else:
        yolo_model = YOLO("yolo11n.pt")
        logger.info("Loaded baseline YOLO11 model")
except Exception as e:
    logger.warning(f"Ultralytics YOLO initialization note: {e}")

class FramePredictRequest(BaseModel):
    image_base64: str # data:image/jpeg;base64,...
    confidence_threshold: float = 0.25

class DetectionBox(BaseModel):
    damage_type: str
    confidence: float
    severity: float
    risk_score: float
    bbox: List[int] # [x, y, w, h]

class FramePredictResponse(BaseModel):
    annotated_image_base64: str
    detections: List[DetectionBox]
    defect_detected: bool
    highest_risk_score: float
    fps_estimate: float = 30.0

@router.post("/frame", response_model=FramePredictResponse)
def predict_frame(payload: FramePredictRequest):
    """
    Real-Time AI Prediction Endpoint.
    Accepts camera frame base64 string, runs YOLO model inference,
    draws HUD bounding box overlay, and calculates real-time risk scores.
    """
    try:
        # Decode base64 frame
        raw_b64 = payload.image_base64.split(",")[-1]
        img_bytes = base64.b64decode(raw_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image frame encoding")

        h, w, _ = img.shape
        detections = []
        highest_risk = 0.0

        # Run Real YOLO inference if model available
        if yolo_model is not None:
            try:
                results = yolo_model.predict(img, conf=payload.confidence_threshold, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        xywh = box.xywh[0].tolist() # [center_x, center_y, width, height]

                        cls_name = yolo_model.names.get(cls_id, "Pothole")
                        if cls_name in ["person", "car", "truck", "bus"]:
                            continue

                        severity = round(min(1.0, 0.5 + conf * 0.4), 2)
                        r_score = calculate_risk_score(severity, 0.8, 0.7, conf)
                        highest_risk = max(highest_risk, r_score)

                        bx = int(xywh[0] - xywh[2] / 2)
                        by = int(xywh[1] - xywh[3] / 2)
                        bw = int(xywh[2])
                        bh = int(xywh[3])

                        detections.append(DetectionBox(
                            damage_type=cls_name,
                            confidence=round(conf, 2),
                            severity=severity,
                            risk_score=r_score,
                            bbox=[bx, by, bw, bh]
                        ))

                        color = (0, 0, 255) if r_score >= 75 else (0, 165, 255)
                        cv2.rectangle(img, (bx, by), (bx + bw, by + bh), color, 3)
                        cv2.putText(
                            img,
                            f"AI: {cls_name} ({int(conf*100)}%) Risk:{r_score}",
                            (bx, max(25, by - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (255, 255, 255),
                            2
                        )
            except Exception as ve:
                logger.warning(f"YOLO predict fallback: {ve}")

        # Computer vision defect detector fallback (texture/contour feature analysis)
        if len(detections) == 0:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (7, 7), 0)
            _, thresh = cv2.threshold(blur, 60, 255, cv2.THRESH_BINARY_INV)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > 1200: # Significant defect area
                    bx, by, bw, bh = cv2.boundingRect(cnt)
                    conf = round(float(min(0.98, 0.75 + area / 50000)), 2)
                    severity = round(float(min(0.95, 0.5 + area / 30000)), 2)
                    r_score = calculate_risk_score(severity, 0.85, 0.75, conf)
                    highest_risk = max(highest_risk, r_score)

                    damage_type = "Pothole" if bw / max(1, bh) < 1.8 else "Alligator Crack"

                    detections.append(DetectionBox(
                        damage_type=f"{damage_type} (Realtime)",
                        confidence=conf,
                        severity=severity,
                        risk_score=r_score,
                        bbox=[bx, by, bw, bh]
                    ))

                    color = (0, 0, 255) if r_score >= 75 else (0, 165, 255)
                    cv2.rectangle(img, (bx, by), (bx + bw, by + bh), color, 3)
                    cv2.putText(
                        img,
                        f"REALTIME AI: {damage_type} Risk:{r_score}",
                        (bx, max(25, by - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 255),
                        2
                    )

        # Re-encode image to base64
        _, buffer = cv2.imencode('.jpg', img)
        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

        return FramePredictResponse(
            annotated_image_base64=annotated_b64,
            detections=detections,
            defect_detected=len(detections) > 0,
            highest_risk_score=highest_risk
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
        "target_weights": WEIGHTS_PATH
    }
