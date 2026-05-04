# 12. Glossary

This chapter defines key terms and acronyms used in the VMG MATE ecosystem.

| Term | Definition |
| :--- | :--- |
| **Model Context Protocol (MCP)** | An open standard that provides a standardized way for applications to provide context and tools to LLMs. |
| **MCP Host** | An LLM application (like VMG MATE) that initiates connections to MCP servers. |
| **MCP Server** | A lightweight program that exposes Tools, Resources, and Prompts to an MCP Host. |
| **Tool Use Design Pattern** | A design pattern that gives LLMs the ability to interact with external code or APIs through model-generated function calls. |
| **Tool Schema** | A machine-readable definition (usually JSON/Zod) of a tool's purpose, input parameters, and expected outputs, allowing the model to understand and invoke the tool correctly. |
| **Agentic RAG** | An emerging AI paradigm where LLMs autonomously plan their next steps while pulling information from external sources. It utilizes an iterative "Maker-Checker" loop and "owns" its reasoning process to ensure high-quality, grounded results. |
| **Query Reconstruction** | A technique used to resolve pronouns, ellipsis, and incomplete follow-up questions in chat history. Produces self-contained queries from conversation context. Previously referred to as "RECAP" in older docs. |
| **URASys** | **U**niversal **R**etrieval & **A**ugmentation **S**ystem. Our internal framework for hierarchical indexing (Parent/Child chunking). |
| **StSQA** | **S**tructured **St**ance **Q**uality **A**ssessment. A prompt engineering technique using a single curated reasoning example to guide LLM output. Based on Zhang et al. (2023b). |
| **Meta-Grading** | A reflection process where the AI evaluates the quality and relevance of retrieved evidence before using it to generate an answer. |
| **"Glass Box"** | An architectural philosophy prioritizing observability and explainability of the AI's internal reasoning process. |
| **Clean Architecture** | A design pattern that separates code into layers (Domain, Application, Infrastructure) to minimize dependencies on external frameworks. |
| **HITL** | **H**uman-**i**n-the-**L**oop. Specialist evaluators who review and correct AI outputs to improve the knowledge base. |
| **Zalo Webhook** | An HTTP callback used by Zalo to send real-time message events to the MATE platform. |
