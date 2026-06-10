import json
from app.core.llm import call_deepseek_text
from app.core.security import execute_sandbox_code
from app.agents.state import AgentFSharedState

MAX_RETRIES = 3

def generate_and_execute_code(state: AgentFSharedState, anomaly_report: dict) -> AgentFSharedState:
    system_prompt = """
    You are the Dynamic Code Engine for AGENT-F. Write deterministic, bug-free Python code using pandas to calculate CAGR, DuPont, and Altman Z-score.
    Write the code to read the provided anomaly report (or mock it) and output a JSON string of aggregates using print().
    Only output Python code. No markdown code blocks, just raw Python code.
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Anomaly Report:\n{json.dumps(anomaly_report)}"}
    ]
    
    for attempt in range(MAX_RETRIES):
        code_str = call_deepseek_text(messages)
        if code_str.startswith("```python"):
            code_str = code_str.split("```python")[1].split("```")[0].strip()
        elif code_str.startswith("```"):
            code_str = code_str.split("```")[1].split("```")[0].strip()
            
        result = execute_sandbox_code(code_str)
        
        if result["status"] == "success":
            state.generated_code_payload = code_str
            try:
                state.analytical_data = json.loads(result["output"])
            except json.JSONDecodeError:
                state.analytical_data = {"raw_output": result["output"]}
            state.execution_logs.append(f"Code execution succeeded on attempt {attempt + 1}")
            break
        else:
            state.execution_logs.append(f"Code execution failed on attempt {attempt + 1}")
            messages.append({"role": "assistant", "content": code_str})
            messages.append({"role": "user", "content": f"Execution failed with traceback:\n{result['traceback']}\nFix the code."})
            
    return state
