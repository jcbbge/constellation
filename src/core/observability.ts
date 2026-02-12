import { Database } from "bun:sqlite";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { resolve } from "path";

// Types and interfaces
export interface OmniEvent {
  schema_version: string;
  ts: string;
  event_id: string;
  machine: {
    id: string;
    hostname?: string;
  };
  context: {
    session_id?: string;
    actor?: string;
    phase?: string;
  };
  event: {
    kind: string;
    tags?: string[];
  };
  source: {
    component: string;
    version?: string;
  };
  data: Record<string, unknown>;
  parent?: {
    event_id?: string;
    trace_id?: string;
    span_id?: string;
  };
}

interface QueryFilters {
  kind?: string;
  session_id?: string;
  machine_id?: string;
  start_ts?: string;
  end_ts?: string;
  limit?: number;
  offset?: number;
}

class Observability {
  private db: Database;
  private machineId: string;
  private dataDir: string;
  private machineIdFile: string;

  constructor(dataDir: string = "data") {
    this.dataDir = resolve(dataDir);
    this.machineIdFile = resolve(this.dataDir, ".machine_id");

    // Initialize machine ID
    this.machineId = this.initializeMachineId();

    // Initialize database
    this.db = new Database(resolve(this.dataDir, "observability.db"));
    this.initializeSchema();
  }

  private initializeMachineId(): string {
    // Check environment variable first
    if (process.env.MACHINE_ID) {
      return process.env.MACHINE_ID;
    }

    // Check if machine ID file exists
    if (existsSync(this.machineIdFile)) {
      return readFileSync(this.machineIdFile, "utf-8").trim();
    }

    // Generate new machine ID
    const randomStr = randomBytes(3).toString("hex").substring(0, 6);
    const newMachineId = `constellation-${randomStr}`;

    // Store for future runs
    writeFileSync(this.machineIdFile, newMachineId, "utf-8");

    return newMachineId;
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        schema_version TEXT NOT NULL,
        ts TEXT NOT NULL,
        event_id TEXT PRIMARY KEY,
        machine_id TEXT NOT NULL,
        machine_hostname TEXT,
        context_session_id TEXT,
        context_actor TEXT,
        context_phase TEXT,
        event_kind TEXT NOT NULL,
        event_tags TEXT,
        source_component TEXT NOT NULL,
        source_version TEXT,
        data TEXT NOT NULL,
        parent_event_id TEXT,
        parent_trace_id TEXT,
        parent_span_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_kind ON events(event_kind)`);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_session_id ON events(context_session_id)`,
    );
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_ts ON events(ts)`);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_machine_id ON events(machine_id)`,
    );
  }

  private generateULID(): string {
    // Simple ULID generation (timestamp + randomness)
    const now = Date.now();
    const random = randomBytes(8).toString("hex").substring(0, 12);
    return `${now.toString(36)}${random}`.toUpperCase().padStart(26, "0");
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  private writeEventToDb(event: OmniEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (
        schema_version, ts, event_id, machine_id, machine_hostname,
        context_session_id, context_actor, context_phase,
        event_kind, event_tags, source_component, source_version,
        data, parent_event_id, parent_trace_id, parent_span_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.schema_version,
      event.ts,
      event.event_id,
      event.machine.id,
      event.machine.hostname,
      event.context.session_id,
      event.context.actor,
      event.context.phase,
      event.event.kind,
      event.event.tags?.join(",") || null,
      event.source.component,
      event.source.version,
      JSON.stringify(event.data),
      event.parent?.event_id,
      event.parent?.trace_id,
      event.parent?.span_id,
    );
  }

  private createBaseEvent(
    kind: string,
    data: Record<string, unknown>,
    options: {
      sessionId?: string;
      actor?: string;
      phase?: string;
      component: string;
      tags?: string[];
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    },
  ): OmniEvent {
    return {
      schema_version: "1.0",
      ts: this.getCurrentTimestamp(),
      event_id: this.generateULID(),
      machine: {
        id: this.machineId,
      },
      context: {
        session_id: options.sessionId,
        actor: options.actor,
        phase: options.phase,
      },
      event: {
        kind,
        tags: options.tags,
      },
      source: {
        component: options.component,
      },
      data,
      parent: {
        event_id: options.parentEventId,
        trace_id: options.parentTraceId,
        span_id: options.parentSpanId,
      },
    };
  }

  // Generic event writer
  public writeEvent(
    kind: string,
    data: Record<string, unknown>,
    options: {
      sessionId?: string;
      actor?: string;
      phase?: string;
      component?: string;
      tags?: string[];
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    },
  ): string {
    const event = this.createBaseEvent(kind, data, {
      ...options,
      component: options.component || "constellation",
    });
    this.writeEventToDb(event);
    return event.event_id;
  }

  // constellation:tool_execute
  public writeToolExecute(
    toolName: string,
    args: Record<string, unknown>,
    phase: "before" | "after",
    options: {
      sessionId?: string;
      agent?: string;
      result?: unknown;
      duration_ms?: number;
      error?: string;
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      tool_name: toolName,
      args,
      context_session_id: options.sessionId,
      context_agent: options.agent,
      phase,
    };

    if (phase === "after") {
      if (options.result !== undefined) data.result = options.result;
      if (options.duration_ms !== undefined)
        data.duration_ms = options.duration_ms;
    }
    if (options.error) data.error = options.error;

    return this.writeEvent("constellation:tool_execute", data, {
      sessionId: options.sessionId,
      component: "tool-executor",
      phase,
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // constellation:hook_fired
  public writeHookFired(
    hookName: string,
    pluginName: string,
    options: {
      sessionId?: string;
      eventPayload?: Record<string, unknown>;
      duration_ms?: number;
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      hook_name: hookName,
      plugin_name: pluginName,
      context_session_id: options.sessionId,
    };

    if (options.eventPayload) data.event_payload = options.eventPayload;
    if (options.duration_ms !== undefined)
      data.duration_ms = options.duration_ms;

    return this.writeEvent("constellation:hook_fired", data, {
      sessionId: options.sessionId,
      component: "hook-system",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // constellation:agent_spawned
  public writeAgentSpawned(
    agentName: string,
    parentSessionId: string,
    childSessionId: string,
    options: {
      agentMode?: "subagent" | "primary";
      model?: string;
      toolsEnabled?: string[];
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      agent_name: agentName,
      parent_session_id: parentSessionId,
      child_session_id: childSessionId,
      agent_mode: options.agentMode || "subagent",
    };

    if (options.model) data.model = options.model;
    if (options.toolsEnabled) data.tools_enabled = options.toolsEnabled;

    return this.writeEvent("constellation:agent_spawned", data, {
      sessionId: parentSessionId,
      component: "agent-manager",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // constellation:skill_loaded
  public writeSkillLoaded(
    skillName: string,
    skillPath: string,
    options: {
      sessionId?: string;
      agent?: string;
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      skill_name: skillName,
      skill_path: skillPath,
      context_session_id: options.sessionId,
      context_agent: options.agent,
    };

    return this.writeEvent("constellation:skill_loaded", data, {
      sessionId: options.sessionId,
      component: "skill-loader",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // constellation:command_executed
  public writeCommandExecuted(
    commandName: string,
    options: {
      sessionId?: string;
      args?: string[];
      duration_ms?: number;
      result?: string;
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      command_name: commandName,
      context_session_id: options.sessionId,
    };

    if (options.args) data.args = options.args;
    if (options.duration_ms !== undefined)
      data.duration_ms = options.duration_ms;
    if (options.result) data.result = options.result;

    return this.writeEvent("constellation:command_executed", data, {
      sessionId: options.sessionId,
      component: "command-runner",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // constellation:plugin_event
  public writePluginEvent(
    pluginName: string,
    eventType: string,
    options: {
      sessionId?: string;
      eventData?: Record<string, unknown>;
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      plugin_name: pluginName,
      event_type: eventType,
      context_session_id: options.sessionId,
    };

    if (options.eventData) data.event_data = options.eventData;

    return this.writeEvent("constellation:plugin_event", data, {
      sessionId: options.sessionId,
      component: "plugin-manager",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // error kind
  public writeError(
    errorType: string,
    message: string,
    options: {
      errorCode?: string;
      retryable?: boolean;
      transient?: boolean;
      sessionId?: string;
      toolName?: string;
      invariantsViolated?: string[];
      rawOutput?: string;
      recoveryActions?: string[];
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      error_type: errorType,
      message,
      context_session_id: options.sessionId,
      retryable: options.retryable ?? false,
      transient: options.transient ?? false,
    };

    if (options.errorCode) data.error_code = options.errorCode;
    if (options.toolName) data.tool_name = options.toolName;
    if (options.invariantsViolated)
      data.invariants_violated = options.invariantsViolated;
    if (options.rawOutput) data.raw_output = options.rawOutput;
    if (options.recoveryActions)
      data.recovery_actions = options.recoveryActions;

    return this.writeEvent("error", data, {
      sessionId: options.sessionId,
      component: "error-handler",
      tags: ["error", errorType],
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // metric kind
  public writeMetric(
    metricName: string,
    value: number,
    unit: string,
    options: {
      sessionId?: string;
      dimensions?: Record<string, unknown>;
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      metric_name: metricName,
      value,
      unit,
      context_session_id: options.sessionId,
    };

    if (options.dimensions) data.dimensions = options.dimensions;

    return this.writeEvent("metric", data, {
      sessionId: options.sessionId,
      component: "metrics",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // span kind
  public writeSpan(
    spanId: string,
    name: string,
    status: "started" | "completed" | "failed",
    options: {
      sessionId?: string;
      parentSpanId?: string;
      traceId?: string;
      startTs?: string;
      endTs?: string;
      duration_ms?: number;
      parentEventId?: string;
      parentTraceId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      span_id: spanId,
      name,
      status,
      start_ts: options.startTs || this.getCurrentTimestamp(),
      context_session_id: options.sessionId,
    };

    if (options.parentSpanId) data.parent_span_id = options.parentSpanId;
    if (options.traceId) data.trace_id = options.traceId;
    if (options.endTs) data.end_ts = options.endTs;
    if (options.duration_ms !== undefined)
      data.duration_ms = options.duration_ms;

    return this.writeEvent("span", data, {
      sessionId: options.sessionId,
      component: "span-manager",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // session lifecycle events
  public writeSessionStart(
    sessionId: string,
    options: {
      agent?: string;
      model?: string;
      directory?: string;
      parentSessionId?: string;
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      session_id: sessionId,
    };

    if (options.agent) data.agent = options.agent;
    if (options.model) data.model = options.model;
    if (options.directory) data.directory = options.directory;
    if (options.parentSessionId)
      data.parent_session_id = options.parentSessionId;

    return this.writeEvent("session_start", data, {
      sessionId,
      component: "session-manager",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  public writeSessionEnd(
    sessionId: string,
    options: {
      duration_ms?: number;
      messageCount?: number;
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      session_id: sessionId,
    };

    if (options.duration_ms !== undefined)
      data.duration_ms = options.duration_ms;
    if (options.messageCount !== undefined)
      data.message_count = options.messageCount;

    return this.writeEvent("session_end", data, {
      sessionId,
      component: "session-manager",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  public writeSessionSummary(
    sessionId: string,
    summary: string,
    options: {
      parentEventId?: string;
      parentTraceId?: string;
      parentSpanId?: string;
    } = {},
  ): string {
    const data: Record<string, unknown> = {
      session_id: sessionId,
      summary,
    };

    return this.writeEvent("session_summary", data, {
      sessionId,
      component: "session-manager",
      parentEventId: options.parentEventId,
      parentTraceId: options.parentTraceId,
      parentSpanId: options.parentSpanId,
    });
  }

  // Query interface
  public queryEvents(filters: QueryFilters): OmniEvent[] {
    let query = "SELECT * FROM events WHERE 1=1";
    const params: unknown[] = [];

    if (filters.kind) {
      query += " AND event_kind = ?";
      params.push(filters.kind);
    }
    if (filters.session_id) {
      query += " AND context_session_id = ?";
      params.push(filters.session_id);
    }
    if (filters.machine_id) {
      query += " AND machine_id = ?";
      params.push(filters.machine_id);
    }
    if (filters.start_ts) {
      query += " AND ts >= ?";
      params.push(filters.start_ts);
    }
    if (filters.end_ts) {
      query += " AND ts <= ?";
      params.push(filters.end_ts);
    }

    query += " ORDER BY ts DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += " OFFSET ?";
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      schema_version: row.schema_version,
      ts: row.ts,
      event_id: row.event_id,
      machine: {
        id: row.machine_id,
        hostname: row.machine_hostname,
      },
      context: {
        session_id: row.context_session_id,
        actor: row.context_actor,
        phase: row.context_phase,
      },
      event: {
        kind: row.event_kind,
        tags: row.event_tags ? row.event_tags.split(",") : undefined,
      },
      source: {
        component: row.source_component,
        version: row.source_version,
      },
      data: JSON.parse(row.data),
      parent: {
        event_id: row.parent_event_id,
        trace_id: row.parent_trace_id,
        span_id: row.parent_span_id,
      },
    }));
  }

  public close(): void {
    this.db.close();
  }

  public getMachineId(): string {
    return this.machineId;
  }
}

// Singleton instance
let observabilityInstance: Observability | null = null;

export function initializeObservability(
  dataDir: string = "data",
): Observability {
  if (!observabilityInstance) {
    observabilityInstance = new Observability(dataDir);
  }
  return observabilityInstance;
}

export function getObservability(): Observability {
  if (!observabilityInstance) {
    observabilityInstance = new Observability();
  }
  return observabilityInstance;
}

export default Observability;
