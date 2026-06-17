from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
import asyncio
import json
import math
from app.api.v1.endpoints.auth import verify_tenant_access
from app.agents.state import state_store

router = APIRouter()

def sanitize_float_compliance(obj):
    """
    Recursive sanitization engine.
    Scans the entire payload tree to detect and neutralize illegal IEEE 754 float values
    (Infinity, -Infinity, NaN) which violate standard JSON RFC 7159 specifications.
    Maps them safely to 'None' (null in JSON).
    """
    if isinstance(obj, dict):
        return {k: sanitize_float_compliance(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_float_compliance(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    return obj

@router.get("/stream/{session_id}")
async def stream_workspace_status(session_id: str, request: Request):
    async def event_generator():
        try:
            while True:
                # Deteksi awal jika klien React melakukan unmount atau navigasi
                if await request.is_disconnected():
                    break
                    
                state = state_store.get(session_id)
                if not state:
                    err_payload = json.dumps({"type": "error", "token": "Session not found"})
                    yield f"data: {err_payload}\n\n"
                    break
                    
                if state.stream_queue:
                    # Pop tokens and stream them at 50ms latency intervals
                    token_data = state.stream_queue.pop(0)
                    payload = json.dumps(token_data)
                    yield f"data: {payload}\n\n"
                else:
                    global_status = state.cleaned_data_status.get("global")
                    if global_status in ["completed", "error"]:
                        # Memaksa key "type" menjadi "completed" agar tertangkap oleh eventSource React
                        status_payload = json.dumps({"type": global_status, "token": global_status})
                        yield f"data: {status_payload}\n\n"
                        break
                    await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            # Silent graceful shutdown saat koneksi diputus sepihak oleh klien
            pass
        except Exception:
            pass
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/results/{session_id}")
async def get_workspace_results(session_id: str, tenant_id: str = Depends(verify_tenant_access)):
    state = state_store.get(session_id)
    if not state:
        return {"error": "Session not found"}
        
    # Eksekusi sistem sanitasi rekursif pada analytical_data sebelum serialization
    safe_analytical_data = sanitize_float_compliance(state.analytical_data)
        
    return {
        "analytical_data": safe_analytical_data,
        "narrative": state.cfo_narrative if state.cfo_narrative else "No CFO Narrative generated.",
        "chain_of_thought_code": state.generated_code_payload if state.generated_code_payload else "No execution trace available.",
        "stream_queue": state.stream_queue
    }