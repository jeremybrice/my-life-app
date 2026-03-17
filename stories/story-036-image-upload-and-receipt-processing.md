---
title: "Image Upload and Receipt Processing"
type: story
status: Draft
product: My Life App
module: AI Agent
client: null
team: null
parent: null
story_points: null
jira_card: null
source_conversation: null
created: 2026-03-17
updated: 2026-03-17
---

## Background / Context

Receipt scanning reduces manual transcription effort. Users can photograph a receipt and have the AI agent extract the relevant expense data (vendor, amount, date, line items) from the image. This extends the conversational expense entry with a visual input channel, making it faster to log purchases backed by receipts.

## Feature Requirements / Functional Behavior

**UI Behavior**

- An image upload button is displayed in the chat input area alongside the text input.
- Tapping the upload button opens the device's image picker or camera.
- After selection, a thumbnail preview of the image appears in the chat thread as a user message.
- A loading indicator is displayed while the image is being processed.
- The agent responds with extracted data: vendor, amount, date, and line items.
- Extracted data is presented in the same confirmation format as text-parsed expenses (Story 035).
- If the image is unreadable or not a receipt, the agent responds with a clear message indicating it could not identify receipt data.

**Business Rules**

- JPEG and PNG image formats are supported at minimum.
- The image is sent to the Claude API as a multimodal message (image content block).
- The extraction prompt instructs the model to identify vendor, amount, date, and individual line items.
- For receipts with multiple line items, the total is extracted as the primary amount, with line items listed for reference.
- The user is offered the option to log as a single expense or split into multiple entries.
- If the receipt date is legible, it is used; otherwise, the date defaults to today.
- Image handling follows the transient rules defined in Story 037.

## Acceptance Tests

**Test 1: Successful Receipt Upload and Extraction**
Steps: Upload a clear photo of a receipt.
Expected Result: A thumbnail appears in the chat. The agent extracts vendor, amount, date, and line items. The data is presented in the confirmation format.

**Test 2: Non-Receipt Image**
Steps: Upload a landscape photo (not a receipt).
Expected Result: The agent responds with a message indicating it cannot identify receipt data in the image.

**Test 3: Receipt with Multiple Line Items**
Steps: Upload a receipt with multiple line items.
Expected Result: The total amount is extracted as the primary amount. Line items are listed for reference. The user is given the option to split into multiple expenses.

**Test 4: Receipt with Missing Date**
Steps: Upload a receipt where the date is cut off or illegible.
Expected Result: The agent notes the date could not be determined and defaults to today's date.

**Test 5: Image with Accompanying Text**
Steps: Upload a receipt image and type "team lunch last week" in the same message.
Expected Result: Both the image and text are processed. The text context informs the extraction (e.g., category suggestion, date resolution).

## Implementation Context

This story extends Story 030 (chat UI) by adding the image upload button. It uses the Story 031 API client with multimodal message support (image content blocks in the Claude Messages API). Extracted data feeds into Story 035 (confirmation and write). Image lifecycle follows Story 037 (transient handling).

