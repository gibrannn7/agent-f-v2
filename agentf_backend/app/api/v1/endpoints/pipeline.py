from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, status
from typing import List, Optional
import uuid
import os
import tempfile
import traceback
import asyncio
import concurrent.futures
from app.api.v1.endpoints.auth import verify_tenant_access
from app.agents.state import AgentFSharedState, state_store, save_state_to_redis, load_state_from_redis
from app.services.metadata_extractor import extract_metadata
from app.agents.metadata_explorer import process_metadata
from app.agents.code_engine import generate_and_execute_code
from app.agents.financial_auditor import generate_auditor_narrative
from app.core.gc import async_purge_session_directory
from app.services.news_service import fetch_financial_news, trigger_news_check

router = APIRouter()

def _execute_pipeline_core(state: AgentFSharedState, file_records: List[dict], user_custom_prompt: Optional[str], ui_toggle_on: bool):
    try:
        if ui_toggle_on:
            should_fetch_news = asyncio.run(trigger_news_check(user_custom_prompt, ui_toggle_on))
            if should_fetch_news:
                state.stream_queue.append({"type": "output", "token": "[SYSTEM]: Trigger keyword detected. Fetching macroeconomic sentiment...\n"})
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
            
            state.stream_queue.append({"type": "output", "token": f"[SYSTEM]: Ingesting {file_name} into Sandbox...\n"})
            state.stream_queue.append({"type": "output", "token": f"[SYSTEM]: Running Pandas Shield profiling & structural extraction...\n"})
            metadata = extract_metadata(file_id, file_name, file_path)
            state.file_registry_map[file_id] = metadata
            
            state.stream_queue.append({"type": "output", "token": f"[SYSTEM]: Metadata mapped. Invoking Agent 1 (Schema Architect)...\n"})
            state = process_metadata(state, metadata)
            state.stream_queue.append({"type": "output", "token": f"\n[SYSTEM]: Agent 1 architecture map established for {file_name}.\n"})
            
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
    file_records: list, 
    temp_dir: str,
    user_custom_prompt: Optional[str],
    news_toggle: bool,
    user_role: Optional[str] = None,
    analysis_goal: Optional[str] = None
):
    state = state_store.get(session_id)
    if not state:
        return
    
    state.tenant_id = tenant_id
    state.session_id = session_id
    state.user_custom_prompt = user_custom_prompt
    state.user_role = user_role
    state.analysis_goal = analysis_goal
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(
            _execute_pipeline_core, 
            state, 
            file_records, 
            user_custom_prompt, 
            news_toggle
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
            asyncio.run(save_state_to_redis(session_id, state))
            state_store.pop(session_id, None)
            asyncio.run(async_purge_session_directory(temp_dir))

@router.post("/process", status_code=status.HTTP_202_ACCEPTED)
async def process_pipeline(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    user_custom_prompt: Optional[str] = Form(None),
    news_toggle: bool = Form(False),
    engine_selection: str = Form("qwen/qwen3.6-27b"),
    user_role: Optional[str] = Form(None),
    analysis_goal: Optional[str] = Form(None),
    parent_session_id: Optional[str] = Form(None),
    tenant_id: str = Depends(verify_tenant_access)
):
    session_id = str(uuid.uuid4())
    state = AgentFSharedState()
    
    if parent_session_id:
        parent_state = await load_state_from_redis(parent_session_id)
        if parent_state:
            state.file_registry_map = parent_state.file_registry_map
            
    state.engine_selection = engine_selection
    state_store[session_id] = state
    
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
        news_toggle,
        user_role,
        analysis_goal
    )
    
    return {"session_id": session_id, "status": "202 Accepted"}