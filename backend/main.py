import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from seed_data import seed
from config import STATIC_DIR

from routers import videos, incidents, optimize, reports, repairs, predict

Base.metadata.create_all(bind=engine)
seed()

app = FastAPI(
    title="RoadPulse API",
    description="AI-Powered Road Intelligence and Repair Prioritization Engine",
    version="1.0.0"
)

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory for evidence images and uploads
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Include Routers
app.include_router(videos.router)
app.include_router(incidents.router)
app.include_router(optimize.router)
app.include_router(reports.router)
app.include_router(repairs.router)
app.include_router(predict.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "RoadPulse API",
        "version": "1.0.0",
        "workflow_stage": "8-Stage Hackathon MVP Pipeline Ready"
    }
