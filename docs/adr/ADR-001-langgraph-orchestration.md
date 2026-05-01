# ADR-001: Selecting LangGraph for Agentic Orchestration

## Metadata
- **Date:** 2026-04-23
- **Author:** Gemini CLI
- **Status:** Final

## Problem Description and Context
The system requires a complex Retrieval-Augmented Generation (RAG) flow that includes self-correction loops, adaptive routing, and multi-step reasoning. A simple sequential chain (Baseline) is insufficient because it cannot easily handle cycles (e.g., rewriting a query and searching again) or manage shared state across many disparate nodes.

## Preliminary Title
**Selecting an orchestration framework for agentic workflows**

## Alternative Evaluation (Pugh Matrix)

| Criterion | Baseline (Sequential Chain) | Alternative 1 (Custom State Machine) | Alternative 2 (LangGraph) |
| :--- | :--- | :--- | :--- |
| **Flexibility (Cycles)** | 0 | +1 | +1 |
| **State Management** | 0 | +1 | +1 |
| **Developer Velocity** | 0 | -1 | +1 |
| **Observability** | 0 | -1 | +1 |
| **Total Score** | 0 | 0 | **+4** |

### Why others were rejected:
- **Baseline:** Cannot handle the "Corrective" part of our RAG strategy (loops).
- **Custom State Machine:** Re-inventing the wheel for observability (traces, state visualization) would be too costly in terms of "lean" operations.

## Decision
We chose **LangGraph (StateGraph)** because it natively supports cycles, provides a robust shared state pattern, and integrates seamlessly with LangSmith for the "Glass Box" observability mandate.

## Consequences

### Positive Effects
- Clear visualization of the reasoning graph.
- Easy to add new "Worker" nodes without breaking the orchestration logic.
- Built-in support for "Human-in-the-loop" breakpoints.

### Risks
- Higher learning curve for new developers (or future agents).
- Potential for complex state bugs if not strictly typed with Zod.

### Technical Debt
- Tight coupling to the LangChain ecosystem (partially mitigated by the Application layer abstraction).

---
## Final Title
**Selecting an orchestration framework for agentic workflows: LangGraph**
