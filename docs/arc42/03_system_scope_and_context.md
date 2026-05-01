# 3. System Scope and Context

System Scope and Context clarifies the boundaries of VMG MATE and its interaction with the environment.

## 3.1 Business Context

VMG MATE serves as the central orchestration hub for internal knowledge and external communication.

| Communication Partner | Responsibility |
| :--- | :--- |
| **VMG Staff** | Interact with MATE for knowledge retrieval, task automation, and profile management. |
| **VMG Admins** | Manage knowledge silos, monitor system health (traces), and ingest data. |
| **Social Leads (Zalo/FB)** | Potential leads and customers interacting via social channels. |
| **Zalo API** | External messaging platform. MATE integrates via **Direct Webhooks** for lean, low-latency communication. |
| **Google Workspace** | Integration for Gmail, Calendar, and document reading (Future). |

## 3.2 Technical Context (C4 Context Diagram)

The following diagram illustrates the technical boundaries and external system dependencies.

```plantuml
@startuml
!include <C4/C4_Context>

title System Context for VMG MATE

Person(staff, "VMG Staff", "Internal users seeking assistance")
Person(admin, "VMG Admin", "Content and system managers")
Person(lead, "Social Lead", "External customer via Zalo/FB")

System(mate, "VMG MATE", "Agentic RAG Ecosystem")

System_Ext(zalo, "Zalo API", "Social messaging via direct webhooks")
System_Ext(supabase, "Supabase", "Auth, Postgres, and Storage")
System_Ext(qdrant, "Qdrant Cloud", "Vector storage and search")
System_Ext(llm, "LLM APIs", "Intelligence (OpenAI, Inception Lab)")
System_Ext(google, "Google Workspace", "Auth and productivity data")

Rel(staff, mate, "Asks questions, manages history")
Rel(admin, mate, "Uploads files, reviews traces")
Rel(lead, zalo, "Sends message")
Rel(zalo, mate, "Webhook: Sends event data")
Rel(mate, zalo, "API: Sends reply")
Rel(mate, supabase, "Queries data, verifies JWT")
Rel(mate, qdrant, "Retrieves vector context")
Rel(mate, llm, "Requests reasoning/synthesis")
Rel(mate, google, "OAuth and data sync")
@enduml
```

## 3.3 Deployment Context & Portability

To ensure transition readiness for **Vietnamese Servers (VPS/Cloud)**:
- **Application:** Designed to be containerized via **Docker**.
- **State:** Decoupled from specific cloud providers; uses standard PostgreSQL and Qdrant protocols.
- **Entry:** Webhook endpoints are standard HTTP/Zod-validated to ensure compatibility with generic VPS hosting.
