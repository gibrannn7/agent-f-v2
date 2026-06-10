# AGENT-F: Enterprise Financial Orchestration Matrix

AGENT-F is a high-performance, multi-tenant financial orchestration matrix. It utilizes a multi-agent AI framework (powered by DeepSeek v4 via Nvidia NIM) mapped strictly into a secure Python 3.12/FastAPI execution layer. The frontend is delivered through a modern Next.js 16.2.7 client integrated deeply with Supabase authentication and Tailwind CSS 4 Radix UI primitives.

## 🚀 Key Architectural Features

- **Multi-Agent Orchestration**:
  - **Agent 1 (Metadata Explorer)**: Enforces rigid Pydantic JSON schemas, transforming unstructured enterprise CSV/XLSX payloads into standardized internal semantic matrices.
  - **Agent 2 (Dynamic Code Engine)**: A sophisticated sandbox executor. Generates pure Python payload structures dynamically, executing them within isolated 30-second bounded constraints. Employs a deterministic 3-cycle self-healing loop.
  - **Agent 3 (Financial Auditor)**: Grounded firmly as an analytical CFO. Extracts narrative synthesis and critical financial health boundaries (CAGR, DuPont, Altman Z-Score) purely from the `AgentFSharedState`, bypassing native LLM mathematical limitations.
  
- **Enterprise-Grade Backend**:
  - Built on **FastAPI** leveraging asynchronous PostgreSQL connectivity (`asyncpg`, `sqlalchemy`).
  - Seamlessly delegates heavy analytical loops into non-blocking `BackgroundTasks` delivering immediate `HTTP 202 Accepted` tracking outputs to prevent gateway timeouts.
  - Secures tenant context boundaries completely statelessly via `python-jose` decoding Supabase JWTs instantaneously with 0ms network latency.

- **Next.js 16.2.7 Workspace**:
  - Engineered with **React 19 Server Components** and customized **Shadcn UI** primitives mapped via the Nova-Geist styling preset.
  - Implements an asynchronous 3-second client-side polling tracker targeting `/api/v1/workspace/status/{session_id}`.
  - Fluid drop-zone interfaces specifically mapped for simultaneous data ingestion over robust proxy rewriting bounds minimizing CORS leakage.

## 📁 System Architecture Overview

```text
agent-f/
├── agentf_frontend/             # Next.js 16.2.7 Client UI
│   ├── app/                     # React Server Components & Workspace Layouts
│   ├── components/workspace/    # Shadcn Interactive Analytics Dashboards
│   ├── lib/                     # Supabase Auth Guards & JWT interceptors
│   └── next.config.ts           # Secure API Rewrite Configurations
│
├── agentf_backend/              # FastAPI Python 3.12 Backend Server
│   ├── app/agents/              # Agent Logic (Metadata, Code Engine, Auditor)
│   ├── app/api/                 # Endpoint Routers (Auth, Pipeline, Workspace)
│   ├── app/core/                # Security Sandbox & LLM Client Factories
│   ├── app/services/            # Async SQLAlchemy / Supabase Drivers
│   └── tests/                   # End-to-End Execution Traceability Suite
│
└── .env.example                 # Environment Variable Templates
```

## 🛠 Prerequisites

- **Python 3.12** configured locally with `poetry`.
- **Node.js v20+** configured with `npm`.
- A fully provisioned **Supabase** instance (Auth and Postgres).
- A valid **Nvidia NIM API Key** targeting `deepseek-v4-pro`.

## ⚙️ Initializing the Environment

1. **Environment Initialization:**
   Rename `.env.example` to `.env` and inject your exact Supabase and DeepSeek API credentials.

2. **Backend Startup:**
   ```bash
   cd agentf_backend
   poetry install
   poetry run uvicorn main:app --reload --port 8000
   ```

3. **Frontend Startup:**
   ```bash
   cd agentf_frontend
   npm install
   npm run dev
   ```

## 🔒 Security Posture & Guardrails

This project strictly adheres to a set of unyielding enterprise constraints:
- **No Emojis Policy**: Absolutely no emojis are permitted across the codebase, components, terminal logs, UI elements, or generated AI narratives.
- **Stateless Execution Constraints**: The Code Engine natively purges execution files. Payloads run natively under hardcoded timeout subprocess bounds ensuring the orchestrator remains completely stable under adversarial LLM hallucinations.
- **Separation of Concerns**: Mathematical inferences are fully executed structurally via the generated sandbox codebase. LLMs are completely disabled from guessing calculation outputs.

## 📄 License

Internal Enterprise Proprietary Matrix. Do not distribute.
