---
title: "AI Agent Integration"
type: epic
status: Planning
product: My Life App
module: AI Agent
client: null
team: null
jira_card: null
parent: null
children:
  []
description: "Claude API chat interface within the app supporting text and image/receipt input for conversational data entry. The agent writes to the same data stores as manual forms, handles natural language expense logging, and degrades gracefully when the API is unreachable."
source_intake: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background/Context

This Epic introduces the AI agent as a conversational data entry channel within My Life App. The parent Initiative positions the agent as a convenience layer, not a replacement for manual entry. Both paths (chat and forms) write to the same underlying data stores, ensuring data consistency regardless of entry method.

The business value is friction reduction. Instead of navigating to the budget screen, opening a form, and filling out five fields, the user can type "I spent $12.50 at Starbucks today" or snap a photo of a receipt, and the agent creates the expense entry automatically. The multimodal capability (text plus images) means receipts can be processed directly through conversation without manual transcription.

The Claude API integration introduces the only hard network dependency in the application. The agent screen requires API connectivity and a valid API key. All other app features function offline.

## Epic Scope

This Epic delivers the AI Agent screen with a chat interface connected to the Claude API. The scope includes: a conversational chat UI supporting text input and image uploads, Claude API integration using the API key stored in settings, natural language understanding for expense entry (parsing amount, vendor, category, date, and description from conversational input), multimodal receipt processing where uploaded images are sent to Claude for extraction, graceful degradation when the API is unreachable, and transient image handling where receipt images are sent to the API but never stored locally.

The agent's v1 write capability is focused on expense entry into the budget module's data stores. The architecture should not preclude extending agent capabilities to other modules.

## Affected Systems

- Claude API (Anthropic) for natural language processing and multimodal image analysis
- Local Device Storage (IndexedDB expenses object store via the budget module's write interface)
- Browser PWA Runtime (chat UI, image upload handling, network connectivity detection)

## Functional Capabilities

- **Chat Interface**: A conversational UI on the AI Agent screen displays a message thread between the user and the agent. The user types messages or uploads images. Agent responses appear in the thread.

- **Natural Language Expense Entry**: The user types natural language instructions describing an expense. The agent parses the input to extract amount, vendor, category, date, and description. The agent confirms the parsed data with the user before creating the expense entry.

- **Multimodal Receipt Processing**: The user uploads a receipt image. The image is sent to the Claude API with a prompt instructing extraction of vendor, amount, date, and line items. The agent presents the extracted data for user confirmation before creating expense entries. Images are transient and not stored.

- **Confirmation Before Write**: The agent always shows the user what it intends to write and asks for confirmation before creating any records.

- **Graceful Degradation**: When the API is unreachable (no network, invalid key, API error), the agent screen displays a clear message indicating the agent is unavailable. The rest of the app remains fully functional.

- **API Key Validation**: On first use or when the API key changes, the agent verifies the key with a lightweight API call. Invalid or missing keys produce a clear error directing the user to settings.

- **Transient Image Handling**: Receipt images exist only in memory during upload and API call. They are not written to IndexedDB, local storage, or any persistent location.

## Suggested Story Breakdown

1. Chat UI Layout and Message Thread
2. Claude API Client Integration
3. Network Connectivity Detection and Graceful Degradation
4. API Key Validation
5. Natural Language Expense Parsing
6. Expense Confirmation and Data Store Write
7. Image Upload and Receipt Processing
8. Transient Image Handling and User Disclosure
9. Conversation Context Management

## Success Criteria

- The user can type a natural language expense description and have the agent correctly parse and create an expense entry after confirmation.
- The user can upload a receipt image and have the agent extract expense data for confirmation and entry.
- Expense entries created by the agent are identical in structure to entries created via the manual form.
- When the API is unreachable, the agent screen displays a clear unavailable message and all other app features continue to function normally.
- Receipt images are never stored locally; they exist only transiently during API processing.
- The agent asks for confirmation before writing any data to the store.

## Dependencies

- Depends on Epic 1 (PWA Shell, Dashboard & Settings) for the API key stored in settings, the app navigation, and the IndexedDB schema.
- Depends on Epic 2 (Budget Module) for the expense data model and write interface.
- May optionally integrate with Epic 3 (Goals & Health Routines) data stores if agent scope extends beyond expense entry.

## Technical Constraints

- The Claude API client must use the exact API key stored in the settings screen. The key is never hardcoded.
- All API calls must include appropriate error handling for network failures, rate limits, invalid keys, and malformed responses.
- The agent writes expenses through the same data interface as the manual form. It must not bypass validation.
- Image data must be handled entirely in memory. No blob storage, no IndexedDB writes for images.

## Open Questions

- Beyond expense entry, should the AI agent in v1 handle goals, health routines, or settings modifications?
- Should conversation history persist across sessions, or is it ephemeral per screen visit?
- What Claude model should be used for v1? The API client should make the model configurable.





