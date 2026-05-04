# 11. Risks and Technical Debt

This chapter identifies the architectural risks and technical debt that must be managed as the system moves toward 2026.

## 11.1 Technical Debt (Compliance Gaps)

| Debt | Description | Impact | Priority |
| :--- | :--- | :--- | :--- |
| **Unsigned Traces** | `agent_traces` and `spans` are currently stored as plain JSON without cryptographic signatures or hash chaining. | High (Audit Integrity Risk) | High |
| **Data Residency** | Core data is stored in Singapore (Supabase) and Global Qdrant Cloud. Law 91 requires "Sensitive Data" to reside in Vietnam. | High (Sovereignty Risk) | **Critical** |
| **AI Auditability Export** | `agent_traces` exist but there is no mechanism to export a "Compliance Report" for Article 21 of Law 134/2025/QH15. | Medium (Audit Failure) | High |
| **Privacy Policy Linkage** | No link to a detailed, compliant Privacy Policy on the login/onboarding screen. | Low (Transparency Risk) | High |

### Resolved Debt (2026-05-04)

| Debt | Resolution |
| :--- | :--- |
| **Missing Consent Flow** | Consent checkbox was assessed as not required — internal enterprise tool uses employment contract as legal basis, not consent (Law 91/2025 §11). |
| **AI Disclosure** | Added "Bạn đang tương tác với trí tuệ nhân tạo" disclaimer under chat input (Law 134/2025). |
| **Data Subject Rights** | Implemented `GET /api/user/data` (export) and `DELETE /api/user/data` (anonymize) endpoints (Law 91/2025 §11). |
| **Termination Cleanup** | Created `scripts/anonymize-user.ts` for employee data deletion upon contract end (Law 91/2025). |

## 11.2 Risks

| Risk | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Vendor Lock-in** | Dependency on Supabase-specific features (Auth, SSR) makes Vietnamese VPS migration difficult. | Maintain strict Clean Architecture; isolate Supabase logic in adapters. |
| **One-Man Burnout** | Reliance on a single operator for maintenance and compliance updates. | Maximize "Agent-First" automation; maintain high documentation integrity. |
| **Model Drift/Safety** | AI generating harmful or biased content as the system scales to Omnichannel. | Implement periodic Red-Teaming and HITL sampling in Chapter 5. |
