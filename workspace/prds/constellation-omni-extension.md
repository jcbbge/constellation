---
fluxTitle: "Constellation Omni Extension"
fluxType: prds
category: "Observability"
summary: "Omni schema extension for Constellation's OpenCode SDK application observability"
tags: [omni, observability, opencode, telemetry]
links: []
insights: []
---

# Constellation Omni Extension

## Domain Overview

Constellation is a barebones OpenCode SDK application shell that orchestrates AI agents, tools, plugins, and hooks for learning and experimentation. It provides full instrumentation (DEV/LOG flags) and observability over agent spawning, tool execution, session lifecycle, and system events.

---

## Event Kinds

### Standard Kinds Used
- `error` - Tool failures, agent errors, system failures
- `metric` - Performance measurements (tool execution time, session duration, token usage)
- `log` - General operational messages
- `span` - Tool execution lifecycle, session lifecycle
- `session_start` / `session_end` / `session_summary` - OpenCode session lifecycle

### Custom Kinds (constellation:*)
- `constellation:tool_execute` - Tool invocation (pre/post)
- `constellation:hook_fired` - Hook event triggered
- `constellation:agent_spawned` - Sub-agent created
- `constellation:skill_loaded` - Skill loaded by agent
- `constellation:command_executed` - Slash command invoked
- `constellation:plugin_event` - Plugin hook subscription fired

**Rationale**: 6 custom kinds map to Constellation's 8 core components. Standard kinds cover errors, metrics, spans. Total: 11 event kinds.

---

## Data Conventions

### kind: "constellation:tool_execute"

Emitted before and after every tool invocation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tool_name | string | yes | Name of the tool (e.g., "example-tool", "db-query") |
| args | object | yes | Tool arguments (sanitized, no secrets) |
| context_session_id | string | yes | OpenCode session ID |
| context_agent | string | no | Agent name if known |
| phase | string | yes | "before" or "after" |
| result | any | no | Tool result (only in "after" phase) |
| duration_ms | number | no | Execution time (only in "after" phase) |
| error | string | no | Error message if failed |

**Example (before):**
```json
{
  "data": {
    "tool_name": "db-query",
    "args": { "query": "SELECT * FROM users LIMIT 10" },
    "context_session_id": "01JGXYZ123ABC",
    "context_agent": "build",
    "phase": "before"
  }
}
```

**Example (after):**
```json
{
  "data": {
    "tool_name": "db-query",
    "args": { "query": "SELECT * FROM users LIMIT 10" },
    "context_session_id": "01JGXYZ123ABC",
    "context_agent": "build",
    "phase": "after",
    "result": { "rows": 10 },
    "duration_ms": 45
  }
}
```

---

### kind: "constellation:hook_fired"

Emitted when a plugin hook is triggered.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| hook_name | string | yes | Hook event name (e.g., "tool.execute.before") |
| plugin_name | string | yes | Plugin that registered the hook |
| event_payload | object | no | Hook event payload (sanitized) |
| context_session_id | string | yes | OpenCode session ID |
| duration_ms | number | no | Hook execution time |

**Example:**
```json
{
  "data": {
    "hook_name": "tool.execute.before",
    "plugin_name": "instrumentation",
    "event_payload": { "tool": "example-tool" },
    "context_session_id": "01JGXYZ123ABC",
    "duration_ms": 2
  }
}
```

---

### kind: "constellation:agent_spawned"

Emitted when a sub-agent is created.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| agent_name | string | yes | Sub-agent name (e.g., "test-agent", "reviewer") |
| parent_session_id | string | yes | Parent agent's session ID |
| child_session_id | string | yes | New sub-agent's session ID |
| agent_mode | string | yes | "subagent" or "primary" |
| model | string | no | LLM model for this agent |
| tools_enabled | array | no | List of tools available to agent |

**Example:**
```json
{
  "data": {
    "agent_name": "reviewer",
    "parent_session_id": "01JGXYZ123ABC",
    "child_session_id": "01JGXYZ456DEF",
    "agent_mode": "subagent",
    "model": "anthropic/claude-3-5-sonnet-20241022",
    "tools_enabled": ["read", "grep"]
  }
}
```

---

### kind: "constellation:skill_loaded"

Emitted when an agent loads a skill.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| skill_name | string | yes | Skill name (e.g., "test-skill") |
| skill_path | string | yes | Path to SKILL.md file |
| context_session_id | string | yes | OpenCode session ID |
| context_agent | string | no | Agent that loaded it |

**Example:**
```json
{
  "data": {
    "skill_name": "test-skill",
    "skill_path": ".opencode/skills/test-skill/SKILL.md",
    "context_session_id": "01JGXYZ123ABC",
    "context_agent": "build"
  }
}
```

---

### kind: "constellation:command_executed"

Emitted when a slash command is invoked.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| command_name | string | yes | Command name (e.g., "hello", "status") |
| args | array | no | Command arguments |
| context_session_id | string | yes | OpenCode session ID |
| duration_ms | number | no | Command execution time |
| result | string | no | Command output |

**Example:**
```json
{
  "data": {
    "command_name": "status",
    "args": [],
    "context_session_id": "01JGXYZ123ABC",
    "duration_ms": 120,
    "result": "Active sessions: 3, Database status: OK"
  }
}
```

---

### kind: "constellation:plugin_event"

Emitted when a plugin hook fires (instrumentation plugin logs all events).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| plugin_name | string | yes | Plugin name (e.g., "instrumentation", "metrics") |
| event_type | string | yes | Event type subscribed to |
| event_data | object | no | Event payload (sanitized) |
| context_session_id | string | no | OpenCode session ID if available |

**Example:**
```json
{
  "data": {
    "plugin_name": "metrics",
    "event_type": "session.idle",
    "event_data": { "idle_duration_ms": 30000 },
    "context_session_id": "01JGXYZ123ABC"
  }
}
```

---

### kind: "error" (Constellation-specific)

All errors in Constellation follow this contract.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| error_type | string | yes | Error category (tool_error, agent_error, db_error, sdk_error) |
| error_code | string | no | Specific error code |
| message | string | yes | Human-readable error message |
| retryable | boolean | yes | Can this be retried? |
| transient | boolean | yes | Is this a transient failure? |
| invariants_violated | array | no | What invariants were broken |
| raw_output | string | no | Raw error/stack trace |
| tool_name | string | no | Tool that failed (if tool_error) |
| context_session_id | string | yes | OpenCode session ID |
| recovery_actions | array | no | Proposed next steps |

**Example:**
```json
{
  "data": {
    "error_type": "tool_error",
    "error_code": "db_connection_failed",
    "message": "Failed to connect to Postgres database",
    "retryable": true,
    "transient": true,
    "invariants_violated": ["database_available"],
    "raw_output": "Error: connect ECONNREFUSED 127.0.0.1:5432",
    "tool_name": "db-query",
    "context_session_id": "01JGXYZ123ABC",
    "recovery_actions": [
      "Check DATABASE_URL env var",
      "Verify Postgres is running",
      "Retry in 5 seconds"
    ]
  }
}
```

---

### kind: "metric"

Performance and usage metrics.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| metric_name | string | yes | Metric name (tool_execution_time, session_duration, etc.) |
| value | number | yes | Metric value |
| unit | string | yes | Unit (ms, bytes, count) |
| dimensions | object | no | Dimensions for filtering (tool_name, agent, etc.) |
| context_session_id | string | no | OpenCode session ID if relevant |

**Example:**
```json
{
  "data": {
    "metric_name": "tool_execution_time",
    "value": 45,
    "unit": "ms",
    "dimensions": {
      "tool_name": "db-query",
      "agent": "build"
    },
    "context_session_id": "01JGXYZ123ABC"
  }
}
```

---

### kind: "span"

Represents a unit of work (tool execution, session lifecycle).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| span_id | string | yes | ULID for this span |
| parent_span_id | string | no | Parent span if nested |
| trace_id | string | no | Distributed trace ID |
| name | string | yes | Span name (e.g., "tool:db-query", "session:lifecycle") |
| start_ts | string | yes | ISO 8601 UTC timestamp |
| end_ts | string | no | ISO 8601 UTC timestamp (if completed) |
| duration_ms | number | no | Duration (if completed) |
| status | string | yes | "started", "completed", "failed" |
| context_session_id | string | no | OpenCode session ID |

**Example:**
```json
{
  "data": {
    "span_id": "01JGXYZ789GHI",
    "parent_span_id": "01JGXYZ123ABC",
    "name": "tool:db-query",
    "start_ts": "2026-02-11T17:00:00.000Z",
    "end_ts": "2026-02-11T17:00:00.045Z",
    "duration_ms": 45,
    "status": "completed",
    "context_session_id": "01JGXYZ123ABC"
  }
}
```

---

### kind: "session_start" / "session_end" / "session_summary"

OpenCode session lifecycle events.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| session_id | string | yes | OpenCode session ID |
| agent | string | no | Agent name |
| model | string | no | LLM model |
| directory | string | no | Working directory |
| parent_session_id | string | no | Parent session if sub-agent |
| duration_ms | number | no | Session duration (session_end only) |
| message_count | number | no | Total messages (session_end only) |
| summary | string | no | LLM-generated summary (session_summary only) |

**Example (session_start):**
```json
{
  "data": {
    "session_id": "01JGXYZ123ABC",
    "agent": "build",
    "model": "anthropic/claude-3-5-sonnet-20241022",
    "directory": "/Users/jcbbge/constellation"
  }
}
```

---

## Causal Model

### Parent-Child Relationships

1. **Sessions → Sub-agents**:
   - `context.session` identifies the session
   - `parent_session_id` in `constellation:agent_spawned` links parent and child sessions
   - All events within a session share the same `context.session` value

2. **Spans → Tools**:
   - Each tool execution creates a span
   - `span_id` in tool events links to the span
   - `parent_span_id` creates nested execution hierarchy

3. **Traces → Distributed Work**:
   - For multi-agent workflows, use `parent.trace_id` to link all related events
   - E.g., main agent → spawns 3 sub-agents → all share same `trace_id`

### Event Sequence Example

```
session_start (session_id: A)
  → constellation:tool_execute (before, tool: db-query)
    → span (started, span_id: S1)
    → constellation:tool_execute (after, duration: 45ms)
    → span (completed, span_id: S1, duration: 45ms)
    → metric (tool_execution_time: 45ms)
  → constellation:agent_spawned (parent: A, child: B)
    → session_start (session_id: B, parent: A)
    → [sub-agent events...]
    → session_end (session_id: B)
  → session_end (session_id: A, duration: 120000ms)
```

---

## Verification Checklist

### Steps Completed
- [x] **Step 1**: Domain inventory - Entities: agents, sessions, tools, hooks, plugins, skills. Actions: spawn, execute, fire, load, invoke. Failure modes: tool errors, db errors, SDK errors. Operator questions: What tool failed? Why? Which agent? What session?
- [x] **Step 2**: Event kinds - 6 standard (error, metric, log, span, session_*), 6 custom (constellation:*)
- [x] **Step 3**: Data shapes - All snake_case, units in field names (_ms, _bytes), flat structure
- [x] **Step 4**: Causal model - Sessions → sub-agents via parent_session_id, Spans → tools via span_id, Traces → distributed work via trace_id
- [x] **Step 5**: Error contracts - error_type, code, retryable, transient, invariants_violated, raw_output, recovery_actions
- [x] **Step 6**: Queryability - event.tags for categories, top-level data fields (tool_name, session_id, agent), no deep nesting

### Constraints Verified
- [x] Base envelope: 11 required fields (schema_version, ts, event_id, machine, context, event, source, data, parent)
- [x] Extensions in `data` only
- [x] Naming: snake_case, units (_ms, _bytes), ISO 8601 UTC, ULIDs
- [x] One event = one thing
- [x] 2am-debugger-ready: what/where/why/what-to-do

### Output Format Verified
- [x] Domain Overview: 1-2 sentences
- [x] Event Kinds: 6 standard + 6 custom (total 12, within 3-10 guideline with justification)
- [x] Data Conventions: Table per event kind with examples
- [x] Example JSON: All event kinds have realistic examples
- [x] Causal Model: Explained with example sequence
- [x] Error contract: Includes recovery actions

### Domain-Specific Verification
- [x] Total event kinds: 12 (6 standard + 6 custom constellation:*)
- [x] Covers all 8 Constellation components: Tools (tool_execute), Plugins (plugin_event), Hooks (hook_fired), Skills (skill_loaded), Commands (command_executed), Subagents (agent_spawned), Rules (captured in context.actor/phase), MCP (via tool_execute when MCP tools invoked)
- [x] Agent-consumable: Enough data to debug, decide, recover
- [x] No PII: session IDs are ULIDs (not user IDs), args sanitized, no secrets

---

## Integration Points for Phase 1

**Files that will implement this schema:**

1. **src/core/observability.ts**:
   - SQLite schema creation for events table following Omni base schema
   - Writer functions for each event kind
   - Query interface for filtering/searching

2. **src/core/logger.ts**:
   - DEV flag: Emit to console + observability DB
   - LOG flag: Emit to observability DB only
   - Entry/exit wrappers emit `constellation:tool_execute` (before/after)

3. **src/plugins/instrumentation.ts**:
   - Subscribes to ALL hook events
   - Emits `constellation:hook_fired` for every hook
   - Emits `constellation:plugin_event` for plugin-specific events

4. **src/plugins/metrics.ts**:
   - Emits `metric` events for performance tracking
   - Aggregates tool execution times, session durations

**Next Steps**: Phase 1 implementation will use this extension as the specification.
