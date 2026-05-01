# 10. Quality Requirements

This chapter defines specific, measurable quality scenarios to ensure VMG MATE meets its business objectives.

## 10.1 Quality Tree

- **Correctness:** Accuracy, Hallucination Defense.
- **Auditability:** Explainability, Regulatory Compliance.
- **Portability:** Data Sovereignty, VPS Readiness.
- **Maintainability:** Agent-First, One-Man Operation.

## 10.2 Quality Scenarios

| ID | Scenario | Stimulus | Response | Measure |
| :--- | :--- | :--- | :--- | :--- |
| **Q-01** | **Auditability** | A VMG Admin or Regulator requests the reasoning behind a specific AI response. | The system retrieves the exact `agent_trace` and its constituent `agent_spans`. | Access to full reasoning trace (including raw context) in **< 30 seconds**. |
| **Q-05** | **Tamper-Evidence** | An attacker with database access modifies a retrieved result in a past span to cover a mistake. | The regulator runs the verification tool on the modified `agent_span`. | Verification fails with a **"Bad Signature"** error; the hash chain is broken. |
| **Q-02** | **Portability** | Management decides to move data from Singapore to a Vietnamese VPS. | One-man operator executes containerized deployment and DB migration. | System (App + Schema) deployable to new VPS in **< 4 hours** with config-only changes. |
| **Q-03** | **Accuracy** | LLM generates an answer contradicting the provided knowledge evidence. | `Meta-Grader` node detects low-fidelity match and triggers fallback/correction. | "Knowledge Accuracy Rate" (verified by HITL samples) **> 98%** for core policies. |
| **Q-04** | **Stability** | A sudden surge in Zalo messages occurs (e.g., during an enrollment campaign). | The webhook handler processes events asynchronously without dropping messages. | 100% message capture rate; UI remains responsive under load. |
