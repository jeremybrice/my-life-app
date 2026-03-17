---
title: "Data Import from File"
type: story
status: Draft
product: My Life App
module: Platform
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

The export feature (Story 045) produces a backup file, but without a corresponding import, that backup is useless. Import enables two critical scenarios: restoring data after loss (device reset, cache clear) and migrating data to a new device or browser. Because the app has no cloud sync, file-based import is the only way to transfer application state between environments.

Import is a destructive operation. It replaces all current data with the contents of the imported file. This story must make the consequences clear to the user and require explicit confirmation before proceeding.

## Feature Requirements / Functional Behavior

**UI Behavior**

- An "Import Data" button is accessible from the settings screen, near the "Export Data" button.
- Tapping the button opens the device's native file picker, filtered to JSON files where the platform supports file type filtering.
- After the user selects a file, the app reads and validates the file. During validation, a loading indicator is visible.
- If validation succeeds, a confirmation dialog appears. The dialog explicitly warns that importing will replace all current data in the app and this action cannot be undone. It shows the export date and schema version from the file's metadata.
- The confirmation dialog has two options: "Import and Replace" and "Cancel."
- If the user confirms, the import proceeds with a progress indicator. On completion, a success message appears and the app reloads or refreshes to reflect the imported data.
- If validation fails, an error message describes why (e.g., "File is not a valid My Life App export," "Schema version is not compatible").

**Business Rules**

- Validation must confirm that the file is valid JSON, contains the expected top-level structure (metadata and data objects), includes a recognized schema version, and contains data keys corresponding to known IndexedDB object stores.
- If the file's schema version is newer than the app's current schema version, the import must be rejected with a message advising the user to update the app.
- If the file's schema version matches the app's current schema version, the import proceeds normally.
- If the file's schema version is older than the app's current schema version, the import may proceed if the app can migrate the data forward. If migration is not possible, the import is rejected with an explanatory message.
- The import replaces all data in all IndexedDB stores. It does not merge with existing data.
- If the import fails partway through (e.g., a write error), the app should attempt to leave the database in a consistent state. A partial import that leaves some stores old and some new is worse than a failed import that preserves the original data.

## Acceptance Tests

**Test 1: Successful Import and Data Replacement**
Steps: Export data from the app. Change some data in the app (add new expenses, modify settings). Import the previously exported file. Confirm the replacement warning.
Expected Result: After import, all data matches the exported file. The changes made after export are gone. The app reflects the imported state.

**Test 2: Replacement Warning Displays Correctly**
Steps: Select a valid export file for import.
Expected Result: A confirmation dialog appears warning that all current data will be replaced. The dialog shows the export date and schema version from the file metadata.

**Test 3: User Cancels Import**
Steps: Select a valid file, see the confirmation dialog, and tap "Cancel."
Expected Result: No data is changed. The app continues with its current data intact.

**Test 4: Invalid File Rejected**
Steps: Select a JSON file that is not a My Life App export (e.g., a random JSON file or a corrupted export).
Expected Result: An error message appears explaining the file is not a valid export. No data is modified.

**Test 5: Incompatible Schema Version Rejected**
Steps: Manually edit an export file to set its schema version to a number higher than the app's current version. Attempt to import it.
Expected Result: The import is rejected with a message advising the user to update the app to a newer version.

**Test 6: Import from Empty App State**
Steps: On a fresh app installation with no data, import a full export file and confirm.
Expected Result: The import succeeds and the app now contains all data from the exported file.

## Implementation Context

The file picker can be triggered via an `<input type="file" accept=".json">` element. Consider wrapping the entire import in an IndexedDB transaction to support rollback on failure; however, note that IndexedDB transactions scope to individual object stores, so a multi-store replacement may require careful sequencing. One approach is to read the current data into memory before overwriting, allowing restoration if any write fails. Schema version comparison logic should be straightforward for v1 but should be designed with future migration paths in mind.

