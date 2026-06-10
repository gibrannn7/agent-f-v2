from app.core.config import Settings
from app.agents.state import AgentFSharedState
from app.core.security import get_sandbox_policy

def test_imports_and_models():
    # Ensure models instantiate correctly
    state = AgentFSharedState()
    assert state.file_registry_map == {}
    
    policy = get_sandbox_policy()
    assert policy["timeout_seconds"] == 30
