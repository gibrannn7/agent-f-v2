from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, status
from typing import List
import uuid
import os
import shutil
import tempfile
import traceback
from app.api.v1.endpoints.auth import verify_tenant_access
from app.agents.state import AgentFSharedState, FileMetadata, state_store
from app.agents.metadata_explorer import process_metadata
from app.agents.code_engine import generate_and_execute_code
from app.agents.financial_auditor import generate_auditor_narrative

router = APIRouter()

def process_pipeline_background(session_id: str, tenant_id: str, files: List[str]):
    state = state_store.get(session_id, AgentFSharedState())
    state.execution_logs.append(f"Started processing for tenant {tenant_id}")
    
    try:
        for i, file_name in enumerate(files):
            # Simulasi baca metadata
            metadata = FileMetadata(
                file_id=f"file_{i}",
                file_name=file_name,
                shape=[1000, 5],
                columns=["date", "amount", "category", "id", "notes"]
            )
            state.execution_logs.append(f"Extracting metadata for {file_name}...")
            state = process_metadata(state, metadata)
        
        state.execution_logs.append("Analyzing data anomalies & generating Python code...")
        anomaly_report = {"file_0": [{"column": "amount", "issue": "outliers"}]}
        state = generate_and_execute_code(state, anomaly_report)
        
        state.execution_logs.append("Generating CFO Audit Narrative...")
        state = generate_auditor_narrative(state)
        
        state.execution_logs.append("Pipeline execution finished successfully.")
        state.cleaned_data_status["global"] = "completed"
        
    except Exception as e:
        # INI KUNCINYA: Tangkap error yang bikin macet!
        error_msg = f"CRITICAL PIPELINE ERROR: {str(e)}"
        print(f"\n[!!!] {error_msg}")
        traceback.print_exc() # Print detail error merah ke terminal backend
        state.execution_logs.append(error_msg)
        state.cleaned_data_status["global"] = "error" # Kasih tau frontend buat berhenti loading
        
    finally:
        state_store[session_id] = state

@router.post("/process", status_code=status.HTTP_202_ACCEPTED)
async def process_pipeline(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    tenant_id: str = Depends(verify_tenant_access)
):
    session_id = str(uuid.uuid4())
    state_store[session_id] = AgentFSharedState()
    
    saved_file_paths = []
    
    # Create a unique temporary directory for this specific session
    temp_dir = tempfile.mkdtemp(prefix=f"agentf_{session_id}_")
    
    for f in files:
        safe_filename = f.filename or "unknown_file"
        file_path = os.path.join(temp_dir, safe_filename)
        
        # Stream the file safely to the disk before returning the 202 response
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
            
        saved_file_paths.append(file_path)
    
    # Pass the actual absolute file paths to the background worker, not just the names
    background_tasks.add_task(process_pipeline_background, session_id, tenant_id, saved_file_paths)
    
    return {"session_id": session_id, "status": "202 Accepted"}