# Constellation — Session Handoff

**Date:** 2026-02-25
**Branch:** main

---

## What Was Accomplished This Session

### Sprint 2: Real LLM Calls + SurrealDB ✅

Replaced mocked agent invocations and SQLite with working implementations.

**Files changed (in `constellation_v.01/` — gitignored reference):**

- `src/runner.ts` — Full rewrite:
  - SQLite → SurrealDB (`constellation/pheromones` namespace)
  - Mocked `invokeAgent` → real OpenCode SDK calls via `createOpencode()`
  - All db functions converted to async
  - Agent `.md` files read as system prompts per invocation
  - Each agent gets a fresh OpenCode session, cleaned up after

- `src/lib/db.ts` — NEW: SurrealDB connection singleton
  - Same pattern as Anima's lib/db.ts (Bun.env, WebSocket, lazy connect)
  - NS: `constellation`, DB: `pheromones`
  - Reuses existing SurrealDB at `ws://127.0.0.1:8000/rpc`

- `package.json` — Added `surrealdb@2.0.0-beta.2`
- `PROTOCOL.md` — Created (required by opencode.json, copied from workspace/templates)

### Proof of Concept Result

```
[db] Connected to SurrealDB (constellation/pheromones)
[opencode] Server running at http://127.0.0.1:4096

VEGA invoking via OpenCode...    -> Emitted: idea_validated ✅
POLARIS invoking via OpenCode... -> Emitted: orbit_blocked  ✅
```

Real LLM calls. Real SurrealDB writes. Agent handoff through pheromones.
Polaris correctly entered orbit mode — it had questions before approving.

**Next:** Port these changes from `constellation_v.01/` into main `constellation/src/`.

---

## Priority 1: nQ Protocol

The orbit blocking is working but unstructured. nQ governs all agent ↔ agent clarification:

- Agent emits `orbit_question` with its questions before proceeding
- Receiving agent emits `orbit_answer`
- Loop continues until nQ=0 (no questions remaining)
- **Max 3 iterations** (hard ceiling: 5) between agents
- After max: emit `needs_human` and escalate

**What to build:**
1. Track iteration count per `(trajectory, star)` in SurrealDB
2. Runner detects `orbit_question` → routes to correct agent → re-invokes
3. Max iteration guard → emits `needs_human` when exceeded
4. Review `constellation_v.01/agents/*.md` — orbit protocol is documented per agent

---

## Priority 2: Human Intervention Loop

Triggered when agent hits max nQ iterations without resolution:

- `needs_human` pheromone surfaced to stdout (or future TUI)
- Human answers via stdin
- `orbit_answer` pheromone emitted with human response
- Agent re-invoked — **no iteration limit on the human loop**
- Human closes the question, agent proceeds

Agent-agent: max 3-5 iterations then escalate.
Human-agent: unlimited, human owns the close.

---

## Session Start Instructions

1. Read this file
2. Port `constellation_v.01/src/runner.ts` + `src/lib/db.ts` into `constellation/src/`
3. Implement the nQ orbit loop in the runner
4. Test: verify nQ cycles between agents before human handoff triggers

---

## SurrealQL Gotchas (This Version)

- `NOT EXISTS (subquery)` → not supported, use two-query pattern
- `NOT INSIDE` → use `NOT IN`
- `FLEXIBLE TYPE object` → correct order (not `FLEXIBLE TYPE`)
- `DEFINE TABLE OVERWRITE` → for idempotent schema init
- `IF NOT EXISTS` → not supported
- JSON is native — no `JSON.stringify` on object fields
- Record IDs: use underscores, not hyphens (or wrap in backticks)
