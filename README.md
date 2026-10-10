# 🛣️ RoadPulse — AI-Powered Road Intelligence & Repair Prioritization

RoadPulse is a full-stack AI platform that transforms raw road inspection video feeds into budget-optimized municipal repair decisions with human verification.

---

## 🌟 Key Features

### 📱 1. Citizen & Inspector Portal ("User Mode")
- **Authentic Live Location Tagging**: Requests live HTML5 Geolocation permission to lock coordinates ($\pm 5\text{m}$ accuracy).
- **Mandatory Live In-Browser Video Recording**: Enforces direct camera capture (`MediaRecorder` API) and disables file browsing to prevent tampered or out-of-context video submissions.
- **Submission Tracking**: Tracks report progress (`reported` → `reviewed` → `in_progress` → `completed` → `verified`).

### 🏛️ 2. Municipal Admin Command Center ("Admin Mode")
- **Interactive Leaflet Master Map**: Color-coded markers (Red = Critical $\ge 75$, Amber = High $\ge 55$, Emerald = Verified).
- **Explainable Multi-Factor Risk Engine**: Score formula $R_{\text{risk}} = 100 \times (0.45S + 0.25R + 0.20E + 0.10C)$.
- **Google OR-Tools 0-1 Knapsack Budget Optimizer**: Maximizes total benefit points under user-defined municipal budget limits $B$.
- **Municipal Work Order Generator**: Formats printable PDF work order reports.
- **Human Repair Verification Sign-off**: Modal comparing before/after evidence photos with official inspector sign-off.

### ⚡ 3. Computer Vision & Real-Time AI Pipeline
- **Ultralytics YOLO Model**: Fine-tuned detector for Potholes, Longitudinal Cracks, and Alligator Cracks (`backend/weights/roadpulse_yolo.pt`).
- **Real-Time Live Camera Stream (`/api/predict/frame`)**: Processes camera frames in real time (~15–30ms) with visual HUD bounding boxes.
- **Spatial Haversine Deduplication**: Merges multi-frame detections of the same defect into unique incident records.

---

## 🏗️ Repository Architecture

```
RoadPulse/
├── backend/                  # FastAPI Python Backend
│   ├── main.py               # Application entry point & router mounting
│   ├── database.py           # SQLite database engine (roadpulse.db)
│   ├── models.py             # SQLAlchemy models (Video, Incident, Evidence, Repair)
│   ├── schemas.py            # Pydantic schemas
│   ├── seed_data.py          # Pre-populated hackathon demo dataset
│   ├── weights/              # Trained YOLO model weights (roadpulse_yolo.pt)
│   ├── services/
│   │   ├── cv_pipeline.py    # OpenCV frame sampling & YOLO detection runner
│   │   ├── deduplicator.py   # Spatial Haversine clustering engine
│   │   ├── risk_engine.py    # Multi-factor explainable risk engine
│   │   └── budget_optimizer.py # Google OR-Tools 0-1 Knapsack solver
│   └── routers/              # REST API routers (videos, incidents, optimize, reports, repairs, predict)
├── frontend/                 # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── App.jsx           # Master container with role switcher (User vs Admin)
│   │   └── components/
│   │       ├── Header.jsx    # Navigation & role toggle
│   │       ├── UserPortal.jsx # Citizen camera recorder & GPS location capture
│   │       ├── AdminDashboard.jsx # Admin Command Center
│   │       ├── IncidentMap.jsx # Interactive Leaflet map with dark theme
│   │       ├── IncidentTable.jsx # Filterable data grid
│   │       ├── RiskCard.jsx   # Risk formula math breakdown card
│   │       ├── LiveStream.jsx # Real-time stream HUD & live model training
│   │       ├── BudgetOptimizer.jsx # Interactive budget slider & solution cards
│   │       ├── WorkOrderReport.jsx # Printable municipal work order layout
│   │       └── RepairVerificationModal.jsx # Human inspector sign-off modal
└── ai_training/              # PyTorch / Ultralytics fine-tuning scripts
    └── train_local_model.py  # Local dataset generator & YOLO training pipeline
```

---

## 🚀 Quickstart Guide (Local Development)

### 1. Start FastAPI Backend
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
- API Docs available at `http://localhost:8000/docs`.

### 2. Start Vite React Frontend
```bash
cd frontend
npm run dev
```
- Web Application running at `http://localhost:5173`.

---

## 📦 How to Push to GitHub & Host

### Step 1: Push Code to GitHub
1. Create a new repository on [GitHub](https://github.com/new) named `RoadPulse`.
2. Run the following commands in your terminal:

```bash
git init
git add .
git commit -m "Initial commit: RoadPulse full hackathon MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/RoadPulse.git
git push -u origin main
```

### Step 2: Hosting the Frontend (Vercel / GitHub Pages)
- **Vercel (Recommended)**:
  1. Import your GitHub repository to Vercel.
  2. Set **Root Directory** to `frontend`.
  3. Click **Deploy**!

### Step 3: Hosting the Backend (Render / Railway / Hugging Face Spaces)
- **Render**:
  1. Create a new **Web Service** on Render connected to your GitHub repository.
  2. Set **Build Command**: `pip install -r backend/requirements.txt`
  3. Set **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
