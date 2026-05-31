---
description: Audit the codebase for security vulnerabilities, storage growth risks, and common bugs. Reports findings grouped by severity without making changes.
---

Read all source files in the project (src/**/*.{js,jsx,ts,tsx}) plus any Firestore rules files. Then produce a prioritized audit report grouped into three sections:

## SECURITY
- Firestore rules: check for missing ownership checks (uid == request.auth.uid), overly broad read/write permissions, missing field validation
- XSS: look for raw innerHTML assignments, unsanitized user content, dangerouslySetInnerHTML
- Auth: check that all Firestore operations are gated on user authentication
- Client-side trust: identify any security logic that should be server-side

## STORAGE
- Unbounded collections: identify collections with no TTL, cleanup, or size cap
- Large field storage: flag base64 image data, large blobs, or HTML stored directly in Firestore documents
- Accumulation patterns: bulk writes, append-only patterns, archived data with no pruning
- For each risk, estimate rough growth rate if possible (e.g. "~1KB per message, 1000 messages/month = ~1MB/month")

## BUGS
- Race conditions: parallel async operations on shared state, missing transactions
- Silent error handling: swallowed .catch(), missing error boundaries
- Stale closure / ref bugs in React hooks
- LocalStorage key collisions or missing namespacing
- Date/timezone assumptions

For each finding include:
- Severity: Critical / Moderate / Low
- File and line number if applicable
- One sentence on real-world impact for this specific app

End with two lists:

**Most urgent actions** (max 3) — things that could cause data loss, a bill, or a security incident in production right now.

**Recommended next steps** (max 5) — improvements worth doing soon but not on fire: things like adding TTL cleanup, tightening rules, adding error boundaries, moving blob storage out of Firestore, etc. Be specific about what to do and why it helps.
