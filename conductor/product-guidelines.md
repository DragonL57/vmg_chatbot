# Product Guidelines: URASys (VMG English Center)

## 1. Brand Identity & Visual Design
*   **Color Palette:** The primary colors are **Red and White**, reflecting VMG's identity of educational passion and knowledge.
*   **Symbolism:** Incorporate stylized elements of a **pen and a book** in the UI (e.g., as part of the loading state or header) to symbolize literacy and educational heat.
*   **Layout:** A professional, institutional layout using serif fonts for body text to maintain an academic feel, with structured components for clear information hierarchy.
*   **Rendering:** Full markdown support for answers to allow for tables, lists, and bold text to emphasize critical policy details.

## 2. Voice & Tone
*   **Personality:** **Professional & Academic.** The agent should speak with the precision, formality, and structure of an official VMG academic advisor.
*   **Prose Style:** Use clear, grammatically correct, and authoritative language. Avoid slang or overly casual phrasing.
*   **Clarity over Brevity:** While efficiency is important, prioritize providing a complete and accurate explanation of policies to ensure students are fully informed.

## 3. Interaction Patterns
*   **Interactive Clarification:**
    *   When a query is ambiguous, use **Open-Ended Queries**.
    *   Briefly explain *why* the question needs more context and guide the user on what details to provide (e.g., "To provide the correct tuition rate, could you please specify if you are inquiring about a standard course or a high-quality program?").
*   **Handling Unanswerable Queries:**
    *   **Explicit Admission:** If the information is missing from the indexed documents, state this clearly to avoid speculation (e.g., "I apologize, but my current knowledge base does not contain information regarding [topic].").
*   **Multi-language UX:**
    *   **Automatic Detection:** The system leverages the multilingual capabilities of the underlying LLM to detect the user's language (Vietnamese or English) and respond consistently in that same language.

## 4. User Experience (UX) Principles
*   **Transparency:** Always ground answers in retrieved evidence. If multiple sources are used, synthesize them coherently.
*   **Trustworthiness:** Prioritize accuracy and factual grounding over "creativity." It is better to clarify or admit ignorance than to hallucinate a policy.
*   **Accessibility:** Ensure the web interface is accessible and easy to navigate for both high school seniors and existing university students.
