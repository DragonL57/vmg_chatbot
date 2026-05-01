# 2. Architecture Constraints

## 2.1 Organizational Constraints

| Constraint | Background / Motivation |
| :--- | :--- |
| **One-Man Operation** | The system must be maintainable by a single person. This prioritizes high automation, managed services (initially), and self-documenting code. |
| **Agent-First Engineering** | Zero manually-written code enters the repository. All changes must be executable by AI Agents to ensure maintainability without a large engineering team. |
| **Lean Operations** | Development must remain efficient and focused on core value. |

## 2.2 Technical Constraints

| Constraint | Background / Motivation |
| :--- | :--- |
| **Data Residency (Vietnam)** | To comply with Law 91/2025/QH15, the architecture must support a transition from Singapore-based cloud services (Supabase/Qdrant Cloud) to servers physically located in Vietnam. |
| **Clean Architecture** | Mandated to ensure decoupling of business logic from infrastructure. |
| **Next.js 16 / React 19** | Fixed frontend stack for performance and modern primitives. |
| **LangGraph Orchestration** | Primary framework for managing complex agentic state machines. |
| **Cloud-to-Local Path** | Architecture must allow for future migration to on-premise hosting (Docker readiness). |

## 2.3 Legal Constraints

| Constraint | Background / Motivation |
| :--- | :--- |
| **VN Privacy Law (91/2025/QH15)** | Strict requirements for personal data protection and data sovereignty. |
| **VN AI Law (134/2025/QH15)** | Regulatory framework for AI transparency (Explainability) and accountability. |
