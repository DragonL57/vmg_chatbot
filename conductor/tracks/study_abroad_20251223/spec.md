# Specification: Study Abroad Consultation & Sidebar Navigation

## 1. Overview
The goal of this track is to expand the VMG Chatbot into a multi-service platform. We will introduce a "Study Abroad" consultation mode alongside the existing ESL mode. Users will navigate between these services via a new retractable sidebar menu. The Study Abroad agent will follow a "Conversational Discovery" pattern to collect specific KYC (Know Your Customer) data points and lead information (Phone/Zalo) for CRM integration.

## 2. Functional Requirements

### 2.1 Navigation & UI
- **Sidebar Menu:** Implement a retractable drawer/sidebar accessible from the main header.
- **Service Selection:** The sidebar will allow users to toggle between "Tư vấn Tiếng Anh (ESL)" and "Tư vấn Du học".
- **Visual Distinction:** When switching modes, the header title and greeting should update to reflect the active service.
- **Proactive Greeting:** Upon switching to "Study Abroad" for the first time in a session, the AI will proactively initiate the conversation.

### 2.2 Study Abroad Agent (Consultant Persona)
- **Identity:** A professional Study Abroad Consultant at VMG, maintaining the "human simulation" principle (no AI/Chatbot labels).
- **Knowledge Base:** Use a separate knowledge context (e.g., `data/study-abroad-overview.md`) to prevent information mixing.
- **Conversational KYC (Level 1):** The agent must naturally discover and extract the following data points during the chat:
    1. Study Abroad Intent (Timeline).
    2. Target Countries.
    3. Education Level (Primary to Post-grad).
    4. Desired Start Date.
    5. Major/Field of Interest.
    6. Main Sponsor/Funding Source.
    7. Estimated Budget.
    8. **Phone/Zalo Number (Highest Priority).**

### 2.3 CRM Integration (Mock)
- **Incremental Extraction:** The Dispatcher Agent will be updated to recognize and extract the 7 new KYC fields plus the Phone number.
- **Mock CRM Push:** Update `LeadService` to handle the new study abroad fields and log them to the console immediately upon extraction.

## 3. Technical Requirements
- **Prompt Engineering:** Create `src/prompts/study-abroad-master.ts` and `src/prompts/study-abroad-manager.ts` (or update existing manager to handle multi-domain).
- **Routing:** Update the `/api/chat` route to accept a `mode` parameter and select the appropriate system prompts and search contexts.
- **State Management:** Track the active service mode in the frontend.

## 4. Acceptance Criteria
- [ ] Users can switch between ESL and Study Abroad via the sidebar without refreshing the page.
- [ ] The Study Abroad agent proactively greets the user with a relevant opening question.
- [ ] The AI naturally asks for and extracts the 7 KYC points and Phone number.
- [ ] System badges (clickable) show the extracted JSON data for Study Abroad leads correctly.
- [ ] Knowledge retrieval for Study Abroad does not return ESL-specific results (and vice-versa).

## 5. Out of Scope
- Real API integration with a live CRM (PostgreSQL/Google Sheets will be handled in a future track).
- Multi-language support for the UI elements (Vietnamese only for now).
