export const INITIAL_INCIDENTS = [
  {
    id: "inc_001",
    latitude: 12.9716,
    longitude: 77.5946,
    damage_type: "Pothole",
    severity: 0.92,
    confidence: 0.94,
    road_importance: 0.85,
    exposure_factor: 0.80,
    risk_score: 88.1,
    status: "reported",
    estimated_cost: 3500.0,
    location_name: "MG Road near Metro Pillar 142",
    created_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_001",
        incident_id: "inc_001",
        frame_timestamp: 3.5,
        image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
        bbox_json: '{"x": 140, "y": 120, "w": 200, "h": 150, "class": "Pothole", "confidence": 0.94}'
      }
    ],
    repairs: [
      {
        id: "rep_001",
        incident_id: "inc_001",
        assigned_team: "Municipal Maintenance Unit #3",
        repair_status: "pending"
      }
    ]
  },
  {
    id: "inc_002",
    latitude: 12.9738,
    longitude: 77.5968,
    damage_type: "Alligator Crack",
    severity: 0.81,
    confidence: 0.88,
    road_importance: 0.80,
    exposure_factor: 0.75,
    risk_score: 80.2,
    status: "reviewed",
    estimated_cost: 2800.0,
    location_name: "MG Road & Residency Rd Junction",
    created_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_002",
        incident_id: "inc_002",
        frame_timestamp: 4.2,
        image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60",
        bbox_json: '{"x": 120, "y": 150, "w": 210, "h": 130, "class": "Alligator Crack", "confidence": 0.88}'
      }
    ],
    repairs: [
      {
        id: "rep_002",
        incident_id: "inc_002",
        assigned_team: "Municipal Maintenance Unit #3",
        repair_status: "pending"
      }
    ]
  },
  {
    id: "inc_003",
    latitude: 12.9762,
    longitude: 77.5991,
    damage_type: "Pothole",
    severity: 0.65,
    confidence: 0.89,
    road_importance: 0.70,
    exposure_factor: 0.60,
    risk_score: 67.7,
    status: "in_progress",
    estimated_cost: 2200.0,
    location_name: "MG Road Signal North",
    created_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_003",
        incident_id: "inc_003",
        frame_timestamp: 2.1,
        image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
        bbox_json: '{"x": 100, "y": 110, "w": 180, "h": 140, "class": "Pothole", "confidence": 0.89}'
      }
    ],
    repairs: [
      {
        id: "rep_003",
        incident_id: "inc_003",
        assigned_team: "Municipal Maintenance Unit #3",
        repair_status: "in_progress"
      }
    ]
  },
  {
    id: "inc_004",
    latitude: 12.9791,
    longitude: 77.6023,
    damage_type: "Longitudinal Crack",
    severity: 0.48,
    confidence: 0.82,
    road_importance: 0.65,
    exposure_factor: 0.50,
    risk_score: 56.1,
    status: "reported",
    estimated_cost: 1500.0,
    location_name: "Brigade Road Turning Corridor",
    created_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_004",
        incident_id: "inc_004",
        frame_timestamp: 6.8,
        image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60",
        bbox_json: '{"x": 90, "y": 80, "w": 250, "h": 110, "class": "Longitudinal Crack", "confidence": 0.82}'
      }
    ],
    repairs: [
      {
        id: "rep_004",
        incident_id: "inc_004",
        assigned_team: "Municipal Maintenance Unit #4",
        repair_status: "pending"
      }
    ]
  },
  {
    id: "inc_005",
    latitude: 12.9825,
    longitude: 77.6055,
    damage_type: "Transverse Crack",
    severity: 0.42,
    confidence: 0.85,
    road_importance: 0.60,
    exposure_factor: 0.45,
    risk_score: 51.4,
    status: "verified",
    estimated_cost: 1200.0,
    location_name: "Cubbon Park Entrance Road",
    created_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_005",
        incident_id: "inc_005",
        frame_timestamp: 8.4,
        image_url: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=60",
        bbox_json: '{"x": 130, "y": 140, "w": 190, "h": 90, "class": "Transverse Crack", "confidence": 0.85}'
      }
    ],
    repairs: [
      {
        id: "rep_005",
        incident_id: "inc_005",
        assigned_team: "Municipal Maintenance Unit #3",
        repair_status: "verified",
        verified_by: "Eng. Rajesh Kumar",
        verified_at: new Date().toISOString(),
        notes: "Physical inspection confirmed repair completion."
      }
    ]
  },
  {
    id: "inc_006",
    latitude: 12.9856,
    longitude: 77.6087,
    damage_type: "Pothole",
    severity: 0.88,
    confidence: 0.95,
    road_importance: 0.90,
    exposure_factor: 0.85,
    risk_score: 88.6,
    status: "reported",
    estimated_cost: 4000.0,
    location_name: "Trinity Circle Flyover Ramp",
    created_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_006",
        incident_id: "inc_006",
        frame_timestamp: 1.8,
        image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
        bbox_json: '{"x": 160, "y": 130, "w": 220, "h": 160, "class": "Pothole", "confidence": 0.95}'
      }
    ],
    repairs: [
      {
        id: "rep_006",
        incident_id: "inc_006",
        assigned_team: "Municipal Maintenance Unit #4",
        repair_status: "pending"
      }
    ]
  },
  {
    id: "inc_007",
    latitude: 12.9750,
    longitude: 77.6070,
    damage_type: "Alligator Crack",
    severity: 0.74,
    confidence: 0.86,
    road_importance: 0.75,
    exposure_factor: 0.70,
    risk_score: 74.6,
    status: "reviewed",
    estimated_cost: 2600.0,
    location_name: "Halasuru Road Cross",
    created_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_007",
        incident_id: "inc_007",
        frame_timestamp: 5.0,
        image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60",
        bbox_json: '{"x": 110, "y": 140, "w": 200, "h": 130, "class": "Alligator Crack", "confidence": 0.86}'
      }
    ],
    repairs: [
      {
        id: "rep_007",
        incident_id: "inc_007",
        assigned_team: "Municipal Maintenance Unit #3",
        repair_status: "pending"
      }
    ]
  },
  {
    id: "inc_008",
    latitude: 12.9690,
    longitude: 77.5920,
    damage_type: "Pothole",
    severity: 0.90,
    confidence: 0.93,
    road_importance: 0.88,
    exposure_factor: 0.82,
    risk_score: 87.2,
    status: "reported",
    estimated_cost: 3800.0,
    location_name: "Richmond Road Underpass",
    created_at: new Date().toISOString(),
    evidence: [
      {
        id: "ev_008",
        incident_id: "inc_008",
        frame_timestamp: 3.1,
        image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
        bbox_json: '{"x": 150, "y": 140, "w": 210, "h": 150, "class": "Pothole", "confidence": 0.93}'
      }
    ],
    repairs: [
      {
        id: "rep_008",
        incident_id: "inc_008",
        assigned_team: "Municipal Maintenance Unit #4",
        repair_status: "pending"
      }
    ]
  }
];
