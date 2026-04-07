import { CONTRACT_VERSION, PROVIDER_KIND } from "./meta";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type CommandName =
  | "version"
  | "contract"
  | "spawn"
  | "recv"
  | "await"
  | "send"
  | "inspect"
  | "list"
  | "cancel"
  | "run";

export const TASK_STATES = [
  "starting",
  "running",
  "needs_input",
  "completed",
  "failed",
  "timed_out",
  "cancelled",
  "stalled"
] as const;

export type TaskState = typeof TASK_STATES[number];

export const TERMINAL_TASK_STATES = [
  "completed",
  "failed",
  "timed_out",
  "cancelled"
] as const;

export type TerminalTaskState = typeof TERMINAL_TASK_STATES[number];

export const TURN_OWNERS = ["subagent", "owner", "none"] as const;
export type TurnOwner = typeof TURN_OWNERS[number];

export const AWAIT_CONDITIONS = [
  "terminal",
  "needs_input",
  "progress",
  "any_event"
] as const;
export type AwaitCondition = typeof AWAIT_CONDITIONS[number];

export const DIRECTIVE_KINDS = [
  "guidance",
  "correction",
  "override",
  "approval",
  "answer"
] as const;
export type DirectiveKind = typeof DIRECTIVE_KINDS[number];

export const TOOL_PRESETS = [
  "all",
  "read_only",
  "workspace_write",
  "custom"
] as const;
export type ToolPreset = typeof TOOL_PRESETS[number];

export const TASK_OUTCOMES = ["success", "partial", "inconclusive"] as const;
export type TaskOutcome = typeof TASK_OUTCOMES[number];

export const EVENT_KINDS = [
  "started",
  "heartbeat",
  "progress",
  "question",
  "artifact",
  "result",
  "error",
  "status_change",
  "warning"
] as const;
export type EventKind = typeof EVENT_KINDS[number];

export interface OwnerRef {
  harness: string;
  session_id: string;
}

export interface Attachment {
  type: string;
  ref: string;
  label?: string;
}

export interface ProgressInfo {
  percent: number | null;
  milestone: string | null;
}

export interface TaskError {
  code: string;
  retryable: boolean;
  details?: JsonObject;
}

export interface TaskResult {
  summary: string;
  outcome: TaskOutcome;
  confidence: number;
  confirmed: string[];
  inferred: string[];
  unverified: string[];
  deliverables: Attachment[];
  evidence: string[];
  open_issues: string[];
  recommended_next_steps: string[];
  raw_final_message?: string;
}

export interface TaskEvent {
  event_id: string;
  task_id: string;
  seq: number;
  ts: string;
  state: TaskState;
  kind: EventKind;
  turn_owner: TurnOwner;
  message: string;
  final: boolean;
  progress?: ProgressInfo;
  attachments?: Attachment[];
  result?: TaskResult;
  error?: TaskError;
  deadline_at?: string;
}

export interface TaskLimits {
  max_turns?: number;
  max_wall_time_sec?: number;
  max_total_tokens?: number;
  heartbeat_interval_sec?: number;
  idle_timeout_sec?: number;
  stall_timeout_sec?: number;
}

export interface TaskExecution {
  model?: string;
  temperature?: number;
  max_output_tokens?: number;
}

export interface TaskTools {
  preset?: ToolPreset;
  allow?: string[];
  deny?: string[];
}

export interface CompletionPolicy {
  require_structured_result?: boolean;
  require_final_summary?: boolean;
}

export interface TaskInput {
  title: string;
  goal: string;
  instructions?: string;
  cwd?: string;
  context?: JsonObject;
  labels?: Record<string, string>;
  artifacts?: Attachment[];
  limits?: TaskLimits;
  execution?: TaskExecution;
  tools?: TaskTools;
  completion?: CompletionPolicy;
}

export interface EnvelopeBase {
  contract?: string;
  id?: string;
}

export interface SpawnRequest extends EnvelopeBase {
  owner: OwnerRef;
  idempotency_key: string;
  task: TaskInput;
}

export interface RecvRequest extends EnvelopeBase {
  owner: OwnerRef;
  tasks: Record<string, string>;
  max_events?: number;
}

export interface AwaitRequest extends EnvelopeBase {
  owner: OwnerRef;
  task_id: string;
  until: AwaitCondition[];
  timeout_ms: number;
  cursor?: string;
}

export interface SendRequest extends EnvelopeBase {
  owner: OwnerRef;
  task_id: string;
  message: {
    kind?: DirectiveKind;
    content: string;
  };
}

export interface InspectRequest extends EnvelopeBase {
  owner: OwnerRef;
  task_id: string;
}

export interface ListRequest extends EnvelopeBase {
  owner: OwnerRef;
  filter?: {
    states?: TaskState[];
    labels?: Record<string, string>;
  };
}

export interface CancelRequest extends EnvelopeBase {
  owner: OwnerRef;
  task_id: string;
  reason: string;
}

export interface RunRequest extends EnvelopeBase {
  owner: OwnerRef;
  idempotency_key: string;
  task: TaskInput;
  await?: {
    timeout_ms?: number;
  };
}

export interface RecvTaskEvents {
  events: TaskEvent[];
  cursor: string | null;
}

export interface SpawnResponseData {
  task_id: string;
  state: Extract<TaskState, "starting" | "running">;
  cursor: string;
  created_at: string;
}

export interface RecvResponseData {
  tasks: Record<string, RecvTaskEvents>;
}

export interface AwaitResponseData {
  task_id: string;
  events: TaskEvent[];
  cursor: string | null;
}

export interface TaskSnapshot {
  task_id: string;
  owner: OwnerRef;
  title: string;
  state: TaskState;
  turn_owner: TurnOwner;
  created_at: string;
  started_at: string | null;
  updated_at: string;
  last_event_id: string | null;
  last_heartbeat_at: string | null;
  progress: ProgressInfo;
  result: TaskResult | null;
  error: TaskError | null;
  labels: Record<string, string>;
  available_tools: string[];
}

export interface ListTaskSummary {
  task_id: string;
  title: string;
  state: TaskState;
  turn_owner: TurnOwner;
  updated_at: string;
  progress: ProgressInfo;
}

export interface ErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
  details?: JsonObject;
}

export interface SuccessEnvelope<T = unknown> {
  contract: string;
  ok: true;
  id?: string;
  data: T;
}

export interface ErrorEnvelope {
  contract: string;
  ok: false;
  id?: string;
  error: ErrorPayload;
}

export type ResponseEnvelope<T = unknown> =
  | SuccessEnvelope<T>
  | ErrorEnvelope;

export const CONTRACT_SUMMARY = {
  contract: CONTRACT_VERSION,
  provider: {
    kind: PROVIDER_KIND,
    count: 1
  },
  runtime: {
    owner_model: "namespaced_visibility",
    worker_model: "one_process_per_task",
    queueing: "none",
    protocol_tools: [
      "task_progress",
      "task_request_input",
      "task_complete"
    ]
  },
  task_states: TASK_STATES,
  await_conditions: AWAIT_CONDITIONS,
  tool_presets: TOOL_PRESETS,
  commands: {
    version: {
      input: "none",
      output: "version envelope"
    },
    contract: {
      input: "none",
      output: "contract summary envelope"
    },
    spawn: {
      requires_owner: true,
      required_keys: ["owner", "idempotency_key", "task"]
    },
    recv: {
      requires_owner: true,
      required_keys: ["owner", "tasks"],
      response_shape: "grouped_by_task"
    },
    await: {
      requires_owner: true,
      required_keys: ["owner", "task_id", "until", "timeout_ms"]
    },
    send: {
      requires_owner: true,
      required_keys: ["owner", "task_id", "message"]
    },
    inspect: {
      requires_owner: true,
      required_keys: ["owner", "task_id"]
    },
    list: {
      requires_owner: true,
      required_keys: ["owner"]
    },
    cancel: {
      requires_owner: true,
      required_keys: ["owner", "task_id", "reason"]
    },
    run: {
      requires_owner: true,
      required_keys: ["owner", "idempotency_key", "task"]
    }
  },
  result_schema: {
    required_keys: [
      "summary",
      "outcome",
      "confidence",
      "confirmed",
      "inferred",
      "unverified",
      "deliverables",
      "evidence",
      "open_issues",
      "recommended_next_steps"
    ]
  }
} as const;
