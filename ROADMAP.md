# Implementation Plan: Barebones OpenCode SDK Shell with Full Component Examples

## Context

Building a minimal, production-ready boilerplate for OpenCode SDK applications using Bun. This is a learning-first implementation that exposes the complete API surface of all 8 OpenCode components with working test examples, comprehensive instrumentation (DEV/LOG flags), and a single-binary install workflow.

**Purpose**: Provide full visibility into OpenCode's architecture so the user can stress-test, modify, and understand every component before building their custom application. This is NOT a feature-complete application—it's a reference implementation and testing ground.

**Key Requirements**:
- Zero TUI (console output only for now)
- All 8 components working with test examples
- Full instrumentation at every function boundary (entry/exit logging)
- bun:sqlite for internal state, Postgres adapters for application layer
- Single-click install: `constellation` command runs the app
- Symlink dev workflow: changes auto-propagate without rebuild
- Minimal dependencies

---

## 8 Core Components to Implement

Based on `/Users/jcbbge/Documents/metaprompts/AGENT_UPGRADE_ANALYSIS_CHECKLIST.md`:

1. **Skills** - SKILL.md definitions in `.opencode/skills/`
2. **Commands** - Slash commands in `.opencode/commands/`
3. **Tools** - Custom functions via `@opencode-ai/plugin`
4. **Hooks** - Event-based automations via plugins
5. **Subagents** - Agent definitions in `.opencode/agents/`
6. **Rules** - AGENTS.md custom instructions
7. **MCP Servers** - External tool integration config
8. **Plugins** - Event subscription system

---

## Project Structure

```
constellation/
├── src/
│   ├── index.ts                    # CLI entrypoint with arg parsing
│   ├── core/
│   │   ├── server.ts               # OpenCode server initialization
│   │   ├── logger.ts               # DEV/LOG flag instrumentation
│   │   └── database.ts             # Dual DB setup (sqlite + postgres)
│   ├── tools/
│   │   ├── example-tool.ts         # Test tool with full logging
│   │   └── db-query.ts             # Database query tool example
│   ├── plugins/
│   │   ├── instrumentation.ts      # Logs all hooks for visibility
│   │   └── metrics.ts              # Telemetry/performance tracking
│   └── examples/
│       ├── session-lifecycle.ts    # Create/manage sessions
│       ├── tool-invocation.ts      # Programmatic tool calls
│       ├── subagent-spawn.ts       # Spawn and manage subagents
│       └── event-streaming.ts      # Subscribe to server events
├── .opencode/
│   ├── agents/
│   │   ├── test-agent.md           # Example subagent
│   │   └── reviewer.md             # Code review agent
│   ├── skills/
│   │   ├── test-skill/
│   │   │   └── SKILL.md            # Example skill
│   │   └── db-query-skill/
│   │       └── SKILL.md            # Database interaction skill
│   ├── commands/
│   │   └── hello.md                # Example command
│   ├── tools/                      # Symlink to src/tools/
│   ├── plugins/                    # Symlink to src/plugins/
│   └── AGENTS.md                   # Global rules/instructions
├── opencode.json                   # Full config with all 8 components
├── package.json                    # Minimal deps: @opencode-ai/sdk, postgres
├── .env.example                    # Config template
├── README.md                       # Component documentation
└── data/
    └── internal.db                 # SQLite for app state (auto-created)
```

---

## Implementation Steps

### Phase 1: Core Infrastructure

**Files to create**:
- `src/core/logger.ts` - Instrumentation with DEV/LOG flags (writes to observability DB)
- `src/core/observability.ts` - Omni schema implementation (SQLite)
- `src/core/database.ts` - Application database (Postgres via Bun native SQL)
- `src/core/server.ts` - OpenCode server initialization
- `src/index.ts` - CLI entrypoint

**Logger Specification**:
```typescript
// Supports:
// - DEV flag: Entry/exit logging for all functions (console + observability DB)
// - LOG flag: Detailed pre/during/post invocation metrics (observability DB only)
// - Console output with timestamps, optional ANSI colors (auto-detect TTY)
// - Writes events to observability DB following Omni schema
// - Event kinds: tool.execute.before, tool.execute.after, hook.fired, etc.
```

**Database Setup**:
```typescript
// Observability layer (bun:sqlite at ./data/observability.db):
// Follows Omni Observability Schema v1.0.0 (append-only, immutable events)
// - Base schema: ts, event_id, machine, context, event, source, data
// - Event kinds: tool.execute, hook.fired, session.lifecycle, metric
// - All instrumentation logs stored here (DEV/LOG flags)
// Auto-initialized with Omni schema on startup

// Application layer (Postgres via Bun native SQL driver):
// - Uses Bun's built-in SQL module (Postgres-flavored)
// - Example: Constellation-specific tables (trajectories, agents, etc.)
// - Requires DATABASE_URL env var
// - Schema: TBD based on app requirements
```

**Server Initialization**:
```typescript
// Start OpenCode server with:
// - Custom config (opencode.json)
// - Event subscription setup
// - Health check endpoint
// - Graceful shutdown handling
```

---

### Phase 2: Component Examples (All 8)

#### 1. **Tools** (`src/tools/`)

Create 3 example tools:

**a. `example-tool.ts`** - Basic tool with full instrumentation
```typescript
import { tool } from "@opencode-ai/plugin"
import { logger } from "../core/logger"

export const exampleTool = tool({
  description: "Example tool demonstrating instrumentation",
  args: {
    message: tool.schema.string().describe("Message to echo"),
  },
  async execute(args, context) {
    logger.entry("exampleTool", { args, context })
    
    const result = `Echo: ${args.message}`
    
    logger.exit("exampleTool", { result })
    return result
  }
})
```

**b. `db-query.ts`** - Query internal or app database
```typescript
export const queryInternal = tool({ /* SQLite query */ })
export const queryApp = tool({ /* Postgres query */ })
```



#### 2. **Plugins** (`src/plugins/`)

**a. `instrumentation.ts`** - Log ALL hooks for visibility
```typescript
export const InstrumentationPlugin: Plugin = async ({ client }) => {
  return {
    "tool.execute.before": async (event) => {
      logger.log("HOOK", "tool.execute.before", event)
    },
    "tool.execute.after": async (event) => {
      logger.log("HOOK", "tool.execute.after", event)
    },
    "session.created": async (event) => {
      logger.log("HOOK", "session.created", event)
    },
    // ... all available hooks with logging
  }
}
```

**b. `metrics.ts`** - Track performance/telemetry
```typescript
// Measure:
// - Tool execution time
// - Session duration
// - Token usage (if available)
// - Event frequency

// Store in SQLite internal DB
```

#### 3. **Skills** (`.opencode/skills/`)

**a. `test-skill/SKILL.md`**
```markdown
---
name: test-skill
description: Example skill for testing
---

# Test Skill

This skill demonstrates:
- Markdown-based instructions
- How agents load and use skills
- Multi-line prompts
```

**b. `db-query-skill/SKILL.md`**
```markdown
---
name: db-query-skill
description: Query the application database
---

# Database Query Skill

Use the `queryApp` tool to run SQL queries.
Always validate input before executing.
```

#### 4. **Commands** (`.opencode/commands/`)

**a. `hello.md`**
```markdown
---
description: Say hello with a name
---

Say "Hello, $1!" and explain what commands do.
```

**b. `status.md`**
```markdown
---
description: Show system status
---

Report:
- Active sessions: !`echo "$(curl -s http://localhost:4096/session | jq length)"`
- Database status: !`sqlite3 ./data/internal.db "SELECT COUNT(*) FROM events"`
```

#### 5. **Subagents** (`.opencode/agents/`)

**a. `test-agent.md`**
```markdown
---
description: Test subagent for delegation
mode: subagent
model: anthropic/claude-3-5-sonnet-20241022
tools:
  write: false
  bash:
    "*": "deny"
permission:
  task:
    "*": "deny"
---

You are a test subagent with limited permissions.
Your role is to analyze text and return structured summaries.
You cannot write files or execute shell commands.
```

**b. `reviewer.md`**
```markdown
---
description: Code review agent
mode: subagent
tools:
  write: false
---

Review code for:
- Security issues
- Performance concerns
- Best practices

Provide actionable feedback.
```

#### 6. **Rules** (`.opencode/AGENTS.md`)

```markdown
# Global Rules for Constellation

## Logging
- Always log at entry/exit of custom functions when DEV=true
- Use structured logging for production telemetry when LOG=true

## Database
- Internal state uses SQLite (./data/internal.db)
- Application data uses Postgres

## Security
- Validate all tool inputs
- No hardcoded credentials
- Use environment variables for secrets

## Testing
- All components have working examples in src/examples/
```

#### 7. **MCP Servers** (`opencode.json`)

```json
{
  "mcp": {
    "memory": {
      "type": "local",
      "enabled": false,
      "command": ["npx", "-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "type": "local",
      "enabled": false,
      "command": ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

**Note**: Disabled by default for minimal install, examples show how to enable.

#### 8. **Full Config** (`opencode.json`)

```json
{
  "model": "anthropic/claude-3-5-sonnet-20241022",
  
  "tools": {
    "write": true,
    "bash": {
      "*": "ask",
      "git status": "allow"
    }
  },
  
  "permission": {
    "skill": {
      "*": "allow"
    },
    "task": {
      "*": "allow"
    }
  },
  
  "agent": {
    "test-agent": {
      "mode": "subagent"
    },
    "reviewer": {
      "mode": "subagent"
    }
  },
  
  "command": {
    "hello": {},
    "status": {}
  },
  
  "plugin": [],
  
  "mcp": {}
}
```

---

### Phase 3: Working Examples

Create runnable examples in `src/examples/`:

**a. `session-lifecycle.ts`**
```typescript
// Demonstrates:
// 1. Start OpenCode server
// 2. Create session
// 3. Send prompt
// 4. Get messages
// 5. Delete session
// 6. Full logging at each step
```

**b. `tool-invocation.ts`**
```typescript
// Demonstrates:
// 1. Invoke custom tool programmatically
// 2. Check tool results
// 3. Error handling
```

**c. `subagent-spawn.ts`**
```typescript
// Demonstrates:
// 1. Create session with specific agent
// 2. Send task to subagent
// 3. Monitor subagent execution
// 4. Retrieve results
```

**d. `event-streaming.ts`**
```typescript
// Demonstrates:
// 1. Subscribe to server events
// 2. Log all events in real-time
// 3. Filter specific event types
```

---

### Phase 4: Build & Install System

**a. `package.json` scripts**
```json
{
  "scripts": {
    "dev": "DEV=true bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "build": "bun build --compile src/index.ts --outfile dist/constellation",
    "link": "bun link",
    "test:tools": "bun src/examples/tool-invocation.ts",
    "test:sessions": "bun src/examples/session-lifecycle.ts",
    "test:subagents": "bun src/examples/subagent-spawn.ts",
    "test:events": "bun src/examples/event-streaming.ts"
  }
}
```

**b. Symlink dev workflow**
```bash
# User runs once:
cd /Users/jcbbge/constellation
bun link

# Now `constellation` command works globally and reflects code changes
# No rebuild needed during development with --watch
```

**c. Single binary install**
```bash
# Build production binary:
bun run build

# Creates: dist/constellation (50MB+ standalone executable)
# User can distribute this file anywhere
```

---

### Phase 5: Documentation

**README.md sections**:

1. **Installation**
   - `bun install`
   - `bun link` (dev) or `bun run build` (prod)

2. **Component Guide**
   - Each of 8 components with:
     - What it is
     - Where it lives
     - How to configure
     - How to test
     - API surface

3. **Environment Variables**
   - `DEV=true` - Full entry/exit logging
   - `LOG=true` - Detailed telemetry
   - `DATABASE_URL` - Postgres connection

4. **Examples**
   - How to run each example
   - Expected output
   - What to modify for experiments

5. **Stress Testing Guide**
   - How to modify components
   - Where boundaries can be bent
   - What's customizable vs. fixed

---

## Critical Files to Create

1. **Core** (5 files):
   - `src/core/logger.ts`
   - `src/core/observability.ts`
   - `src/core/database.ts`
   - `src/core/server.ts`
   - `src/index.ts`

2. **Tools** (2 files):
   - `src/tools/example-tool.ts`
   - `src/tools/db-query.ts`

3. **Plugins** (2 files):
   - `src/plugins/instrumentation.ts`
   - `src/plugins/metrics.ts`

4. **Examples** (4 files):
   - `src/examples/session-lifecycle.ts`
   - `src/examples/tool-invocation.ts`
   - `src/examples/subagent-spawn.ts`
   - `src/examples/event-streaming.ts`

5. **Config** (7 files):
   - `opencode.json`
   - `.opencode/agents/test-agent.md`
   - `.opencode/agents/reviewer.md`
   - `.opencode/skills/test-skill/SKILL.md`
   - `.opencode/skills/db-query-skill/SKILL.md`
   - `.opencode/commands/hello.md`
   - `.opencode/AGENTS.md`

6. **Project files** (4 files):
   - `package.json`
   - `.env.example`
   - `README.md`
   - `.gitignore`

**Total: 27 files**

---

## Verification Plan

1. **Start server**:
   ```bash
   DEV=true bun src/index.ts
   # Should see: "OpenCode server started at http://localhost:4096"
   ```

2. **Test tools**:
   ```bash
   bun src/examples/tool-invocation.ts
   # Should see: Entry/exit logs + tool result
   ```

3. **Test sessions**:
   ```bash
   bun src/examples/session-lifecycle.ts
   # Should see: Session created → prompt sent → messages retrieved → deleted
   ```

4. **Test subagents**:
   ```bash
   bun src/examples/subagent-spawn.ts
   # Should see: Subagent session created → task executed → results returned
   ```

5. **Test events**:
   ```bash
   bun src/examples/event-streaming.ts
   # Should see: Real-time event stream with all hook invocations
   ```

6. **Link and run**:
   ```bash
   bun link
   constellation --help
   # Should work as global command
   ```

7. **Build and test**:
   ```bash
   bun run build
   ./dist/constellation --help
   # Standalone binary should work
   ```

---

## Dependencies

**Minimal package.json**:
```json
{
  "dependencies": {
    "@opencode-ai/sdk": "latest",
    "@opencode-ai/plugin": "latest"
  }
}
```

**Zero external dependencies.** Use Bun built-ins for:
- `bun:sqlite` - Observability database (SQLite)
- `Bun.SQL` or `import { SQL } from "bun"` - Postgres via Bun native SQL driver
- `util.parseArgs` - CLI parsing
- Native `fetch` - HTTP
- Bun shell (`$`) for process spawning
- No postgres.js or pg package needed - Bun's native SQL driver handles it

---

## Success Criteria

- [ ] All 8 components have working examples
- [ ] DEV flag shows entry/exit logs at every function
- [ ] LOG flag captures detailed telemetry to SQLite
- [ ] Both databases (SQLite + Postgres) initialize correctly
- [ ] `constellation` command works after `bun link`
- [ ] Standalone binary works after `bun run build`
- [ ] README documents all components with examples
- [ ] All test examples run without errors
- [ ] User can modify any component and see immediate effects (with --watch)

---

## Open Questions

None. Proceed with implementation.
