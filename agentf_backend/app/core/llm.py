from typing import Callable, Optional
from openai import OpenAI
from app.core.config import settings

def get_llm_client(model_id: str) -> OpenAI:
    groq_models = ["gpt-oss-120b", "gpt-oss-20b", "qwen/qwen3-32b", "qwen/qwen3.6-27b", "llama-4-scout"]
    
    if model_id in groq_models:
        return OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=settings.GROQ_API_KEY,
            timeout=60.0
        )
    elif "qwen" in model_id.lower() and model_id not in groq_models:
        return OpenAI(
            base_url=settings.OPENAI_QWEN_ENDPOINT or "https://ws-6avfe6m7o2twqw9n.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
            api_key=settings.QWEN_API_KEY,
            timeout=60.0
        )
    else:
        return OpenAI(
            base_url=settings.DEEPSEEK_BASE_URL or "https://api.deepseek.com",
            api_key=settings.DEEPSEEK_API_KEY,
            timeout=60.0
        )

def _stream_llm(messages: list[dict], model_id: str, kwargs: dict, on_token_chunk: Optional[Callable[[str, str], None]]) -> str:
    client = get_llm_client(model_id)
    completion = client.chat.completions.create(**kwargs, messages=messages, stream=True)
    
    full_content = ""
    for chunk in completion:
        if not chunk.choices:
            continue
            
        delta = chunk.choices[0].delta
        
        reasoning = getattr(delta, "reasoning_content", None)
        if reasoning:
            if on_token_chunk:
                on_token_chunk("thinking", reasoning)
                
        content = getattr(delta, "content", None)
        if content:
            full_content += content
            if on_token_chunk:
                on_token_chunk("output", content)
                
    return full_content

def call_llm_json(messages: list[dict], model_id: str = "deepseek-v4-pro", on_token_chunk: Optional[Callable[[str, str], None]] = None) -> str:
    kwargs = {
        "model": model_id,
        "temperature": 0.1,
        "top_p": 0.95,
        "max_tokens": 8192,
    }
    
    # Qwen models on Groq/Aliyun might not natively support json_object in the exact same way
    # but we can try passing it. If it fails, fallback. Usually OpenAI compatible supports it.
    kwargs["response_format"] = {"type": "json_object"}
    
    if "deepseek" in model_id.lower():
        kwargs["extra_body"] = {"thinking": {"type": "enabled"}}
        kwargs["reasoning_effort"] = "high"
        
    return _stream_llm(messages, model_id, kwargs, on_token_chunk)

def call_llm_text(messages: list[dict], model_id: str = "deepseek-v4-pro", on_token_chunk: Optional[Callable[[str, str], None]] = None) -> str:
    kwargs = {
        "model": model_id,
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 8192,
    }
    if "deepseek" in model_id.lower():
        kwargs["extra_body"] = {"thinking": {"type": "enabled"}}
        kwargs["reasoning_effort"] = "high"
        
    return _stream_llm(messages, model_id, kwargs, on_token_chunk)
