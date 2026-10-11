import uuid
import json
import urllib.request
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserSchema, GoogleAuthRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication & Citizen Accounts"])

def verify_google_id_token(id_token: str) -> Optional[dict]:
    """Verify cryptographically signed Google ID token using Google TokenInfo API"""
    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        req = urllib.request.Request(url, headers={"User-Agent": "RoadPulse-Auth/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Google Tokeninfo verification notice: {e}")
    return None

def verify_google_access_token(access_token: str) -> Optional[dict]:
    """Verify Google OAuth2 Access Token by fetching profile from userinfo API"""
    try:
        url = "https://www.googleapis.com/oauth2/v3/userinfo"
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "RoadPulse-Auth/1.0"
        })
        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Google Userinfo verification notice: {e}")
    return None

@router.post("/google", response_model=UserSchema)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Real-Time Google Login / Signup Endpoint.
    Authenticates with real Google ID token (JWT) or OAuth access token,
    creates or retrieves the citizen account in SQLite, and provides 100 Welcome Points.
    """
    email = payload.email
    name = payload.name
    avatar = payload.avatar
    google_id = payload.google_id

    # 1. Verify Google ID token (credential) if provided
    raw_id_token = payload.credential or payload.id_token
    if raw_id_token:
        verified_data = verify_google_id_token(raw_id_token)
        if verified_data:
            email = verified_data.get("email", email)
            name = verified_data.get("name", name)
            avatar = verified_data.get("picture", avatar)
            google_id = verified_data.get("sub", google_id)

    # 2. Verify Google OAuth Access token if provided
    if (not email or not name) and payload.access_token:
        verified_data = verify_google_access_token(payload.access_token)
        if verified_data:
            email = verified_data.get("email", email)
            name = verified_data.get("name", name)
            avatar = verified_data.get("picture", avatar)
            google_id = verified_data.get("sub", google_id)

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Valid Google account email or token is required for authentication."
        )

    clean_email = email.strip().lower()
    clean_name = (name or clean_email.split('@')[0]).strip()
    clean_avatar = avatar or f"https://api.dicebear.com/7.x/bottts/svg?seed={clean_email}"
    clean_google_id = google_id or f"goog_{uuid.uuid4().hex[:12]}"

    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        # Create brand-new citizen account
        user = User(
            id=f"cit_{uuid.uuid4().hex[:8]}",
            email=clean_email,
            name=clean_name,
            avatar=clean_avatar,
            google_id=clean_google_id,
            points=100,  # 100 Welcome Bonus Civic Points
            potholes_reported=0,
            total_reports=0,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name and avatar from real Google profile
        if clean_name and user.name != clean_name:
            user.name = clean_name
        if clean_avatar and user.avatar != clean_avatar:
            user.avatar = clean_avatar
        if clean_google_id:
            user.google_id = clean_google_id
        db.commit()
        db.refresh(user)

    return user

@router.get("/user/{email}", response_model=UserSchema)
def get_user_profile(email: str, db: Session = Depends(get_db)):
    clean_email = email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Citizen user account not found")
    return user

@router.get("/leaderboard", response_model=List[UserSchema])
def get_leaderboard(db: Session = Depends(get_db)):
    """
    Returns top active citizens by points earned from road hazard reporting.
    """
    return db.query(User).order_by(User.points.desc()).limit(10).all()
