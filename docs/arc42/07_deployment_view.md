# 7. Deployment View

Describes the physical environment where the system is executed.

## 7.1 Current Infrastructure (Public Cloud)

VMG MATE is currently deployed as a serverless application to minimize operational overhead.

| Node | Technology | Description |
| :--- | :--- | :--- |
| **Web Server** | Vercel | Hosts the Next.js 16 application and API routes using Edge/Serverless functions. |
| **Database** | Supabase | Managed PostgreSQL. Uses `@supabase/ssr` for auth and `drizzle-orm` for typed queries. |
| **Vector Database** | Qdrant Cloud | Uses `intfloat/multilingual-e5-small` model (384 dimensions) for high-performance cross-lingual retrieval. |
| **Intelligence** | Inception Lab / OpenAI | External LLM APIs for reasoning, with token usage tracked in `agent_spans`. |

## 7.2 Target Infrastructure (Vietnamese VPS / On-Premise)

To satisfy **Data Sovereignty (Law 91/2025)** and long-term cost goals, the system is designed to migrate to local VMG infrastructure or a Vietnamese VPS provider.

| Node | Technology | Migration Strategy |
| :--- | :--- | :--- |
| **Application** | Ubuntu + Docker | Containerize the Next.js app. Use Nginx as a reverse proxy for Zalo webhooks. |
| **Database** | Self-hosted Postgres | Migration from Supabase using `pg_dump`. |
| **Vector Store** | Local Qdrant Docker | Migration via snapshot/export from Qdrant Cloud. |
| **Ingress** | Cloudflare / Nginx | Manage SSL and protection for Vietnamese IP ranges. |
| **Models** | Local LLMs (Ollama) | Transition reasoning nodes to local inference servers (e.g., Llama 3 or Qwen) to eliminate data export risks. |
