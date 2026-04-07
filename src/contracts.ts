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

export type TaskState =
  | "queued"
  | "starting"
  | "running"
  | "needs_input"
  | "completed"
  | "failed"
  | "timed_out"
  | "cancelled"
  | "stalled";

export type TurnOwner = "subagent" | "owner" | "none";
export type AwaitCondition = "terminal" | "requires_input" | "progress" | "any_event";
export type MessageKind = "guidance" | "answer" | "nudge";
export type ToolPolicyMode = "default" | "read_only";

export interface OwnerRef {
  harness: string;
  session_id: string;
}

export interface ArtifactRef {
  type: string;
  ref: string;
  label?: string;
}

export interface TaskConstraints {
  max_turns?: number;
  max_wall_time_sec?: number;
  max_total_tokens?: number;
  heartbeat_interval_sec?: number;
  idle_timeout_sec?: number;
  stall_timeout_sec?: number;
}

export interface InferenceConfig {
  model?: string;
  temperature?: number;
  max_output_tokens?: number;
}

export interface ToolPolicy {
  mode?: ToolPolicyMode;
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
  artifacts?: ArtifactRef[];
  constraints?: TaskConstraints;
  inference?: InferenceConfig;
  tool_policy?: ToolPolicy;
  completion?: CompletionPolicy;
}

export interface EnvelopeBase {
  contract?: string;
  id?: string;
}

export interface SpawnRequest extends EnvelopeBase {
  owner: OwnerRef;
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
    kind?: MessageKind;
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
  task: TaskInput;
  await?: {
    timeout_ms?: number;
  };
}

export interface ErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
  details?: JsonObject;
}

export interface SuccessEnvelope<T extends JsonValue> {
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

export type ResponseEnvelope<T extends JsonValue = JsonValue> =
  | SuccessEnvelope<T>
  | ErrorEnvelope;

export const CONTRACT_SUMMARY = {
  contract: CONTRACT_VERSION,
  provider: {
    kind: PROVIDER_KIND,
    count: 1
  },
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
      required_keys: ["owner", "task"]
    },
    recv: {
      requires_owner: true,
      required_keys: ["owner", "tasks"]
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
      required_keys: ["owner", "task"]
    }
  }
} as const;

