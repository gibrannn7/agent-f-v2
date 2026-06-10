import json
from app.core.llm import call_deepseek_json
from app.agents.state import AgentFSharedState, FileMetadata, SchemaRegistration

def process_metadata(state: AgentFSharedState, file_metadata: FileMetadata) -> AgentFSharedState:
    prompt = f"""
    You are the primary schema architect of AGENT-F.
    Analyze the provided multi-file metadata. Identify common join keys, time horizons, and financial attributes.
    Map all structural variations to our enterprise standard categories: date, revenue, expense, asset, liability, equity.
    Output strictly a JSON schema registration map. Do not include prose, markdown formatting outside the JSON block, or commentary.
    
    Metadata:
    {file_metadata.model_dump_json()}
    """
    
    messages = [
        {"role": "system", "content": "You output JSON strictly mapping to standard financial categories."},
        {"role": "user", "content": prompt}
    ]
    
    response_str = call_deepseek_json(messages)
    try:
        parsed = json.loads(response_str)
        registration = SchemaRegistration(
            file_id=file_metadata.file_id,
            actions=parsed.get("actions", [])
        )
        state.semantic_schema_register[file_metadata.file_id] = registration
    except json.JSONDecodeError:
        pass
        
    return state
