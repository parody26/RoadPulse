import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserSchema, GoogleAuthRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication & Citizen Accounts"])

@router.post("/google", response_model=UserSchema)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Google Login / Signup Endpoint.
    Authenticates or creates a citizen account via Google profile,
    initializes their civic rewards wallet with 100 welcome bonus points.
    """
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        # Create brand-new citizen account
        user = User(
            id=f"cit_{uuid.uuid4().hex[:8]}",
            email=clean_email,
            name=payload.name.strip() or clean_email.split('@')[0].capitalize(),
            avatar=payload.avatar or f"https://api.dicebear.com/7.x/bottts/svg?seed={clean_email}",
            google_id=payload.google_id or f"goog_{uuid.uuid4().hex[:12]}",
            points=100, # 100 Welcome Bonus Civic Points
            potholes_reported=0,
            total_reports=0,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update name and avatar if provided
        if payload.name:
            user.name = payload.name.strip()
        if payload.avatar:
            user.avatar = payload.avatar
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
