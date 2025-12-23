# Initial Concept

When in Doubt, Ask First: A Unified Retrieval Agent-Based System for Ambiguous and Unanswerable Question Answering (URASys)

This system is a QA framework designed for an English center (or similar educational institutions) to handle high-stakes, closed-domain settings. It addresses challenges like hallucinations and limited handling of vague queries, especially in Vietnamese and English.

**Core Principles:**
*   **Just Enough Principle:** Prioritizes understanding before answering.
*   **Unified Handling:** Addresses standard, ambiguous, and unanswerable questions in a single framework.
*   **Dual Retrieval:** Combines Document Retrieval (hybrid chunk-and-title) and FAQ Retrieval (ask-and-augment).
*   **Interactive Clarification:** Engages the user when intent is uncertain.
*   **Explicit Unanswerable Handling:** Signals when no answer is found to avoid hallucination.

**Key Components:**
*   **Manager Agent:** Decomposes queries and coordinates retrieval.
*   **Document Retrieval Agent:** Searches structured documents.
*   **FAQ Retrieval Agent:** Searches an augmented FAQ repository.
*   **Two-Phase Indexing:** Transforms raw documents into evidence chunks and a QA layer.

**Goal:** To provide precise, context-aware answers for tuition, prerequisites, and policies, improving factual accuracy and user trust.

---

# Product Guide: URASys (Unified Retrieval Agent-Based System)

## 1. Product Vision
URASys is a specialized Question Answering (QA) system designed for an English center to provide precise, context-aware, and trustworthy information. It addresses the common pitfalls of standard LLMs—such as hallucinations and failure to handle ambiguous queries—by prioritizing understanding before generation. The system operates under the "Just Enough" principle, ensuring that answers are only provided when grounded in sufficient and consistent evidence.

## 2. Target Audience
*   **Prospective Students:** Inquiring about course offerings, tuition fees, and admission requirements.
*   **Current Students:** Seeking clarification on academic policies, course prerequisites, and administrative procedures.
*   **Administrative Staff:** Accessing internal regulations and standard operating procedures quickly and reliably.

## 3. Core Features (MVP)
*   **Unified Retrieval Agent Architecture:** A central Manager Agent coordinating specialized FAQ and Document Search Agents.
*   **Dual-Phase Retrieval:**
    *   **Document Search:** Hybrid (semantic and lexical) search over structured administrative and academic documents.
    *   **FAQ Search:** High-precision lookup over an augmented, query-resilient FAQ repository.
*   **Interactive Clarification:** A proactive feedback loop that identifies underspecified or vague queries and asks the user for missing details before attempting to answer.
*   **Explicit Unanswerable Signaling:** Avoids hallucination by clearly stating when no relevant information exists in the knowledge base.
*   **Cross-Lingual Support:** Full functionality in both Vietnamese and English, handling the nuances and syntactic variations of both languages.
*   **Web-Based Chat Interface:** A modern, accessible web UI built with Next.js for users to interact with the URASys agent.

## 4. Technical Constraints & Preferences
*   **Hosting:** Web application built with **Next.js** and deployed on **Vercel**.
*   **LLM Provider:** **Poe API** (OpenAI-compatible) using `grok-4.1-fast-non-reasoning` for inference.
*   **Embedding Provider:** **Google Gemini API** (`gemini-embedding-001`) for text embeddings to power semantic search and RAG.

## 5. Knowledge Sources
*   **Academic Course Catalogs:** Detailed information on prerequisites, course content, and learning paths.
*   **Administrative Policy Documents:** Official records on tuition, enrollment rules, and institutional regulations.
*   **Existing FAQ Repositories:** Historical data and curated Q&A pairs used to bootstrap the system's "Ask-and-Augment" indexing.

## 6. Success Metrics
*   **Factual Accuracy:** High performance on single-hop and multi-hop reasoning tasks.
*   **Ambiguity Resolution:** Successful identification and clarification of underspecified queries.
*   **User Trust:** High scores in human evaluations for clarity, reliability, and helpfulness.