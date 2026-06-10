from fastapi import APIRouter, Depends, HTTPException
from app.api.v1.endpoints.auth import verify_tenant_access
from app.agents.state import state_store

router = APIRouter()

@router.get("/status/{session_id}")
async def get_status(session_id: str, tenant_id: str = Depends(verify_tenant_access)):
    state = state_store.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "logs": state.execution_logs,
        "status": state.cleaned_data_status.get("global", "processing")
    }

@router.get("/results/{session_id}")
async def get_results(session_id: str, tenant_id: str = Depends(verify_tenant_access)):
    state = state_store.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if state.cleaned_data_status.get("global") != "completed":
        raise HTTPException(status_code=400, detail="Processing not completed yet")
        
    return {
        "session_id": session_id,
        "analytical_data": state.analytical_data,
        "narrative": state.execution_logs[-1] if state.execution_logs else None
    }
