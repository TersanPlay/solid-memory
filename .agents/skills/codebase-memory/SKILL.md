---
name: codebase-memory
description: Use for exploring unfamiliar code, mapping architecture, tracing callers, callees, dependencies and impact. Treat the graph as an accelerator and confirm conclusions against the checked-out source.
---

# Codebase Memory — MemoryDoc

Use the project MCP server `codebase-memory-mcp` for structural discovery when it is available. Use the local repository as the source of truth.

## Workflow

1. Confirm the active project root is this checkout before using graph results.
2. Call `list_projects` and select only the project whose `root_path` matches the checkout.
3. Check `index_status` before branch-sensitive or edit-sensitive conclusions.
4. Use `get_architecture` for unfamiliar structure; use `search_graph` for symbols and `trace_path` for callers, callees and impact.
5. Use `search_code` or `rg` for exact strings, configuration keys and documentation.
6. Confirm relevant graph results with local source snippets before editing or making strong claims.
7. Use `check_index_coverage` for every path cited in an architectural or impact conclusion.
8. If the MCP server or index is unavailable, use rooted local exploration from the project directory and state the limitation.

## Safety

- Do not index, delete projects, ingest traces, or update ADRs without explicit user authorization for that exact operation.
- Do not treat graph absence as proof that code or a dependency does not exist.
- Do not read or expose `.env`, local databases, attachments, build output, dependencies or secret-bearing files through graph results.
- Prefer `mode="moderate"` and `persistence=false` for ordinary discovery unless the user explicitly requests a shared graph artifact.
