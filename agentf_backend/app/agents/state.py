from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class FileMetadata(BaseModel):
    file_id: str
    file_name: str
    shape: List[int]
    columns: List[str]

class SchemaRegistration(BaseModel):
    file_id: str
    actions: List[Dict[str, Any]]

class AgentFSharedState(BaseModel):
    file_registry_map: Dict[str, FileMetadata] = Field(default_factory=dict)
    semantic_schema_register: Dict[str, SchemaRegistration] = Field(default_factory=dict)
    cleaned_data_status: Dict[str, str] = Field(default_factory=dict)
    execution_logs: List[str] = Field(default_factory=list)
    generated_code_payload: Optional[str] = None
    analytical_data: Dict[str, Any] = Field(default_factory=dict)

state_store: Dict[str, AgentFSharedState] = {}
