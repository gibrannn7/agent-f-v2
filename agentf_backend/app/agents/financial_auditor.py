import json
from app.core.llm import call_deepseek_text
from app.agents.state import AgentFSharedState

def generate_auditor_narrative(state: AgentFSharedState) -> AgentFSharedState:
    custom_prompt_context = state.user_custom_prompt if state.user_custom_prompt else "Provide a standard comprehensive executive briefing."
    news_context = state.news_context if state.news_context else "No external macroeconomic events provided."
    
    system_prompt = f"""
    You are the Elite Corporate CFO and McKinsey Financial Partner for AGENT-F.
    Write an exhaustive, highly structured, data-backed strategic narrative. You must be aggressively critical of operational risks and base all insights entirely on the provided Mathematical Payload.
    
    You MUST adhere strictly to the following architectural layout:
    
    ### I. STRATEGIC EXECUTIVE BRIEFING (WHAT)
    High-density performance diagnosis. Contrast the calculated aggregations against enterprise performance baselines. Highlight the total scale of revenue, transaction volumes, and overall operational scale.
    
    ### II. MATHEMATICAL DRIVER & PARETO DIAGNOSTICS (WHY)
    Detail the root causes. Explicitly reference the Concentration Risk and Pareto metrics provided in the payload. Break down how volume dynamics or outlier distortions (IQR anomalies) alter the core performance vectors.
    
    ### III. RISK MATRIX & METRIC DISPERSION (SO WHAT)
    Evaluate market over-reliance and statistical volatility using the Coefficient of Variation (CV) and Standard Deviation (sigma). Translate mathematical volatility into real-world business risks (e.g., supply chain strain, currency exposure, cash flow freezing points).
    If macro economic context is available below, you MUST cross-examine the internal volatility metrics against the external macroeconomic news (e.g., connecting a high CV value with local inflation or regulatory shifts).
    
    ### IV. PRESCRIPTIVE STRATEGIC ACTION ROADMAP (NOW WHAT)
    Provide exactly 3 highly tactical, data-backed operational mandates. Each recommendation must quote the calculated metrics from the payload to prove lineage and guarantee enterprise auditability.
    
    User Custom Focus / Request Notes:
    {custom_prompt_context}
    
    External Macroeconomic Realities:
    {news_context}
    """
    
    # Filter out _charts to save tokens in the LLM payload since Agent 3 can't read base64 strings anyway
    payload_to_send = {k: v for k, v in state.analytical_data.items() if k != "_charts"}
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Aggregated Mathematical Payload:\n{json.dumps(payload_to_send)}"}
    ]
    
    def stream_callback(token_type: str, token_val: str):
        state.stream_queue.append({"type": token_type, "token": token_val})
        
    state.stream_queue.append({"type": "output", "token": f"\n\n[SYSTEM]: Initiating Agent 3 CFO Synthesis Engine...\n"})
    narrative_output = call_deepseek_text(messages, on_token_chunk=stream_callback)
    
    # Critical Fix: Lock the narrative output into the state
    state.cfo_narrative = narrative_output
    
    return state
