from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator
import json
from app.core.redis_client import get_redis_client

class FileMetadata(BaseModel):
    file_id: str
    file_name: str
    file_path: str = ""
    shape: List[int] = Field(default_factory=lambda: [0, 0])
    columns: List[str] = Field(default_factory=list)
    dtypes: Dict[str, str] = Field(default_factory=dict)
    missing_values: Dict[str, int] = Field(default_factory=dict)
    sample_data: List[Dict[str, Any]] = Field(default_factory=list)

class SchemaRegistration(BaseModel):
    file_id: str
    actions: List[Any]

class AgentFSharedState(BaseModel):
    file_registry_map: Dict[str, FileMetadata] = Field(default_factory=dict)
    semantic_schema_register: Dict[str, SchemaRegistration] = Field(default_factory=dict)
    cleaned_data_status: Dict[str, str] = Field(default_factory=dict)
    execution_logs: List[str] = Field(default_factory=list)
    stream_queue: List[Dict[str, str]] = Field(default_factory=list)
    engine_selection: str = "qwen/qwen3.6-27b"
    generated_code_payload: Optional[str] = None
    analytical_data: Any = Field(default_factory=dict)
    user_custom_prompt: Optional[str] = None
    news_context: Optional[str] = None
    cfo_narrative: Optional[str] = None
    user_role: Optional[str] = None
    analysis_goal: Optional[str] = None
    chart_payloads: List[str] = Field(default_factory=list)

    @field_validator("analytical_data")
    @classmethod
    def check_analytical_data_size(cls, v: Any) -> Any:
        payload_size = len(json.dumps(v).encode("utf-8"))
        if payload_size > 500 * 1024:
            raise ValueError(f"Analytical data exceeds 500KB cap (Size: {payload_size} bytes). Immediate compression retry required.")
        return v

state_store: Dict[str, AgentFSharedState] = {}

async def load_state_from_redis(session_id: str) -> Optional[AgentFSharedState]:
    try:
        client = await get_redis_client()
        raw_data = await client.get(f"agentf:state:{session_id}")
        if raw_data:
            return AgentFSharedState.model_validate_json(raw_data)
    except Exception as e:
        print(f"Redis Load Error: {e}")
    return None

async def save_state_to_redis(session_id: str, state: AgentFSharedState, ttl_seconds: int = 7200):
    try:
        client = await get_redis_client()
        # Ensure we don't save the stream queue, it's transient
        state_copy = state.model_copy()
        state_copy.stream_queue = []
        await client.setex(f"agentf:state:{session_id}", ttl_seconds, state_copy.model_dump_json())
    except Exception as e:
        print(f"Redis Save Error: {e}")
