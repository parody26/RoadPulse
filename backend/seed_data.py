import os
from database import engine, Base, SessionLocal
from models import Video, Incident, Evidence, Repair

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear all example cases so only real incidents are reported
    db.query(Evidence).delete()
    db.query(Repair).delete()
    db.query(Incident).delete()
    db.query(Video).delete()
    db.commit()
    db.close()
    print("Database cleaned: 0 mock incidents. Ready for real citizen reports.")

if __name__ == "__main__":
    seed()
