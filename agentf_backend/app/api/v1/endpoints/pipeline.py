from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, status
from typing import List, Optional
import uuid
import os
import tempfile
import traceback
import asyncio
import concurrent.futures
from app.api.v1.endpoints.auth import verify_tenant_access
from app.agents.state import AgentFSharedState, state_store
from app.services.metadata_extractor import extract_metadata
from app.agents.metadata_explorer import process_metadata
from app.agents.code_engine import generate_and_execute_code
from app.agents.financial_auditor import generate_auditor_narrative
from app.core.gc import async_purge_session_directory
from app.services.news_service import fetch_financial_news, trigger_news_check

router = APIRouter()

def _execute_pipeline_core(state: AgentFSharedState, file_records: List[dict], user_custom_prompt: Optional[str], ui_toggle_on: bool):
    try:
        state.stream_queue.append({"type": "output", "token": "[SYSTEM]: Evaluating macro news triggers...\n"})
        should_fetch_news = asyncio.run(trigger_news_check(user_custom_prompt, ui_toggle_on))
        
        if should_fetch_news:
            state.stream_queue.append({"type": "output", "token": "[SYSTEM]: Fetching external macroeconomic realities...\n"})
            trigger_keywords = ["inflation", "tax", "ppn", "interest rates", "tariff", "market", "sentimen", "kebijakan"]
            prompt_lower = user_custom_prompt.lower() if user_custom_prompt else ""
            extracted_keywords = [kw for kw in trigger_keywords if kw in prompt_lower]
            if not extracted_keywords:
                extracted_keywords = ["finance", "business"]
            
            news_context = asyncio.run(fetch_financial_news(extracted_keywords))
            if news_context:
                state.news_context = news_context
                state.stream_queue.append({"type": "output", "token": "[SYSTEM]: Macroeconomic news context injected successfully.\n"})
        
        for record in file_records:
            file_name = record["file_name"]
            file_path = record["file_path"]
            file_id = record["file_id"]
            
            state.stream_queue.append({"type": "output", "token": f"[SYSTEM]: Extracting structural metadata for {file_name} using Pandas Shield...\n"})
            metadata = extract_metadata(file_id, file_name, file_path)
            state.file_registry_map[file_id] = metadata
            
            state.stream_queue.append({"type": "output", "token": f"[SYSTEM]: Metadata extracted successfully. Sending schema to Agent 1 (Schema Architect)...\n"})
            state = process_metadata(state, metadata)
            state.stream_queue.append({"type": "output", "token": f"\n[SYSTEM]: Agent 1 finished Schema Architecture map for {file_name}.\n"})
            
        schema_info = {k: v.model_dump() for k, v in state.semantic_schema_register.items()}
        
        # Core Orchestration: Errors raised inside Code Engine will be trapped here.
        state = generate_and_execute_code(state, schema_info)
        
        state = generate_auditor_narrative(state)
        
        state.stream_queue.append({"type": "output", "token": "\n\n[SYSTEM]: Pipeline execution finished successfully.\n"})
        state.cleaned_data_status["global"] = "completed"

    except MemoryError as me:
        error_msg = f"\n\n[SYSTEM ERROR]: {str(me)}\n[PROCESS TERMINATED]: Analysis halted immediately to preserve API budget constraints.\n"
        print(error_msg)
        state.stream_queue.append({"type": "output", "token": error_msg})
        state.cleaned_data_status["global"] = "error"
        
    except RuntimeError as re:
        error_msg = f"\n\n[SYSTEM ERROR]: {str(re)}\n[PROCESS TERMINATED]: The analytical pipeline encountered an unrecoverable logic exception.\n"
        print(error_msg)
        state.stream_queue.append({"type": "output", "token": error_msg})
        state.cleaned_data_status["global"] = "error"
        
    except Exception as e:
        error_msg = f"\n\n[SYSTEM ERROR]: CRITICAL PIPELINE ERROR: {str(e)}\n"
        print(error_msg)
        traceback.print_exc()
        state.stream_queue.append({"type": "output", "token": error_msg})
        state.cleaned_data_status["global"] = "error"

def process_pipeline_background(
    session_id: str, 
    tenant_id: str, 
    file_records: List[dict], 
    temp_dir: str, 
    user_custom_prompt: Optional[str],
    ui_toggle_on: bool
):
    state = state_store.get(session_id, AgentFSharedState())
    state.user_custom_prompt = user_custom_prompt
    state.stream_queue.append({"type": "output", "token": f"[SYSTEM]: Started processing for tenant {tenant_id}\n"})
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(
            _execute_pipeline_core, 
            state, 
            file_records, 
            user_custom_prompt, 
            ui_toggle_on
        )
        try:
            future.result(timeout=600.0)
        except concurrent.futures.TimeoutError:
            error_msg = "\n\n[SYSTEM ERROR]: Pipeline execution timeout exceeded (240s limit).\n[PROCESS TERMINATED]: System forced a hard shutdown.\n"
            state.stream_queue.append({"type": "output", "token": error_msg})
            state.cleaned_data_status["global"] = "error"
        except Exception as e:
            pass
        finally:
            state_store[session_id] = state
            asyncio.run(async_purge_session_directory(temp_dir))

@router.post("/process", status_code=status.HTTP_202_ACCEPTED)
async def process_pipeline(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    user_custom_prompt: Optional[str] = Form(None),
    news_toggle: bool = Form(False),
    tenant_id: str = Depends(verify_tenant_access)
):
    session_id = str(uuid.uuid4())
    state_store[session_id] = AgentFSharedState()
    
    file_records = []
    
    temp_dir = os.path.join(tempfile.gettempdir(), f"agentf_{session_id}")
    os.makedirs(temp_dir, exist_ok=True)
    
    for i, f in enumerate(files):
        safe_filename = f.filename or f"unknown_file_{i}"
        file_path = os.path.join(temp_dir, safe_filename)
        file_id = f"file_{i}"
        
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await f.read(1024 * 1024)
                if not chunk:
                    break
                buffer.write(chunk)
                
        file_records.append({
            "file_id": file_id,
            "file_name": safe_filename,
            "file_path": file_path
        })
    
    background_tasks.add_task(
        process_pipeline_background, 
        session_id, 
        tenant_id, 
        file_records, 
        temp_dir, 
        user_custom_prompt,
        news_toggle
    )
    
    return {"session_id": session_id, "status": "202 Accepted"}