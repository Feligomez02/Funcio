# Upcoming Tasks

- **Audit Visibility UI**
  - Surface audit log entries (validation, link changes, integration updates) on project and requirement dashboards.
  - Provide filters by action/user and paginate for large histories.

- **Linked Issue Monitoring**
  - Add a manual sync action and/or scheduled job to refresh stored JIRA statuses for saved links.
  - Consider badges or alerts when the JIRA state drifts from the requirement status.

- **Requirement Status Sync (Optional/Feature Flag)**
  - Map JIRA workflow categories to requirement statuses.
  - Provide per-project toggle to auto-update requirements when all linked issues are done.

- **Push Requirement to JIRA**
  - Extend requirement creation form with an opt-in to create a JIRA issue (requires write-scoped credentials and project mapping).
  - Handle error recovery and auto-link the new issue via `requirement_links`.

- **Requirement Page Enhancements**
  - Add quick filters, related requirement navigation, and metrics (history count, last AI assist) to improve analyst workflow.

- **Testing Coverage**
  - Add integration/unit tests for requirement link CRUD APIs, audit logging, and UI flows.
  - Include regression tests around validation rate limiting and credential encryption.

- **Embeddings + Similarity Search**
  - Persist AI embeddings for requirements.
  - Expose similarity queries to surface related requirements during drafting.
