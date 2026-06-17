from typing import Callable, Optional
from openai import OpenAI
from app.core.config import settings

def get_llm_client() -> OpenAI:
    return OpenAI(
        base_url=settings.DEEPSEEK_BASE_URL or "https://api.deepseek.com",
        api_key=settings.DEEPSEEK_API_KEY,
        timeout=60.0
    )

def _stream_llm(messages: list[dict], kwargs: dict, on_token_chunk: Optional[Callable[[str, str], None]]) -> str:
    client = get_llm_client()
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

def call_deepseek_json(messages: list[dict], on_token_chunk: Optional[Callable[[str, str], None]] = None) -> str:
    kwargs = {
        "model": "deepseek-v4-pro",
        "temperature": 0.1,
        "top_p": 0.95,
        "max_tokens": 8192,
        "response_format": {"type": "json_object"},
        "extra_body": {"thinking": {"type": "enabled"}},
        "reasoning_effort": "high"
    }
    # Some providers throw errors if json_object is used with stream=True. If so, remove json_object.
    # Assuming DeepSeek supports it.
    return _stream_llm(messages, kwargs, on_token_chunk)

def call_deepseek_text(messages: list[dict], on_token_chunk: Optional[Callable[[str, str], None]] = None) -> str:
    kwargs = {
        "model": "deepseek-v4-pro",
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 8192,
        "extra_body": {"thinking": {"type": "enabled"}},
        "reasoning_effort": "high"
    }
    return _stream_llm(messages, kwargs, on_token_chunk)
