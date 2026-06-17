import os
import httpx
import re

async def trigger_news_check(user_prompt: str, ui_toggle_on: bool) -> bool:
    explicit_triggers = [r"ambil berita", r"cari sentimen", r"analisis kebijakan"]
    if ui_toggle_on:
        return True
    
    prompt_lower = user_prompt.lower() if user_prompt else ""
    if any(re.search(trigger, prompt_lower) for trigger in explicit_triggers):
        return True
        
    return False

async def fetch_financial_news(keywords: list[str]) -> str:
    """
    Fetches compressed top macroeconomic headlines based on strict keyword
    triggers to ensure token efficiency and exact context relevance.
    """
    api_key = os.environ.get("NEWS_API")
    if not api_key:
        return ""

    if not keywords:
        return "No relevant macroeconomic news found."

    query = " OR ".join(keywords)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "sortBy": "popularity",
                    "apiKey": api_key,
                    "pageSize": 5, 
                    "language": "en"
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            
            articles = data.get("articles", [])
            if not articles:
                return "No relevant macroeconomic news found."
                
            summary_lines = []
            for idx, article in enumerate(articles):
                source = article.get("source", {}).get("name", "Unknown")
                title = article.get("title", "")
                desc = article.get("description", "")
                if title:
                    summary_lines.append(f"[{idx+1}] {source}: {title} - {desc}")
                    
            return "\n".join(summary_lines)
    except Exception as e:
        print(f"[NEWS API ERROR] Failed to fetch macro news payload: {str(e)}")
        return ""
