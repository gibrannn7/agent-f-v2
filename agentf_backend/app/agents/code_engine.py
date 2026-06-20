import json
import re
from pydantic import ValidationError
from app.core.llm import call_deepseek_text
from app.core.sandbox import JupyterSandboxManager
from app.agents.state import AgentFSharedState
import asyncio

MAX_STEPS = 10
TOKEN_LIMIT = 50000

def generate_and_execute_code(state: AgentFSharedState, schema_info: dict) -> AgentFSharedState:
    custom_prompt_context = state.user_custom_prompt if state.user_custom_prompt else "No custom focus provided. Apply standard enterprise financial aggregations."
    news_injection = f"\nNews Context Available: {state.news_context}\n" if hasattr(state, 'news_context') and getattr(state, 'news_context') else ""
    
    system_prompt = f"""
    You are the Elite Quant and FP&A Director Code Engine for AGENT-F. 
    You have access to a persistent, stateful Jupyter Notebook environment.
    
    CRITICAL MANDATES:
    1. ITERATIVE REPL: Write ONE block of Python code per turn enclosed in ```python ... ```. The system will run it and return the stdout/stderr.
    2. ONCE you are satisfied with your analytical output, you MUST output the final JSON payload enclosed in ```json ... ```. DO NOT output the final JSON until you've successfully verified the data via code.
    3. NEVER return flat group-by tables or raw transactional rows in the final JSON. Output only macroscopic JSON summaries.
    4. DEFENSIVE DATA INGESTION (ANTI-KEYERROR SHIELD): Real-world data is inherently dirty. You MUST apply this immediately after loading ANY file:
       - For CSVs: `df = pd.read_csv(filepath, encoding='utf-8-sig', skipinitialspace=True)`
       - For Excel: `df = pd.read_excel(filepath)`
       - MANDATORY COLUMN CLEANING: `df.columns = df.columns.astype(str).str.strip().str.replace('\\ufeff', '').str.replace('ï»¿', '')`
    5. DEFENSIVE TOTAL ASSETS PROXY: If 'TotalAssets' is missing from the dataset but 'NetIncome' and 'ROA' are present, you MUST calculate it dynamically:
       `if 'TotalAssets' not in df.columns and 'NetIncome' in df.columns and 'ROA' in df.columns:`
       `    df['TotalAssets'] = df['NetIncome'] / (df['ROA'] / 100)`
    6. DUPONT ANALYSIS OUTPUT SCHEMA: Your final JSON output MUST include a `"dupont_analysis"` key containing a `"summary"` object with exact keys `"NPM"`, `"AT"`, `"EM"`, and `"ROE"`.
    7. Generate Professional Visualizations using matplotlib/seaborn. To output charts to the frontend, you MUST simply call `plt.show()` at the end of your cell. DO NOT encode images to base64 manually and DO NOT include `"_charts"` in your final JSON output. The system will automatically capture the charts from `plt.show()`.
    8. Architecture: Write flat, procedural code. DO NOT wrap logic inside `main()` functions.
    9. EXTERNAL NETWORK & SECURE SANDBOX POLICY:
       - The execution environment is an isolated sandbox. DO NOT use `import requests`.
       
    {news_injection}
    User Custom Constraint / Focus Notes:
    {custom_prompt_context}
    
    Remember: Output either a ```python block to execute, or a ```json block if you are finished.
    """
    
    registry_context = {fid: fmeta.file_path.replace("\\", "/") for fid, fmeta in state.file_registry_map.items()}
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Schema Context:\n{json.dumps(schema_info)}\nFile Paths to Process (Forward Slashes Enforced):\n{json.dumps(registry_context)}"}
    ]
    
    def stream_callback(token_type: str, token_val: str):
        state.stream_queue.append({"type": token_type, "token": token_val})
        estimated_tokens = sum(len(item["token"]) for item in state.stream_queue) // 4
        if estimated_tokens >= TOKEN_LIMIT:
            raise MemoryError(f"CIRCUIT_BREAKER_TRIPPED: Absolute token limit ({TOKEN_LIMIT}) exceeded. Halting to protect API budget.")
            
    sandbox = JupyterSandboxManager()
    state.stream_queue.append({"type": "output", "token": f"\n\n[SYSTEM]: Spin-up Jupyter Kernel Sandbox Environment...\n"})
    
    # Initialize payloads
    if state.generated_code_payload is None:
        state.generated_code_payload = ""
        
    # We will accumulate the raw base64 chart strings here
    if not hasattr(state, "chart_payloads"):
        state.chart_payloads = []
        
    try:
        for step in range(MAX_STEPS):
            state.stream_queue.append({"type": "output", "token": f"\n\n[SYSTEM]: Agent Iteration {step + 1}/{MAX_STEPS}...\n"})
            
            response_text = call_deepseek_text(messages, on_token_chunk=stream_callback)
            messages.append({"role": "assistant", "content": response_text})
            
            # Check for JSON block (meaning we are done)
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
                state.generated_code_payload += f"\n\n### Final Synthesis\n\n**Agent Final JSON Output:**\n```json\n{json_str}\n```\n"
                try:
                    parsed_json = json.loads(json_str)
                    
                    # Manually inject the accumulated raw charts into the final JSON
                    parsed_json["_charts"] = getattr(state, "chart_payloads", [])
                    
                    state.analytical_data = parsed_json
                    state.stream_queue.append({"type": "output", "token": f"\n[SYSTEM]: Valid final JSON extracted. Deep statistical execution succeeded.\n"})
                    return state
                except json.JSONDecodeError:
                    state.stream_queue.append({"type": "output", "token": f"\n[SYSTEM ERROR]: Final Output JSON parsing failed.\n"})
                    messages.append({"role": "user", "content": "The JSON you provided is invalid. Please output a purely valid JSON string within ```json block."})
                    continue
            
            # Check for Python block
            if "```python" in response_text:
                # Accumulate the agent's full response (thinking) first
                state.generated_code_payload += f"\n\n### Agent Iteration {step + 1}\n\n**Agent Thinking:**\n{response_text.split('```python')[0].strip()}\n"
                
                code_str = response_text.split("```python")[1].split("```")[0].strip()
                
                # Accumulate the code trace
                state.generated_code_payload += f"\n**Python Execution Block:**\n```python\n{code_str}\n```\n"
                
                state.stream_queue.append({"type": "output", "token": f"\n\n[SYSTEM]: Executing Python Cell in secure sandbox...\n"})
                
                result = asyncio.run(sandbox.execute_cell(code_str, timeout=60))
                
                if result["status"] == "success":
                    sys_out = result["stdout"].strip()
                    
                    # Store the actual raw base64 strings in the state list instead of relying on the LLM
                    for p in result["payloads"]:
                        if isinstance(p, dict) and "data" in p:
                            state.chart_payloads.append(p["data"])
                        
                    payload_msgs = [f"Base64 image {i+1} captured by system." for i in range(len(result["payloads"]))]
                    payload_str = " ".join(payload_msgs)
                    combined_out = sys_out + ("\n" + payload_str if payload_str else "")
                    
                    if not combined_out:
                        combined_out = "(No output generated)"
                        
                    state.generated_code_payload += f"\n**Execution Status:** `<SUCCESS>`\n**Output:**\n```text\n{combined_out}\n```\n"
                    messages.append({"role": "user", "content": f"Cell executed successfully.\nOutput:\n{combined_out}\n\nWhat is your next step? If you are done, output the final ```json block."})
                else:
                    traceback_msg = result.get('stderr', {}).get('raw_traceback', 'Unknown Timeout or Execution Error')
                    state.generated_code_payload += f"\n**Execution Status:** `<FAILED>`\n**Traceback:**\n```text\n{traceback_msg}\n```\n"
                    state.stream_queue.append({"type": "output", "token": f"\n[SYSTEM ERROR]: Cell execution failed:\n{traceback_msg}\n"})
                    messages.append({"role": "user", "content": f"Cell execution failed with traceback:\n{traceback_msg}\nFix the error and write the next cell."})
            else:
                state.generated_code_payload += f"\n\n### Agent Iteration {step + 1}\n\n**Agent Response (No Code Block):**\n{response_text}\n"
                messages.append({"role": "user", "content": "I did not find a ```python block or a ```json block. Please provide your next action."})
                
        raise RuntimeError(f"Self-healing REPL loop exhausted ({MAX_STEPS}/{MAX_STEPS} steps used). Unrecoverable loop.")
    finally:
        sandbox.shutdown()
        
    return state