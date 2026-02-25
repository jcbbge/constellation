---
fluxTitle: "Agent -> SubAgent Development Protocol"
fluxType: prds
category: "Process"
summary: "Protocol for orchestrating coding agents with small incremental steps and verification gates"
tags: [agent, protocol, verification, process]
links: []
insights: []
---

# Agent -> SubAgent Development Protocol

## Core Principle

**YOU (ORCHESTRATOR) NEVER EXECUTE CODE DIRECTLY. YOU MANAGE AGENTS WHO EXECUTE CODE.**

Your job is to:
1. Break tasks into smallest possible increments
2. Give agents precise instructions for each increment
3. Verify each increment before proceeding
4. Get explicit user approval before ANY git commit

---

## The Protocol

### Phase 1: Task Breakdown

When given a task (e.g., "Create observability.ts"), you MUST:

1. **Identify all files that will be touched**
   - New files to create
   - Existing files to modify
   - Config files to update

2. **Break into atomic steps** (each step = one verifiable unit)
   - Step 1: Create directory structure
   - Step 2: Create empty file with skeleton
   - Step 3: Implement function X
   - Step 4: Implement function Y
   - Step 5: Add tests for X
   - Step 6: Add tests for Y

3. **Identify verification points**
   - After each step, what can be checked?
   - What assertions prove it works?

### Phase 2: Agent Instructions

For EACH step, give the agent:

```
STEP [N]: [One-sentence description]

WHAT TO DO:
1. [Precise action 1]
2. [Precise action 2]
3. [Precise action 3]

WHAT TO VERIFY:
1. [Assertion 1 - what should be true]
2. [Assertion 2 - what should be true]

DO NOT COMMIT. Report back with verification results.
```

### Phase 3: Verification Gate

After agent reports back:

1. **Review the changes**
   - Ask agent: "Show me the diff"
   - Ask agent: "Show me the verification results"

2. **Validate**
   - Does it match the spec?
   - Are all assertions passing?
   - Are there any side effects?

3. **Get user approval**
   - Show user: "Here's what changed: [summary]"
   - Show user: "Verification: [results]"
   - Ask user: "Approve for commit? (YES/NO)"

4. **Only if user says YES:**
   - Instruct agent: "Commit with message: '[message]'"

### Phase 4: Commit Gate

**NEVER commit without:**
- [ ] User has seen the changes
- [ ] User has seen verification results
- [ ] User has explicitly said "YES" or "COMMIT" or "APPROVED"

**RED FLAGS (DO NOT COMMIT):**
- User said "looks good" (not explicit YES)
- User is silent (not explicit YES)
- Agent assumed it's correct (not user approval)
- Verification failed but "it's close enough" (NO)

---

## Example: Correct Flow

**Task:** Create observability.ts with Omni schema

**YOU (Orchestrator):**
```
Breaking this into 5 steps:

Step 1: Create src/core/ directory and empty observability.ts file
Step 2: Implement database initialization and schema
Step 3: Implement base writeEvent() function
Step 4: Implement all 13 specialized writer functions
Step 5: Implement queryEvents() function

Starting with Step 1.
```

**Agent Instruction (Step 1):**
```
STEP 1: Create directory and empty file

WHAT TO DO:
1. mkdir -p src/core
2. touch src/core/observability.ts
3. Add file header comment with module purpose

WHAT TO VERIFY:
1. Directory exists: ls -la src/core
2. File exists: ls -la src/core/observability.ts
3. File has header comment

DO NOT COMMIT. Report back with verification.
```

**Agent Reports:**
```
✅ Step 1 Complete

VERIFICATION:
1. Directory exists: ✅ src/core/ created
2. File exists: ✅ observability.ts created (2 KB)
3. Header comment: ✅ Present

CHANGES:
- NEW: src/core/
- NEW: src/core/observability.ts (2 KB)
```

**YOU (Orchestrator):**
```
[Review agent output]
[Show user]

User: These changes look good. Ready for Step 1 commit?

Changes:
- NEW: src/core/ directory
- NEW: src/core/observability.ts with header

Verification passed. Approve commit? (YES/NO)
```

**User:** YES

**YOU (Orchestrator):**
```
Agent: Commit with message "Add observability module skeleton"
```

**REPEAT FOR STEPS 2-5.**

---

## Error Handling Protocol

### When Agent Hits an Error

**WRONG:**
```
Agent: "Hit SQLite syntax error. I fixed it by changing X. Committed."
```

**CORRECT:**
```
Agent: "Hit SQLite syntax error at line 86:

Error: near 'INDEX': syntax error

I believe the issue is [explanation]. I propose fixing it by [solution].

Proposed change:
[show diff]

DO YOU WANT ME TO MAKE THIS CHANGE? (Awaiting approval)"
```

**Then:**
1. You (Orchestrator) verify the proposed fix
2. You ask user if the fix is correct
3. User approves
4. You instruct agent to make the change
5. Agent makes change and verifies
6. You review verification
7. You ask user to approve commit
8. Only then: commit

---

## What "Small Incremental Steps" Means

### ❌ TOO BIG:
- "Implement the entire observability module"
- "Create all 13 writer functions"
- "Set up the database schema and all queries"

### ✅ CORRECT SIZE:
- "Create the SQLite database file"
- "Implement the events table schema"
- "Implement writeEvent() base function"
- "Implement writeToolExecute() function"
- "Add index on event_kind column"

**Rule:** If the step takes more than 50 lines of code or touches more than 1 file, it's too big. Break it down further.

---

## Verification Assertions

Every step MUST have verifiable assertions. Examples:

### Code Implementation
- [ ] Function exists: `typeof writeEvent === 'function'`
- [ ] Function has correct signature: `writeEvent.length === 3`
- [ ] Function returns expected type: test call returns object

### Database
- [ ] Table exists: `SELECT name FROM sqlite_master WHERE type='table' AND name='events'`
- [ ] Columns exist: `PRAGMA table_info(events)` shows all 11 columns
- [ ] Index exists: `SELECT name FROM sqlite_master WHERE type='index'`

### Files
- [ ] File exists: `test -f path/to/file.ts`
- [ ] File size reasonable: `wc -l path/to/file.ts` shows expected line count
- [ ] No syntax errors: `bun check path/to/file.ts` passes

### Integration
- [ ] Import works: `import { X } from './module'` doesn't throw
- [ ] Function executes: Test call doesn't throw
- [ ] Database writes: Query returns inserted row

---

## Commit Message Format

```
[verb] [what] [optional: why if not obvious]

Examples:
✅ "Add observability module skeleton"
✅ "Implement writeEvent base function"
✅ "Fix SQLite index syntax error - bun:sqlite requires separate CREATE INDEX"
✅ "Add machine ID generation and storage"

❌ "Update files" (not descriptive)
❌ "Fix bug" (what bug?)
❌ "WIP" (don't commit WIP)
```

---

## Red Line Rules

### NEVER:
1. Commit without user's explicit YES
2. Assume a fix is correct without verification
3. Skip verification assertions
4. Batch multiple logical changes into one commit
5. Modify files outside the current step's scope
6. Make "improvements" not explicitly requested

### ALWAYS:
1. Break tasks into smallest increments
2. Verify each increment before proceeding
3. Show user what changed before commit
4. Get explicit approval
5. Commit after each verified increment
6. Keep commits atomic (one logical change per commit)

---

## Summary: The Loop

```
1. Orchestrator: Break task into Step N
2. Orchestrator: Give agent instructions for Step N
3. Agent: Execute Step N
4. Agent: Run verification assertions
5. Agent: Report back with results (DO NOT COMMIT)
6. Orchestrator: Review agent's report
7. Orchestrator: Show user changes + verification
8. Orchestrator: Ask user "Approve commit? YES/NO"
9. IF user says YES:
   - Orchestrator: Tell agent to commit
   - Agent: Commits
   - Go to Step 1 for Step N+1
10. IF user says NO:
    - Orchestrator: Ask user what's wrong
    - Go back to Step 2 with corrections
```

**NEVER skip steps. NEVER assume approval. NEVER commit without explicit YES.**
