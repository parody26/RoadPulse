from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Incident
from schemas import OptimizeRequest, OptimizeResponse, IncidentSchema
from services.budget_optimizer import optimize_budget

router = APIRouter(prefix="/api/optimize", tags=["Optimization"])

@router.post("", response_model=OptimizeResponse)
def run_optimization(payload: OptimizeRequest, db: Session = Depends(get_db)):
    """
    Step 4: Budget Optimization endpoint.
    Solves the 0-1 Knapsack problem for road repair selection under budget constraints.
    """
    query = db.query(Incident)
    if payload.incident_ids:
        query = query.filter(Incident.id.in_(payload.incident_ids))
    
    incidents = query.all()
    if not incidents:
        return OptimizeResponse(
            budget=payload.budget,
            total_cost=0,
            total_benefit=0,
            selected_incidents=[],
            excluded_incidents=[]
        )

    result = optimize_budget(incidents, payload.budget)
    
    return OptimizeResponse(
        budget=payload.budget,
        total_cost=result["total_cost"],
        total_benefit=result["total_benefit"],
        selected_incidents=[IncidentSchema.from_orm(inc) for inc in result["selected"]],
        excluded_incidents=[IncidentSchema.from_orm(inc) for inc in result["excluded"]]
    )
