from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator
import json

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
    generated_code_payload: Optional[str] = None
    analytical_data: Any = Field(default_factory=dict)
    user_custom_prompt: Optional[str] = None
    news_context: Optional[str] = None
    cfo_narrative: Optional[str] = None
    chart_payloads: List[str] = Field(default_factory=list)

    @field_validator("analytical_data")
    @classmethod
    def check_analytical_data_size(cls, v: Any) -> Any:
        payload_size = len(json.dumps(v).encode("utf-8"))
        if payload_size > 500 * 1024:
            raise ValueError(f"Analytical data exceeds 500KB cap (Size: {payload_size} bytes). Immediate compression retry required.")
        return v

state_store: Dict[str, AgentFSharedState] = {}
