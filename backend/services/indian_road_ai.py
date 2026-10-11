"""
Indian Road Condition AI Inspector & Pothole vs. Bituminous Patch Discriminator
Tuned specifically for Indian road characteristics (IRC:82-2015 & CPWD standards).

Differentiates:
1. Authentic Pothole (Structural cavity: jagged perimeter, depth shadow, broken aggregate, water-filled puddle) -> Hazard
2. Safe Bituminous Patch (Repaired asphalt: planar, smooth/rectilinear boundary, flush surface) -> Non-hazard
3. Sound / Clean Road Surface -> 0 defects
"""

import os
import cv2
import numpy as np
import logging
from typing import Dict, Any, List, Tuple
try:
    from services.risk_engine import calculate_risk_score
except ImportError:
    from backend.services.risk_engine import calculate_risk_score

logger = logging.getLogger(__name__)

# YOLO model weights path
WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "roadpulse_yolo.pt")
_cached_yolo_model = None
_cached_weights_mtime = 0

def get_yolo_model():
    """
    Dynamically loads or reloads the trained YOLO model when weights are updated.
    """
    global _cached_yolo_model, _cached_weights_mtime
    try:
        from ultralytics import YOLO
        if os.path.exists(WEIGHTS_PATH):
            mtime = os.path.getmtime(WEIGHTS_PATH)
            if _cached_yolo_model is None or mtime > _cached_weights_mtime:
                _cached_yolo_model = YOLO(WEIGHTS_PATH)
                _cached_weights_mtime = mtime
                logger.info(f"[IndianRoadAI] Loaded trained model weights from {WEIGHTS_PATH}")
            return _cached_yolo_model
        elif _cached_yolo_model is None:
            _cached_yolo_model = YOLO("yolo11n.pt")
            logger.info("[IndianRoadAI] Loaded base YOLO11 model")
            return _cached_yolo_model
    except Exception as e:
        logger.warning(f"[IndianRoadAI] YOLO initialization note: {e}")
    return _cached_yolo_model


def analyze_patch_vs_pothole(roi_bgr: np.ndarray) -> Dict[str, Any]:
    """
    Discriminates between a flat bituminous asphalt patch and a true 3D pothole cavity.
    Tuned for Indian street characteristics (asphalt wear, daylight exposure, mobile camera resolution).

    Metrics:
    - Perimeter Roughness (P^2 / 4*pi*A):
        * Patches: rolled/sawed edges have low roughness (< 1.45)
        * Potholes: fractured, jagged shear boundaries have high roughness (>= 1.35)
    - Depth Shadow & Contrast (difference between 85th and 15th percentile intensity):
        * Patches: planar surface receives uniform daylight, contrast < 16.0
        * Potholes: vertical crater drop casts directional shadow, contrast >= 16.0
    - Multi-scale Black-Hat depression response:
        * Patches: flush with road plane, near zero Black-Hat response
        * Potholes: sunken void produces strong morphological response
    """
    if roi_bgr is None or roi_bgr.size == 0 or roi_bgr.shape[0] < 10 or roi_bgr.shape[1] < 10:
        return {"is_pothole": False, "confidence": 0.0, "reason": "ROI too small"}

    h, w, _ = roi_bgr.shape
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    # 1. Edge & Contour Analysis
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

    roughness = 1.2
    aspect_ratio = 1.0

    if contours:
        largest_cnt = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_cnt)
        perimeter = cv2.arcLength(largest_cnt, True)
        if area > 30 and perimeter > 0:
            # Isoperimetric roughness: P^2 / (4 * pi * A) (Perfect circle = 1.0; jagged pothole >= 1.3)
            roughness = (perimeter * perimeter) / (4 * np.pi * area)
            bx, by, bw, bh = cv2.boundingRect(largest_cnt)
            aspect_ratio = float(bw) / max(1, bh)

    # 2. Depth Shadow & Cavity Contrast
    sorted_pixels = np.sort(gray.flatten())
    p15 = float(np.mean(sorted_pixels[:max(1, int(len(sorted_pixels) * 0.15))]))
    p85 = float(np.mean(sorted_pixels[int(len(sorted_pixels) * 0.85):]))
    shadow_depth_contrast = p85 - p15

    # Gradient step across rim
    sobel_x = cv2.Sobel(blur, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(blur, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    mean_gradient = float(np.mean(grad_mag))

    # 3. Morphological Black-Hat cavity response (detects sunken depressions)
    k_size = max(5, min(25, (min(h, w) // 2) * 2 + 1))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    blackhat_score = float(np.mean(blackhat))

    # 4. Internal Texture Variance (Laplacian)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 5. Discrimination Criteria:
    # A true pothole has:
    #   - Depth shadow/contrast (>= 16.0) OR
    #   - Black-Hat depression score (>= 8.0) OR
    #   - Jagged fractured perimeter (roughness >= 1.35)
    # A safe patch is:
    #   - Flat / uniform (contrast < 15.0 and blackhat_score < 6.0 and roughness < 1.45)

    has_depth = (shadow_depth_contrast >= 16.0) or (blackhat_score >= 8.0)
    has_rim_features = (roughness >= 1.30) or (mean_gradient >= 10.0)
    has_cavity_texture = (laplacian_var >= 25.0)

    pothole_score = 0.0
    if has_depth:
        pothole_score += 0.45
    if has_rim_features:
        pothole_score += 0.35
    if has_cavity_texture:
        pothole_score += 0.20

    is_smooth_patch = (not has_depth) and (roughness < 1.45) and (blackhat_score < 7.0)

    if is_smooth_patch:
        return {
            "is_pothole": False,
            "is_patch": True,
            "label": "Safe Bituminous Patch",
            "confidence": round(0.85 + max(0.0, (1.45 - roughness) * 0.1), 2),
            "roughness": round(roughness, 2),
            "shadow_contrast": round(shadow_depth_contrast, 1),
            "blackhat_score": round(blackhat_score, 1),
            "laplacian_var": round(laplacian_var, 1),
            "reason": "Flush planar bituminous patch without cavity depth"
        }

    is_genuine_pothole = (pothole_score >= 0.40) or (has_depth and has_rim_features)

    if is_genuine_pothole:
        confidence = min(0.98, max(0.78, 0.72 + (pothole_score * 0.26)))
        return {
            "is_pothole": True,
            "is_patch": False,
            "label": "Pothole",
            "confidence": round(confidence, 2),
            "roughness": round(roughness, 2),
            "shadow_contrast": round(shadow_depth_contrast, 1),
            "blackhat_score": round(blackhat_score, 1),
            "laplacian_var": round(laplacian_var, 1),
            "reason": "Structural road cavity with fractured perimeter and depth shadow"
        }
    else:
        # Mild surface mark / discoloration
        return {
            "is_pothole": False,
            "is_patch": True,
            "label": "Safe Bituminous Patch",
            "confidence": 0.82,
            "roughness": round(roughness, 2),
            "shadow_contrast": round(shadow_depth_contrast, 1),
            "blackhat_score": round(blackhat_score, 1),
            "laplacian_var": round(laplacian_var, 1),
            "reason": "Non-hazard surface texture"
        }


def extract_road_pothole_candidates(frame_bgr: np.ndarray) -> List[Tuple[int, int, int, int, str, float]]:
    """
    Multi-cue Computer Vision candidate extractor for Indian street surfaces.
    Uses multi-scale Black-Hat morphology to isolate dark road depressions,
    cavities, puddles, and irregular potholes of all sizes (small to large).
    """
    h, w, _ = frame_bgr.shape
    candidates = []

    # Road perspective prior: Focus on lower 75% of the frame
    road_roi_y = int(h * 0.25)
    road_sub = frame_bgr[road_roi_y:, :]
    rh, rw, _ = road_sub.shape

    gray = cv2.cvtColor(road_sub, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    # 1. Multi-scale Black-Hat filters (extracts small 15px, medium 31px, and large 51px cavities)
    bh_responses = []
    for k_sz in [15, 31, 51]:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_sz, k_sz))
        bh = cv2.morphologyEx(blur, cv2.MORPH_BLACKHAT, k)
        bh_responses.append(bh)

    combined_bh = np.maximum.reduce(bh_responses)

    # 2. Threshold Black-Hat response for depression cavities
    # Normalized Black-Hat isolates dark dips against asphalt
    _, bh_thresh = cv2.threshold(combined_bh, 18, 255, cv2.THRESH_BINARY)

    # 3. Complementary Adaptive Dark Threshold (captures deep potholes & water puddles)
    adapt_thresh = cv2.adaptiveThreshold(
        blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 41, 10
    )

    # Combine both cues
    combined_mask = cv2.bitwise_or(bh_thresh, adapt_thresh)

    # Morphological clean up to connect fractured cavity edges
    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    cleaned_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, close_kernel)

    contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Accept potholes starting from 250 px (basic/small pothole) up to 35% of road area
        if 250 <= area <= (rw * rh * 0.35):
            bx, by_rel, bw, bh = cv2.boundingRect(cnt)
            aspect_ratio = float(bw) / max(1, bh)

            # Avoid thin wire-like lines or lane marks
            if 0.30 <= aspect_ratio <= 3.5 and bw >= 16 and bh >= 14:
                by = by_rel + road_roi_y
                candidates.append((bx, by, bw, bh, "Pothole Candidate", 0.85))

    return candidates


def inspect_road_frame(frame_bgr: np.ndarray, conf_threshold: float = 0.25) -> Dict[str, Any]:
    """
    Full AI road inspection for a single frame.
    Integrates trained YOLO model + multi-scale Black-Hat CV discrimination.

    Returns:
    - detections: list of confirmed hazards (true potholes)
    - safe_patches: list of detected safe patches (non-hazards)
    - pothole_count: number of true potholes
    - defect_detected: True if at least 1 genuine pothole exists
    - highest_risk_score: 0 if clean road
    - annotated_frame: frame with colored bounding boxes
    """
    if frame_bgr is None or frame_bgr.size == 0:
        return {
            "detections": [],
            "safe_patches": [],
            "pothole_count": 0,
            "defect_detected": False,
            "highest_risk_score": 0.0,
            "primary_defect": "No Road Defects Detected",
            "annotated_frame": frame_bgr
        }

    h, w, _ = frame_bgr.shape
    annotated = frame_bgr.copy()
    candidate_boxes = []

    # 1. Try YOLO model inference (custom trained or base)
    yolo_model = get_yolo_model()
    yolo_found = False

    if yolo_model is not None:
        try:
            results = yolo_model.predict(frame_bgr, conf=conf_threshold, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    xywh = box.xywh[0].tolist()
                    cls_name = yolo_model.names.get(cls_id, "Pothole")

                    # Skip non-road objects (vehicles, humans, etc.)
                    if cls_name.lower() in ["person", "car", "truck", "bus", "motorcycle", "bicycle"]:
                        continue

                    bx = max(0, int(xywh[0] - xywh[2] / 2))
                    by = max(0, int(xywh[1] - xywh[3] / 2))
                    bw = min(w - bx, int(xywh[2]))
                    bh = min(h - by, int(xywh[3]))

                    if bw > 16 and bh > 14:
                        candidate_boxes.append((bx, by, bw, bh, "Pothole", conf))
                        yolo_found = True
        except Exception as e:
            logger.debug(f"[IndianRoadAI] YOLO pass note: {e}")

    # 2. Multi-cue CV candidate extraction if YOLO returned 0 boxes or to augment coverage
    if not yolo_found or len(candidate_boxes) == 0:
        cv_candidates = extract_road_pothole_candidates(frame_bgr)
        candidate_boxes.extend(cv_candidates)

    # 3. Non-Maximum Suppression (NMS) to deduplicate overlapping candidate boxes
    if len(candidate_boxes) > 1:
        boxes_for_nms = [[bx, by, bw, bh] for bx, by, bw, bh, _, _ in candidate_boxes]
        scores_for_nms = [conf for _, _, _, _, _, conf in candidate_boxes]
        indices = cv2.dnn.NMSBoxes(boxes_for_nms, scores_for_nms, score_threshold=0.20, nms_threshold=0.40)
        if len(indices) > 0:
            filtered_indices = indices.flatten() if hasattr(indices, 'flatten') else indices
            candidate_boxes = [candidate_boxes[i] for i in filtered_indices]

    # 4. Discriminator Step: Validate true potholes vs safe flat patches
    hazard_detections = []
    safe_patches = []
    highest_risk = 0.0

    for bx, by, bw, bh, raw_cls, raw_conf in candidate_boxes:
        roi = frame_bgr[by:by+bh, bx:bx+bw]
        analysis = analyze_patch_vs_pothole(roi)

        # If YOLO strongly detected a pothole (conf >= 0.40), treat as confirmed pothole
        if raw_cls == "Pothole" and raw_conf >= 0.40:
            is_pothole = True
        else:
            is_pothole = analysis["is_pothole"]

        if is_pothole:
            # CONFIRMED TRUE POTHOLE
            conf = max(raw_conf, analysis.get("confidence", 0.85))
            severity = round(min(1.0, 0.70 + (analysis.get("shadow_contrast", 20.0) / 100.0) * 0.25), 2)
            r_score = calculate_risk_score(severity, 0.85, 0.75, conf)
            highest_risk = max(highest_risk, r_score)

            hazard_detections.append({
                "damage_type": "Pothole",
                "confidence": conf,
                "severity": severity,
                "risk_score": r_score,
                "bbox": [bx, by, bw, bh],
                "details": f"Fractured rim cavity (Roughness: {analysis.get('roughness', 1.4)}, Depth: {analysis.get('shadow_contrast', 22)})"
            })

            # Draw RED bounding box for genuine pothole
            color = (0, 0, 255) # Red
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), color, 3)
            label = f"POTHOLE (Risk: {int(r_score)})"
            label_w = max(130, len(label) * 9 + 10)
            cv2.rectangle(annotated, (bx, max(0, by - 26)), (bx + label_w, by), color, -1)
            cv2.putText(annotated, label, (bx + 5, max(18, by - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)

        elif analysis.get("is_patch"):
            # SAFE BITUMINOUS PATCH (REPAIRED ROAD)
            safe_patches.append({
                "type": "Safe Bituminous Patch",
                "confidence": analysis["confidence"],
                "bbox": [bx, by, bw, bh]
            })

            # Draw CYAN / GREEN box for verified safe repair patch
            color = (255, 200, 0) # Cyan/Amber
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), color, 2)
            label = "SAFE REPAIRED PATCH"
            label_w = max(150, len(label) * 8 + 10)
            cv2.rectangle(annotated, (bx, max(0, by - 22)), (bx + label_w, by), (40, 40, 40), -1)
            cv2.putText(annotated, label, (bx + 5, max(15, by - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1, cv2.LINE_AA)

    # 5. Synthesize Final Assessment
    pothole_count = len(hazard_detections)
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
        "defect_detected": has_defects,
        "highest_risk_score": highest_risk,
        "primary_defect": primary_defect,
        "annotated_frame": annotated
    }
