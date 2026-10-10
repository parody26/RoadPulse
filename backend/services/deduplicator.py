import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two points in meters.
    """
    R = 6371000.0 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return R * c

def interpolate_gps_coordinate(start_gps: tuple, end_gps: tuple, progress: float) -> tuple:
    """
    Linearly interpolates GPS coordinates given progress fraction [0.0, 1.0].
    """
    lat = start_gps[0] + (end_gps[0] - start_gps[0]) * progress
    lon = start_gps[1] + (end_gps[1] - start_gps[1]) * progress
    return (round(lat, 6), round(lon, 6))

def merge_duplicate_detections(raw_detections: list, distance_threshold_meters: float = 8.0) -> list:
    """
    Groups frame detections of the same defect within distance_threshold_meters.
    Consolidates multiple video frame detections into single unique incident records.
    """
    clusters = []

    for det in raw_detections:
        lat = det['latitude']
        lon = det['longitude']
        cls_name = det['damage_type']

        matched_cluster = None
        for cluster in clusters:
            if cluster['damage_type'] == cls_name:
                dist = haversine_distance(lat, lon, cluster['latitude'], cluster['longitude'])
                if dist <= distance_threshold_meters:
                    matched_cluster = cluster
                    break

        if matched_cluster:
            # Merge into cluster
            matched_cluster['detections'].append(det)
            # Recalculate centroid
            lats = [d['latitude'] for d in matched_cluster['detections']]
            lons = [d['longitude'] for d in matched_cluster['detections']]
            matched_cluster['latitude'] = sum(lats) / len(lats)
            matched_cluster['longitude'] = sum(lons) / len(lons)
            # Max severity and confidence
            matched_cluster['severity'] = max(matched_cluster['severity'], det['severity'])
            matched_cluster['confidence'] = max(matched_cluster['confidence'], det['confidence'])
        else:
            clusters.append({
                'damage_type': cls_name,
                'latitude': lat,
                'longitude': lon,
                'severity': det['severity'],
                'confidence': det['confidence'],
                'road_importance': det.get('road_importance', 0.75),
                'exposure_factor': det.get('exposure_factor', 0.65),
                'location_name': det.get('location_name', 'MG Road, Sector 4'),
                'detections': [det]
            })

    return clusters
