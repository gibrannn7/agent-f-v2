from dotenv import load_dotenv
from groq import Groq

# Load .env
load_dotenv()

# Otomatis ambil GROQ_API_KEY dari environment
client = Groq()

completion = client.chat.completions.create(
    model="qwen/qwen3.6-27b",
    messages=[
        {
            "role": "user",
            "content": "Jelaskan apa itu FastAPI."
        }
    ],
    temperature=0.6,
    max_completion_tokens=4096,
    top_p=0.95,
    reasoning_effort="default",
    stream=True,
)

for chunk in completion:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")