import json
from app.core.llm import call_llm_json
from app.agents.state import AgentFSharedState, FileMetadata, SchemaRegistration

def process_metadata(state: AgentFSharedState, file_metadata: FileMetadata) -> AgentFSharedState:
    schema_registry = {
        "file_name": file_metadata.file_name,
        "shape": file_metadata.shape,
        "columns": file_metadata.columns,
        "dtypes": file_metadata.dtypes,
        "missing_values": file_metadata.missing_values,
        "sample_data": file_metadata.sample_data
    }
    
    prompt = f"""
    You are the primary schema architect of AGENT-F.
    Analyze the provided structural schema registry. Identify common join keys (if interacting with prior files), time horizons, and financial attributes.
    Map all structural variations to our enterprise standard categories: date, revenue, expense, asset, liability, equity.
    
    STRICT RULE: If this file shares NO common identifiers (Join Keys) with any other datasets in the system, you MUST output a structured JSON instructing Agent 2 to execute individual data aggregation pipelines instead of attempting a merge operation. Never recommend a `pd.merge` if keys are missing.
    
    Output strictly a JSON schema registration map containing:
    1. "actions": A list of aggregation or transformation actions to perform.
    2. "merge_strategy": "isolated" or "join"
    3. "join_keys": A list of keys if merge_strategy is "join", otherwise empty.
    
    Do not include prose, markdown formatting outside the JSON block, or commentary.
    
    Schema Registry:
    {json.dumps(schema_registry, indent=2, default=str)}
    """
    
    response = call_llm_json(
        messages=[
            {"role": "system", "content": "You output JSON strictly mapping to standard financial categories and define precise isolated or joined aggregation strategies."},
            {"role": "user", "content": prompt}
        ],
        model_id=state.engine_selection
    )
    try:
        parsed = json.loads(response)
        registration = SchemaRegistration(
            file_id=file_metadata.file_id,
            actions=parsed.get("actions", [])
        )
        state.semantic_schema_register[file_metadata.file_id] = registration
    except json.JSONDecodeError:
        pass
        
    return state