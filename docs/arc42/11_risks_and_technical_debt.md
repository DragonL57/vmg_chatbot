# 11. Risks and Technical Debt

This chapter identifies the architectural risks and technical debt that must be managed as the system moves toward 2026.

## 11.1 Technical Debt (Compliance Gaps)

| Debt | Description | Impact | Priority |
| :--- | :--- | :--- | :--- |
| **Unsigned Traces** | `agent_traces` and `spans` are currently stored as plain JSON without cryptographic signatures or hash chaining. | High (Audit Integrity Risk) | High |
| **Missing Consent Flow** | The current `login` page does not have the mandatory explicit, non-pre-ticked consent checkbox required by Law 91/2025/QH15. | High (Illegal Processing) | **Critical** |
| **Data Residency** | Core data is stored in Singapore (Supabase) and Global Qdrant Cloud. Law 91 requires "Sensitive Data" to reside in Vietnam. | High (Sovereignty Risk) | **Critical** |
| **AI Auditability Export** | `agent_traces` exist but there is no mechanism to export a "Compliance Report" for Article 21 of Law 134/2025/QH15. | Medium (Audit Failure) | High |
| **Privacy Policy Linkage** | No link to a detailed, compliant Privacy Policy on the login/onboarding screen. | Low (Transparency Risk) | High |

## 11.2 Risks

| Risk | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Vendor Lock-in** | Dependency on Supabase-specific features (Auth, SSR) makes Vietnamese VPS migration difficult. | Maintain strict Clean Architecture; isolate Supabase logic in adapters. |
| **One-Man Burnout** | Reliance on a single operator for maintenance and compliance updates. | Maximize "Agent-First" automation; maintain high documentation integrity. |
| **Model Drift/Safety** | AI generating harmful or biased content as the system scales to Omnichannel. | Implement periodic Red-Teaming and HITL sampling in Chapter 5. |
