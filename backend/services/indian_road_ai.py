"""
Indian Road Condition AI Inspector & Pothole vs. Bituminous Patch Discriminator
Tuned specifically for Indian road characteristics (IRC:82-2015 & CPWD standards).

Differentiates:
1. Safe Bituminous Patch (Repaired asphalt: planar, smooth/rectilinear boundary, no crater depth shadow) -> Non-hazard (₹0)
2. Authentic Pothole (Structural cavity: jagged perimeter, abrupt shadow gradient/depth, broken aggregate) -> Hazard (₹2,700 flat)
3. Sound / Clean Road Surface -> 0 defects (₹0)
"""

import os
import cv2
import numpy as np
import logging
from typing import Dict, Any, List, Tuple
from services.cost_engine import FIXED_POTHOLE_COST, calculate_repair_cost
from services.risk_engine import calculate_risk_score

logger = logging.getLogger(__name__)

# Load YOLO model weights if available
WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "roadpulse_yolo.pt")
_yolo_model = None

try:
    from ultralytics import YOLO
    if os.path.exists(WEIGHTS_PATH):
        _yolo_model = YOLO(WEIGHTS_PATH)
        logger.info(f"[IndianRoadAI] Loaded model weights from {WEIGHTS_PATH}")
    else:
        _yolo_model = YOLO("yolo11n.pt")
        logger.info("[IndianRoadAI] Loaded base YOLO11 model")
except Exception as e:
    logger.warning(f"[IndianRoadAI] YOLO initialization note: {e}")


def analyze_patch_vs_pothole(roi_bgr: np.ndarray) -> Dict[str, Any]:
    """
    Discriminates between a flat bituminous asphalt patch and a true 3D pothole cavity.
    
    Metrics:
    - Perimeter Roughness (P^2 / 4*pi*A):
        * Patches: rolled/sawed edges have low roughness (< 1.85)
        * Potholes: fractured, jagged shear boundaries have high roughness (>= 1.95)
    - Depth Shadow Asymmetry (Sobel directional gradient):
        * Patches: flat surface receives uniform daylight, minimal internal shadow step
        * Potholes: vertical crater drop casts steep directional shadow on interior rim
    - Internal Texture Variance (Laplacian):
        * Patches: uniform compacted bitumen
        * Potholes: exposed aggregate, rubble, crater depth transitions
    """
    if roi_bgr is None or roi_bgr.size == 0 or roi_bgr.shape[0] < 12 or roi_bgr.shape[1] < 12:
        return {"is_pothole": False, "confidence": 0.0, "reason": "ROI too small"}

    h, w, _ = roi_bgr.shape
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    # 1. Edge & Contour Roughness Analysis
    # Potholes have sharp dark depression compared to road
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

    roughness = 1.0
    aspect_ratio = 1.0
    fill_ratio = 1.0

    if contours:
        largest_cnt = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_cnt)
        perimeter = cv2.arcLength(largest_cnt, True)
        if area > 50 and perimeter > 0:
            # Isoperimetric roughness: P^2 / (4 * pi * A) (Circle = 1.0; smooth patch ~ 1.2-1.7; fractured pothole > 2.0)
            roughness = (perimeter * perimeter) / (4 * np.pi * area)
            bx, by, bw, bh = cv2.boundingRect(largest_cnt)
            aspect_ratio = float(bw) / max(1, bh)
            fill_ratio = area / float(bw * bh)

    # 2. Depth Shadow & Directional Luminance Gradient
    # Real potholes show asymmetric shadow from cavity rim
    sobel_y = cv2.Sobel(blur, cv2.CV_64F, 0, 1, ksize=3)
    sobel_x = cv2.Sobel(blur, cv2.CV_64F, 1, 0, ksize=3)
    grad_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    mean_gradient = float(np.mean(grad_mag))
    max_gradient = float(np.percentile(grad_mag, 95))

    # Shadow disparity (difference between brightest 15% and darkest 15% inside ROI)
    sorted_pixels = np.sort(gray.flatten())
    p15 = float(np.mean(sorted_pixels[:int(len(sorted_pixels) * 0.15) + 1]))
    p85 = float(np.mean(sorted_pixels[int(len(sorted_pixels) * 0.85):]))
    shadow_depth_contrast = p85 - p15

    # 3. Internal Texture Variance (Laplacian)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 4. Decision Logic:
    # A safe asphalt patch is planar: smooth edges (low roughness), low shadow depth contrast, low gradient spike
    # A true pothole has:
    #   - High roughness (fractured edge > 1.85) OR
    #   - Steep shadow depth contrast (> 42) indicating an actual depression cavity OR
    #   - High internal texture variance from loose aggregate / crater bottom (> 140)
    
    is_rough = roughness >= 1.85
    has_cavity_shadow = shadow_depth_contrast >= 40.0 and mean_gradient >= 14.0
    has_cavity_texture = laplacian_var >= 135.0

    pothole_score = 0.0
    if is_rough:
        pothole_score += 0.35
    if has_cavity_shadow:
        pothole_score += 0.40
    if has_cavity_texture:
        pothole_score += 0.25

    # If it's very flat and smooth, it's definitely a safe patch
    is_smooth_patch = (roughness < 1.70) and (shadow_depth_contrast < 38.0)

    if is_smooth_patch:
        return {
            "is_pothole": False,
            "is_patch": True,
            "label": "Safe Bituminous Patch",
            "confidence": round(0.85 + (1.70 - roughness) * 0.1, 2),
            "roughness": round(roughness, 2),
            "shadow_contrast": round(shadow_depth_contrast, 1),
            "laplacian_var": round(laplacian_var, 1),
            "cost": 0.0,
            "reason": "Flush planar bituminous patch without cavity depth"
        }

    is_genuine_pothole = (pothole_score >= 0.50) or (has_cavity_shadow and is_rough)

    if is_genuine_pothole:
        confidence = min(0.98, max(0.75, 0.70 + (pothole_score * 0.28)))
        return {
            "is_pothole": True,
            "is_patch": False,
            "label": "Pothole",
            "confidence": round(confidence, 2),
            "roughness": round(roughness, 2),
            "shadow_contrast": round(shadow_depth_contrast, 1),
            "laplacian_var": round(laplacian_var, 1),
            "cost": FIXED_POTHOLE_COST,
            "reason": "Structural road cavity with fractured perimeter and depth shadow"
        }
    else:
        # Ambiguous dark area / surface discoloration / mild patch
        return {
            "is_pothole": False,
            "is_patch": True,
            "label": "Safe Bituminous Patch",
            "confidence": 0.82,
            "roughness": round(roughness, 2),
            "shadow_contrast": round(shadow_depth_contrast, 1),
            "laplacian_var": round(laplacian_var, 1),
            "cost": 0.0,
            "reason": "Non-hazard surface texture"
        }


def inspect_road_frame(frame_bgr: np.ndarray, conf_threshold: float = 0.30) -> Dict[str, Any]:
    """
    Full AI road inspection for a single frame.
    Returns:
    - detections: list of confirmed hazards (e.g. true potholes)
    - safe_patches: list of detected safe patches (non-hazards)
    - pothole_count: number of true potholes
    - total_cost: ₹2,700 * pothole_count
    - defect_detected: True if at least 1 genuine defect exists
    - highest_risk_score: 0 if clean road
    - annotated_frame: frame with colored bounding boxes
    """
    if frame_bgr is None or frame_bgr.size == 0:
        return {
            "detections": [],
            "safe_patches": [],
            "pothole_count": 0,
            "total_cost": 0.0,
            "defect_detected": False,
            "highest_risk_score": 0.0,
            "primary_defect": "No Road Defects Detected",
            "annotated_frame": frame_bgr
        }

    h, w, _ = frame_bgr.shape
    annotated = frame_bgr.copy()
    candidate_boxes = []

    # 1. Try YOLO inference if available
    if _yolo_model is not None:
        try:
            results = _yolo_model.predict(frame_bgr, conf=conf_threshold, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    xywh = box.xywh[0].tolist()
                    cls_name = _yolo_model.names.get(cls_id, "Pothole")

                    # Skip irrelevant objects (vehicles, humans, etc.)
                    if cls_name.lower() in ["person", "car", "truck", "bus", "motorcycle", "bicycle"]:
                        continue

                    bx = max(0, int(xywh[0] - xywh[2] / 2))
                    by = max(0, int(xywh[1] - xywh[3] / 2))
                    bw = min(w - bx, int(xywh[2]))
                    bh = min(h - by, int(xywh[3]))

                    if bw > 20 and bh > 15:
                        candidate_boxes.append((bx, by, bw, bh, cls_name, conf))
        except Exception as e:
            logger.debug(f"[IndianRoadAI] YOLO pass note: {e}")

    # 2. Fallback / complementary CV candidate extraction (focus on lower 75% road surface)
    if len(candidate_boxes) == 0:
        road_roi_y = int(h * 0.25)
        road_gray = cv2.cvtColor(frame_bgr[road_roi_y:, :], cv2.COLOR_BGR2GRAY)
        road_blur = cv2.GaussianBlur(road_gray, (7, 7), 0)

        # Adaptive thresholding to identify localized pavement anomalies
        adaptive_thresh = cv2.adaptiveThreshold(
            road_blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 7
        )
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        morph = cv2.morphologyEx(adaptive_thresh, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            # Defect candidates must have significant area on road surface (> 1800 px)
            if area > 2000 and area < (w * h * 0.4):
                bx, by_rel, bw, bh = cv2.boundingRect(cnt)
                by = by_rel + road_roi_y
                candidate_boxes.append((bx, by, bw, bh, "Candidate", 0.80))

    # 3. Discriminator Step: Filter patches vs potholes
    hazard_detections = []
    safe_patches = []
    highest_risk = 0.0

    for bx, by, bw, bh, raw_cls, raw_conf in candidate_boxes:
        roi = frame_bgr[by:by+bh, bx:bx+bw]
        analysis = analyze_patch_vs_pothole(roi)

        if analysis["is_pothole"]:
            # CONFIRMED TRUE POTHOLE
            conf = max(raw_conf, analysis["confidence"])
            severity = round(min(1.0, 0.65 + (analysis["shadow_contrast"] / 100.0) * 0.3), 2)
            r_score = calculate_risk_score(severity, 0.85, 0.75, conf)
            highest_risk = max(highest_risk, r_score)

            hazard_detections.append({
                "damage_type": "Pothole",
                "confidence": conf,
                "severity": severity,
                "risk_score": r_score,
                "estimated_cost": FIXED_POTHOLE_COST,
                "bbox": [bx, by, bw, bh],
                "details": f"Roughness: {analysis['roughness']}, Depth Contrast: {analysis['shadow_contrast']}"
            })

            # Draw RED bounding box for genuine pothole
            color = (0, 0, 255) # Red
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), color, 3)
            label = f"POTHOLE (Risk:{int(r_score)} | Rs 2,700)"
            cv2.rectangle(annotated, (bx, max(0, by - 26)), (bx + len(label) * 9 + 10, by), color, -1)
            cv2.putText(annotated, label, (bx + 5, max(18, by - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)

        elif analysis.get("is_patch"):
            # SAFE BITUMINOUS PATCH (REPAIRED ROAD)
            safe_patches.append({
                "type": "Safe Bituminous Patch",
                "confidence": analysis["confidence"],
                "bbox": [bx, by, bw, bh],
                "estimated_cost": 0.0
            })

            # Draw CYAN / GREEN box for verified safe repair patch
            color = (255, 200, 0) # Cyan/Amber
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), color, 2)
            label = f"SAFE REPAIRED PATCH (Rs 0)"
            cv2.rectangle(annotated, (bx, max(0, by - 22)), (bx + len(label) * 8 + 10, by), (40, 40, 40), -1)
            cv2.putText(annotated, label, (bx + 5, max(15, by - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1, cv2.LINE_AA)

    # 4. Synthesize Final Assessment
    pothole_count = len(hazard_detections)
    total_cost = float(pothole_count * FIXED_POTHOLE_COST)
    has_defects = pothole_count > 0

    if has_defects:
        primary_defect = f"{pothole_count} Pothole{'s' if pothole_count > 1 else ''} Detected"
    elif len(safe_patches) > 0:
        primary_defect = "Safe Repaired Road Surface (Patches Verified - No Hazards)"
    else:
        primary_defect = "No Road Defects Detected (Road in Good Condition)"

    return {
        "detections": hazard_detections,
        "safe_patches": safe_patches,
        "pothole_count": pothole_count,
        "total_cost": total_cost,
        "defect_detected": has_defects,
        "highest_risk_score": highest_risk,
        "primary_defect": primary_defect,
        "annotated_frame": annotated
    }
