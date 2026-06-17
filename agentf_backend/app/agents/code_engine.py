import json
from pydantic import ValidationError
from app.core.llm import call_deepseek_text
from app.core.sandbox import execute_sandbox_code
from app.agents.state import AgentFSharedState

MAX_RETRIES = 3
TOKEN_LIMIT = 30000

def generate_and_execute_code(state: AgentFSharedState, schema_info: dict) -> AgentFSharedState:
    custom_prompt_context = state.user_custom_prompt if state.user_custom_prompt else "No custom focus provided. Apply standard enterprise financial aggregations."
    
    # Inject pre-fetched macro news so the agent doesn't try to fetch it manually
    news_injection = f"\nNews Context Available: {state.news_context}\n" if hasattr(state, 'news_context') and getattr(state, 'news_context') else ""
    
    system_prompt = f"""
    You are the Elite Quant and FP&A Director Code Engine for AGENT-F. 
    Write deterministic, high-performance Python code using Pandas, Matplotlib, and Seaborn to execute a hyper-deep multi-dimensional statistical analysis.
    
    CRITICAL MANDATES:
    1. NEVER return flat group-by tables or raw transactional rows. Output only macroscopic JSON summaries.
    2. DEFENSIVE DATA INGESTION (ANTI-KEYERROR SHIELD): Real-world data is inherently dirty. You MUST apply this immediately after loading ANY file:
       - For CSVs: `df = pd.read_csv(filepath, encoding='utf-8-sig', skipinitialspace=True)`
       - For Excel: `df = pd.read_excel(filepath)`
       - MANDATORY COLUMN CLEANING: `df.columns = df.columns.astype(str).str.strip().str.replace('\\ufeff', '').str.replace('ï»¿', '')`
       - Do NOT attempt to access any data columns before successfully executing the column cleaning line above.
    3. Execute robust mathematical diagnostics: Pareto 80/20, AOV, IQR Outliers, Daily/Monthly Volatility.
    4. Generate Professional Visualizations using matplotlib/seaborn (save to io.BytesIO, encode base64).
    5. Output Format: Output a single minimized JSON string to sys.stdout (must not exceed 500KB). Inject the base64 encoded chart string inside the JSON under the exact key `"_charts"` (must be a list of strings).
    6. Architecture: Write flat, procedural code. DO NOT wrap logic inside `main()` functions.
    7. EXTERNAL NETWORK & SECURE SANDBOX POLICY:
       - The execution environment is an isolated sandbox. DO NOT use `import requests` (it will cause ModuleNotFoundError).
       - DO NOT attempt to establish live HTTP connections. Use the provided News Context below for your macro-economic analysis.
       - If you MUST simulate API fetching defensively, use a hyper-concise block: `try: import urllib.request; ... except Exception: news_data = 'Macro context applied'`
       - NEVER write long, complex fallback logic for network calls. Prioritize token conservation and script brevity.
       
    {news_injection}
    User Custom Constraint / Focus Notes:
    {custom_prompt_context}
    
    Write the code to read the provided schemas and file paths. Print only the final JSON string.
    Only output Python code. No markdown code blocks surrounding it, just the raw executable python script.
    """
    
    registry_context = {fid: fmeta.file_path.replace("\\", "/") for fid, fmeta in state.file_registry_map.items()}
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Schema Context:\n{json.dumps(schema_info)}\nFile Paths to Process (Forward Slashes Enforced):\n{json.dumps(registry_context)}"}
    ]
    
    def stream_callback(token_type: str, token_val: str):
        state.stream_queue.append({"type": token_type, "token": token_val})
        
        # Smart Circuit Breaker: Intercept stream and estimate total tokens (1 token approx 4 chars)
        # Throwing an exception here instantly severs the connection to DeepSeek, halting cost bleed.
        estimated_tokens = sum(len(item["token"]) for item in state.stream_queue) // 4
        if estimated_tokens >= TOKEN_LIMIT:
            raise MemoryError(f"CIRCUIT_BREAKER_TRIPPED: Absolute token limit ({TOKEN_LIMIT}) exceeded. Halting to protect API budget.")
    
    for attempt in range(MAX_RETRIES):
        state.stream_queue.append({"type": "output", "token": f"\n\n[SYSTEM]: Initiating Agent 2 Quant Sandbox (Attempt {attempt + 1}/{MAX_RETRIES})...\n"})
        
        code_str = call_deepseek_text(messages, on_token_chunk=stream_callback)
        
        if code_str.startswith("```python"):
            code_str = code_str.split("```python")[1].split("```")[0].strip()
        elif code_str.startswith("```"):
            code_str = code_str.split("```")[1].split("```")[0].strip()
            
        state.stream_queue.append({"type": "output", "token": f"\n\n[SYSTEM]: Code generation complete. Executing in secure sandbox...\n"})
        result = execute_sandbox_code(code_str)
        
        if result["status"] == "success":
            state.generated_code_payload = code_str
            try:
                temp_data = json.loads(result["output"])
                state.analytical_data = temp_data
                state.stream_queue.append({"type": "output", "token": f"[SYSTEM]: Deep statistical execution succeeded.\n"})
                return state
            except json.JSONDecodeError:
                state.stream_queue.append({"type": "output", "token": f"[SYSTEM ERROR]: Output parsing failed.\n"})
                messages.append({"role": "assistant", "content": code_str})
                messages.append({"role": "user", "content": "Execution returned invalid JSON. Output must be purely a valid JSON string containing mathematical aggregations and _charts. Fix the code."})
            except ValidationError as ve:
                state.stream_queue.append({"type": "output", "token": f"[SYSTEM ERROR]: Memory Cap Exceeded (500KB).\n"})
                messages.append({"role": "assistant", "content": code_str})
                messages.append({"role": "user", "content": f"Execution failed: Payload exceeded 500KB cap. You must aggregate the data more aggressively using Pandas and keep base64 images small. Fix the code."})
        else:
            state.stream_queue.append({"type": "output", "token": f"\n[SYSTEM ERROR]: Code execution failed with traceback:\n{result['traceback']}\n"})
            messages.append({"role": "assistant", "content": code_str})
            messages.append({"role": "user", "content": f"Execution failed with traceback:\n{result['traceback']}\nEnsure you strictly apply the df.columns defensive sanitization and avoid import requests. Fix the code."})
            
        if attempt == MAX_RETRIES - 1:
            raise RuntimeError("Self-healing loop exhausted (3/3 attempts failed). Unrecoverable code syntax or logic error.")
            
    return state