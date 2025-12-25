# Initial Concept

URASys: A Multi-Service Specialist Platform for Educational Consultation.

This system is a specialized agent-based framework designed for VMG Group to provide precise, context-aware answers for English learning (ESL) and Study Abroad consultation. It uses a parallel specialist architecture to handle complex discovery and lead generation.

**Core Principles:**
*   **Just Enough Principle:** Prioritizes understanding before answering.
*   **Unified Handling:** Addresses standard, ambiguous, and unanswerable questions in a single framework.
*   **Dual Retrieval:** Combines Document Retrieval (hybrid chunk-and-title) and FAQ Retrieval (ask-and-augment).
*   **Interactive Clarification:** Engages the user when intent is uncertain.
*   **Explicit Unanswerable Handling:** Signals when no answer is found to avoid hallucination.

**Key Components:**
*   **Safety Officer:** Ensures all interactions adhere to institutional policies.
*   **Profiler:** Handles deep KYC extraction and lead generation (incremental).
*   **Strategist:** Coordinates between Static Knowledge, Vector RAG, and External APIs.
*   **Master Agent:** The final human-simulated interface (Mentor/Consultant persona).
*   **Two-Phase Indexing:** Transforms raw documents into evidence chunks and a QA layer.

---

# Product Guide: URASys (Unified Retrieval Agent-Based System)

## 1. Product Vision
URASys is a multi-service consultation platform designed for VMG to provide high-quality advisory services. It integrates domain-specific intelligence for English (VMG English) and Study Abroad (VMG Global Pathway) into a unified, mobile-first interface.

## 2. Target Audience
*   **Prospective Students:** Inquiring about course offerings, tuition fees, and admission requirements.
*   **Study Abroad Aspirants:** Seeking detailed school data, scholarship paths, and visa procedures.
*   **Current Students:** Seeking clarification on academic policies, course prerequisites, and administrative procedures.
*   **Administrative Staff:** Accessing internal regulations and standard operating procedures quickly and reliably.

## 3. Core Features (MVP)
*   **Sidebar Navigation:** Seamlessly switch between VMG English and VMG Global Pathway services.
*   **Parallel Specialist Orchestration:** Concurrent execution of Safety, Profiling, and Planning agents for low-latency responses.
*   **Dual-Phase Retrieval:**
    *   **Document Search:** Hybrid (semantic and lexical) search over structured administrative and academic documents.
    *   **FAQ Search:** High-precision lookup over an augmented, query-resilient FAQ repository.
*   **Conversational KYC Discovery:** Natural, 5-step consulting flow to extract student profile data (Intent, Budget, Location, etc.).
*   **Interactive Clarification:** A proactive feedback loop that identifies underspecified or vague queries and asks the user for missing details before attempting to answer.
*   **External API Integration:** Real-time data lookup from the U.S. College Scorecard API for academic school data.
*   **Explicit Unanswerable Signaling:** Avoids hallucination by clearly stating when no relevant information exists in the knowledge base.
*   **Cross-Lingual Support:** Full functionality in both Vietnamese and English, handling the nuances and syntactic variations of both languages.
*   **Web-Based Chat Interface:** A modern, accessible web UI built with Next.js for users to interact with the URASys agent.

## 4. Technical Constraints & Preferences
*   **Hosting:** Web application built with **Next.js** and deployed on **Vercel**.
*   **LLM Provider:** **Poe API** (OpenAI-compatible) using `grok-4.1-fast-non-reasoning` for inference.
*   **Embedding Provider:** **Mistral AI** (`mistral-embed`) for high-performance 1024D text embeddings.

## 5. Knowledge Sources
*   **Academic Course Catalogs:** Detailed information on prerequisites, course content, and learning paths.
*   **Administrative Policy Documents:** Official records on tuition, enrollment rules, and institutional regulations.
*   **Existing FAQ Repositories:** Historical data and curated Q&A pairs used to bootstrap the system's "Ask-and-Augment" indexing.
*   **U.S. College Scorecard:** External real-time database for higher education metrics.

## 6. Success Metrics
*   **Factual Accuracy:** High performance on single-hop and multi-hop reasoning tasks.
*   **Ambiguity Resolution:** Successful identification and clarification of underspecified queries.
*   **User Trust:** High scores in human evaluations for clarity, reliability, and helpfulness.
