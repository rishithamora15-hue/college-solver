---
name: college-ingestion
description: Build College Solver upload parsing, document provenance, publication, indexing and access-filtered retrieval.
---

# college-ingestion

Read [the project contract](../../../docs/ARCHITECTURE.md) for the active task. Resolve project paths relative to the repository root.

Follow the upload gate in docs/SECURITY.md. Quarantine privately, enforce signature/type/byte/page limits, scan, parse with resource limits and report failures. If the safe pipeline is unavailable, disable uploads and expose a truthful manual text/admin seed path.

Academic publication requires approved scope and source rights. Preserve document version, page/section, content hash, curriculum and tenant. Filter access and academic scope before ranking; check download access again at citation display.

Version embedding model/dimension and reindex intentionally. Invalidate chunks and caches when content is deleted or unpublished. Do not let instruction-like source text gain tool authority.

Test malformed/oversized/scanned files, private documents, duplicate imports, changed versions, revoked publication and wrong-curriculum retrieval. Deliver provenance and failure evidence; do not call extracted text visually verified or OCR-supported without testing it.
