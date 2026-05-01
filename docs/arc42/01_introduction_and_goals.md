# 1. Introduction and Goals

VMG MATE (Multi-Agent Tooling Ecosystem) is an Agentic Retrieval-Augmented Generation (RAG) platform designed as a professional digital companion for VMG English Center employees.

## 1.1 Requirements Overview

The system aims to:
- **Centralize Knowledge:** Provide a single "Glass Box" interface for fragmented internal documents (Academic, Policy, Operations).
- **Assisted Productivity:** Act as a "Co-pilot" for staff, providing real-time suggestions and retrieval for workspace tasks and social sales (Zalo/FB), without autonomous transaction finalization.
- **Explainable Reasoning:** Ensure every AI response is traceable to source evidence and reasoning steps, satisfying transparency mandates.
- **Ensure Compliance:** Adhere to Vietnamese Data Privacy (91/2025/QH15) and AI (134/2025/QH15) laws by 2026.

## 1.2 Quality Goals

| Goal | Description | Priority |
| :--- | :--- | :--- |
| **Explainability** | 100% auditability; every response must link to a reasoning trace (Law 134/2025). | High |
| **Accuracy** | Zero-tolerance for hallucinations in academic/legal contexts via Meta-Grading. | High |
| **Privacy** | Strict RLS and domain-filtering for sensitive VMG data (Law 91/2025). | High |
| **Legibility** | Architecture must be "Agent-First" and documented in Markdown for AI-native maintenance. | High |
| **Responsiveness** | Optimistic UI and low-latency streaming to ensure a "Mate" feel. | Medium |

## 1.3 Stakeholders

| Role | Name | Expectations |
| :--- | :--- | :--- |
| **Sponsor/Owner** | Võ Mai Thế Long | High-integrity, scalable solution that reduces operational costs. |
| **IT/R&D Team** | Edtech Dept | Maintainable code, robust observability, and minimal manual effort (Agent-First). |
| **Internal Users** | VMG Staff | Fast, accurate answers and seamless integration with daily tools (Google Workspace). |
| **Customers** | Students/Parents | Instant, reliable support via social messaging channels. |
| **Regulators** | VN Government | Compliance with data sovereignty and AI transparency laws. |
