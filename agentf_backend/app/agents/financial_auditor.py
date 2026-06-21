import json
from app.core.llm import call_llm_text
from app.agents.state import AgentFSharedState

def generate_auditor_narrative(state: AgentFSharedState) -> AgentFSharedState:
    custom_prompt_context = state.user_custom_prompt if state.user_custom_prompt else "Provide a standard comprehensive executive briefing."
    news_context = state.news_context if state.news_context else "No external macroeconomic events provided."
    user_role = state.user_role if state.user_role else "Elite Corporate CFO"
    analysis_goal = state.analysis_goal if state.analysis_goal else "Exhaustive, highly structured, data-backed strategic narrative"
    
    system_prompt = f"""
    You are acting as the {user_role} for AGENT-F.
    Your primary analysis goal is: {analysis_goal}.
    Write a highly structured, data-backed strategic narrative that satisfies this goal. You must be aggressively critical of operational risks and base all insights entirely on the provided Mathematical Payload.
    
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
    
    state.stream_queue.append({"type": "output", "token": f"\n\n[SYSTEM]: Initiating Agent 3 CFO Synthesis Engine...\n"})
    
    narrative_output = call_llm_text(
        messages=messages,
        model_id=state.engine_selection,
        on_token_chunk=lambda type_, token: state.stream_queue.append({
            "type": type_,
            "token": token
        })
    )
    
    # Critical Fix: Lock the narrative output into the state
    state.cfo_narrative = narrative_output
    
    return state
