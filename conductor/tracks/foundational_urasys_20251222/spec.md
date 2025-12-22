# Specification: Foundational URASys Infrastructure

## Overview
This track focuses on establishing the core architecture of URASys as described in the anonymous ACL submission. The goal is to set up the bilingual (Vietnamese/English) agent-based QA system with a dual-retrieval pipeline.

## Functional Requirements
1. **Multi-Agent Core:**
   - **Manager Agent:** Orchestrates query decomposition and retrieval delegation.
   - **Document Search Agent:** Hybrid semantic/lexical search over rewritten chunks.
   - **FAQ Search Agent:** Precision lookup over paraphrased FAQ pairs.
2. **Interactive Clarification:**
   - Detect ambiguous intent and generate follow-up questions.
3. **Explicit No-Answer:**
   - Gracefully signal when evidence is insufficient to avoid hallucination.
4. **FastAPI Backend:**
   - Serverless-ready Python API hosted on Vercel.
   - Integration with POE API (`grok-4.1-fast-non-reasoning`).
   - Integration with Gemini API (`gemini-embedding-001`).
   - Integration with Qdrant Vector DB.
5. **Next.js Frontend:**
   - VMG-branded UI (Red/White).
   - Chat interface with streaming support and markdown rendering.

## Technical Constraints
- Backend: Python/FastAPI managed by `uv`.
- Frontend: Next.js/TypeScript managed by `pnpm`.
- API: OpenAI-compatible (POE) and Google GenAI.
- Deployment: Vercel.
