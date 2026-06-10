import json
from app.core.llm import call_deepseek_text
from app.agents.state import AgentFSharedState

def generate_auditor_narrative(state: AgentFSharedState) -> AgentFSharedState:
    system_prompt = """
    You are the Financial Auditor and Strategic Narrator for AGENT-F.
    Write from the perspective of an elite corporate CFO: objective, analytical, risk-aware, and actionable.
    Do not perform any math calculations. Synthesize the provided analytical data into an executive briefing.
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Analytical Data:\n{json.dumps(state.analytical_data)}"}
    ]
    
    narrative = call_deepseek_text(messages)
    state.execution_logs.append(narrative)
    
    return state
