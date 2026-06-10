from openai import OpenAI
from app.core.config import settings

def get_llm_client() -> OpenAI:
    return OpenAI(
        base_url=settings.DEEPSEEK_BASE_URL or "https://integrate.api.nvidia.com/v1",
        api_key=settings.DEEPSEEK_API_KEY
    )

def call_deepseek_json(messages: list[dict]) -> str:
    client = get_llm_client()
    completion = client.chat.completions.create(
        model="deepseek-ai/deepseek-v4-pro",
        messages=messages,
        temperature=0.1,
        top_p=0.95,
        max_tokens=8192,
        response_format={"type": "json_object"},
        extra_body={"chat_template_kwargs": {"thinking": False}},
        stream=False
    )
    return completion.choices[0].message.content or ""

def call_deepseek_text(messages: list[dict]) -> str:
    client = get_llm_client()
    completion = client.chat.completions.create(
        model="deepseek-ai/deepseek-v4-pro",
        messages=messages,
        temperature=0.7,
        top_p=0.95,
        max_tokens=8192,
        extra_body={"chat_template_kwargs": {"thinking": False}},
        stream=False
    )
    return completion.choices[0].message.content or ""
