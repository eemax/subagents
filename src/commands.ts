import type {
  Attachment,
  AwaitRequest,
  CancelRequest,
  CommandName,
  CompletionPolicy,
  DirectiveKind,
  InspectRequest,
  JsonObject,
  ListRequest,
  OwnerRef,
  RecvRequest,
  ResponseEnvelope,
  RunRequest,
  SendRequest,
  SpawnRequest,
  SuccessEnvelope,
  TaskExecution,
  TaskInput,
  TaskLimits,
  TaskState,
  TaskTools,
  ToolPreset
} from "./contracts";
import {
  AWAIT_CONDITIONS,
  CONTRACT_SUMMARY,
  DIRECTIVE_KINDS,
  TASK_STATES,
  TOOL_PRESETS
} from "./contracts";
import { CliError } from "./errors";
import { APP_NAME, APP_VERSION, CONTRACT_VERSION, PROVIDER_KIND } from "./meta";

function ok<T>(data: T, requestId?: string): SuccessEnvelope<T> {
  return {
    contract: CONTRACT_VERSION,
    ok: true,
    ...(requestId ? { id: requestId } : {}),
    data
  };
}

function assertObject(value: unknown, label: string, requestId?: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be an object`,
      requestId
    });
  }

  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string, requestId?: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be a non-empty string`,
      requestId
    });
  }

  return value;
}

function assertOptionalString(value: unknown, label: string, requestId?: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return assertString(value, label, requestId);
}

function assertNumber(value: unknown, label: string, requestId?: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be a number`,
      requestId
    });
  }

  return value;
}

function assertPositiveNumber(value: unknown, label: string, requestId?: string): number {
  const parsed = assertNumber(value, label, requestId);
  if (parsed <= 0) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be greater than zero`,
      requestId
    });
  }
  return parsed;
}

function assertBoolean(value: unknown, label: string, requestId?: string): boolean {
  if (typeof value !== "boolean") {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be a boolean`,
      requestId
    });
  }

  return value;
}

function assertStringArray(value: unknown, label: string, requestId?: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be an array of non-empty strings`,
      requestId
    });
  }

  return value;
}

function assertRecordOfStrings(value: unknown, label: string, requestId?: string): Record<string, string> {
  const record = assertObject(value, label, requestId);
  for (const [key, item] of Object.entries(record)) {
    if (typeof item !== "string") {
      throw new CliError({
        code: "INVALID_REQUEST",
        exitCode: 3,
        message: `${label}.${key} must be a string`,
        requestId
      });
    }
  }
  return record as Record<string, string>;
}

function assertEnumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
  requestId?: string
): T[number] {
  const parsed = assertString(value, label, requestId);
  if (!allowed.includes(parsed)) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be one of: ${allowed.join(", ")}`,
      requestId
    });
  }
  return parsed as T[number];
}

function assertEnumArray<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
  requestId?: string
): T[number][] {
  const parsed = assertStringArray(value, label, requestId);
  return parsed.map((item, index) =>
    assertEnumValue(item, allowed, `${label}[${index}]`, requestId)
  );
}

function assertOwner(value: unknown, requestId?: string): OwnerRef {
  const owner = assertObject(value, "owner", requestId);
  return {
    harness: assertString(owner.harness, "owner.harness", requestId),
    session_id: assertString(owner.session_id, "owner.session_id", requestId)
  };
}

function assertAttachments(value: unknown, label: string, requestId?: string): Attachment[] {
  if (!Array.isArray(value)) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be an array`,
      requestId
    });
  }

  return value.map((item, index) => {
    const attachment = assertObject(item, `${label}[${index}]`, requestId);
    return {
      type: assertString(attachment.type, `${label}[${index}].type`, requestId),
      ref: assertString(attachment.ref, `${label}[${index}].ref`, requestId),
      ...(attachment.label !== undefined
        ? { label: assertString(attachment.label, `${label}[${index}].label`, requestId) }
        : {})
    };
  });
}

function validateEnvelopeBase(input: JsonObject): { requestId?: string } {
  const requestId = assertOptionalString(input.id, "id");
  if (input.contract !== undefined) {
    const contract = assertString(input.contract, "contract", requestId);
    if (contract !== CONTRACT_VERSION) {
      throw new CliError({
        code: "UNSUPPORTED_CONTRACT",
        exitCode: 3,
        message: `unsupported contract: ${contract}`,
        requestId
      });
    }
  }
  return { requestId };
}

function validateTaskLimits(value: unknown, requestId?: string): TaskLimits {
  const limits = assertObject(value, "task.limits", requestId);
  return {
    ...(limits.max_turns !== undefined
      ? { max_turns: assertPositiveNumber(limits.max_turns, "task.limits.max_turns", requestId) }
      : {}),
    ...(limits.max_wall_time_sec !== undefined
      ? { max_wall_time_sec: assertPositiveNumber(limits.max_wall_time_sec, "task.limits.max_wall_time_sec", requestId) }
      : {}),
    ...(limits.max_total_tokens !== undefined
      ? { max_total_tokens: assertPositiveNumber(limits.max_total_tokens, "task.limits.max_total_tokens", requestId) }
      : {}),
    ...(limits.heartbeat_interval_sec !== undefined
      ? { heartbeat_interval_sec: assertPositiveNumber(limits.heartbeat_interval_sec, "task.limits.heartbeat_interval_sec", requestId) }
      : {}),
    ...(limits.idle_timeout_sec !== undefined
      ? { idle_timeout_sec: assertPositiveNumber(limits.idle_timeout_sec, "task.limits.idle_timeout_sec", requestId) }
      : {}),
    ...(limits.stall_timeout_sec !== undefined
      ? { stall_timeout_sec: assertPositiveNumber(limits.stall_timeout_sec, "task.limits.stall_timeout_sec", requestId) }
      : {})
  };
}

function validateTaskExecution(value: unknown, requestId?: string): TaskExecution {
  const execution = assertObject(value, "task.execution", requestId);
  return {
    ...(execution.model !== undefined
      ? { model: assertString(execution.model, "task.execution.model", requestId) }
      : {}),
    ...(execution.temperature !== undefined
      ? { temperature: assertNumber(execution.temperature, "task.execution.temperature", requestId) }
      : {}),
    ...(execution.max_output_tokens !== undefined
      ? { max_output_tokens: assertPositiveNumber(execution.max_output_tokens, "task.execution.max_output_tokens", requestId) }
      : {})
  };
}

function validateTaskTools(value: unknown, requestId?: string): TaskTools {
  const tools = assertObject(value, "task.tools", requestId);
  return {
    ...(tools.preset !== undefined
      ? { preset: assertEnumValue(tools.preset, TOOL_PRESETS, "task.tools.preset", requestId) as ToolPreset }
      : {}),
    ...(tools.allow !== undefined
      ? { allow: assertStringArray(tools.allow, "task.tools.allow", requestId) }
      : {}),
    ...(tools.deny !== undefined
      ? { deny: assertStringArray(tools.deny, "task.tools.deny", requestId) }
      : {})
  };
}

function validateCompletionPolicy(value: unknown, requestId?: string): CompletionPolicy {
  const completion = assertObject(value, "task.completion", requestId);
  return {
    ...(completion.require_structured_result !== undefined
      ? {
          require_structured_result: assertBoolean(
            completion.require_structured_result,
            "task.completion.require_structured_result",
            requestId
          )
        }
      : {}),
    ...(completion.require_final_summary !== undefined
      ? {
          require_final_summary: assertBoolean(
            completion.require_final_summary,
            "task.completion.require_final_summary",
            requestId
          )
        }
      : {})
  };
}

function validateTask(value: unknown, requestId?: string): TaskInput {
  const task = assertObject(value, "task", requestId);
  if (task.context !== undefined) {
    assertObject(task.context, "task.context", requestId);
  }
  if (task.labels !== undefined) {
    assertRecordOfStrings(task.labels, "task.labels", requestId);
  }

  return {
    title: assertString(task.title, "task.title", requestId),
    goal: assertString(task.goal, "task.goal", requestId),
    ...(task.instructions !== undefined
      ? { instructions: assertString(task.instructions, "task.instructions", requestId) }
      : {}),
    ...(task.cwd !== undefined ? { cwd: assertString(task.cwd, "task.cwd", requestId) } : {}),
    ...(task.context !== undefined ? { context: task.context as TaskInput["context"] } : {}),
    ...(task.labels !== undefined ? { labels: task.labels as Record<string, string> } : {}),
    ...(task.artifacts !== undefined
      ? { artifacts: assertAttachments(task.artifacts, "task.artifacts", requestId) }
      : {}),
    ...(task.limits !== undefined ? { limits: validateTaskLimits(task.limits, requestId) } : {}),
    ...(task.execution !== undefined ? { execution: validateTaskExecution(task.execution, requestId) } : {}),
    ...(task.tools !== undefined ? { tools: validateTaskTools(task.tools, requestId) } : {}),
    ...(task.completion !== undefined
      ? { completion: validateCompletionPolicy(task.completion, requestId) }
      : {})
  };
}

function validateSpawn(input: JsonObject): SpawnRequest {
  const { requestId } = validateEnvelopeBase(input);
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    idempotency_key: assertString(input.idempotency_key, "idempotency_key", requestId),
    task: validateTask(input.task, requestId)
  };
}

function validateRecv(input: JsonObject): RecvRequest {
  const { requestId } = validateEnvelopeBase(input);
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    tasks: assertRecordOfStrings(input.tasks, "tasks", requestId),
    ...(input.max_events !== undefined
      ? { max_events: assertPositiveNumber(input.max_events, "max_events", requestId) }
      : {})
  };
}

function validateAwait(input: JsonObject): AwaitRequest {
  const { requestId } = validateEnvelopeBase(input);
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    task_id: assertString(input.task_id, "task_id", requestId),
    until: assertEnumArray(input.until, AWAIT_CONDITIONS, "until", requestId),
    timeout_ms: assertPositiveNumber(input.timeout_ms, "timeout_ms", requestId),
    ...(input.cursor !== undefined ? { cursor: assertString(input.cursor, "cursor", requestId) } : {})
  };
}

function validateSend(input: JsonObject): SendRequest {
  const { requestId } = validateEnvelopeBase(input);
  const message = assertObject(input.message, "message", requestId);
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    task_id: assertString(input.task_id, "task_id", requestId),
    message: {
      ...(message.kind !== undefined
        ? {
            kind: assertEnumValue(
              message.kind,
              DIRECTIVE_KINDS,
              "message.kind",
              requestId
            ) as DirectiveKind
          }
        : {}),
      content: assertString(message.content, "message.content", requestId)
    }
  };
}

function validateInspect(input: JsonObject): InspectRequest {
  const { requestId } = validateEnvelopeBase(input);
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    task_id: assertString(input.task_id, "task_id", requestId)
  };
}

function validateList(input: JsonObject): ListRequest {
  const { requestId } = validateEnvelopeBase(input);
  const filter = input.filter === undefined ? undefined : assertObject(input.filter, "filter", requestId);

  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    ...(filter
      ? {
          filter: {
            ...(filter.states !== undefined
              ? { states: assertEnumArray(filter.states, TASK_STATES, "filter.states", requestId) as TaskState[] }
              : {}),
            ...(filter.labels !== undefined
              ? { labels: assertRecordOfStrings(filter.labels, "filter.labels", requestId) }
              : {})
          }
        }
      : {})
  };
}

function validateCancel(input: JsonObject): CancelRequest {
  const { requestId } = validateEnvelopeBase(input);
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    task_id: assertString(input.task_id, "task_id", requestId),
    reason: assertString(input.reason, "reason", requestId)
  };
}

function validateRun(input: JsonObject): RunRequest {
  const { requestId } = validateEnvelopeBase(input);
  const awaitConfig = input.await === undefined ? undefined : assertObject(input.await, "await", requestId);

  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    idempotency_key: assertString(input.idempotency_key, "idempotency_key", requestId),
    task: validateTask(input.task, requestId),
    ...(awaitConfig
      ? {
          await: {
            ...(awaitConfig.timeout_ms !== undefined
              ? { timeout_ms: assertPositiveNumber(awaitConfig.timeout_ms, "await.timeout_ms", requestId) }
              : {})
          }
        }
      : {})
  };
}

async function notImplemented(command: CommandName, requestId?: string): Promise<ResponseEnvelope> {
  throw new CliError({
    code: "NOT_IMPLEMENTED",
    exitCode: 7,
    message: `${command} is scaffolded but not implemented yet`,
    requestId
  });
}

export type HandlerContext = {
  command: CommandName;
};

export type CommandSpec = {
  name: CommandName;
  requiresInput: boolean;
  handle: (input: JsonObject | undefined, context: HandlerContext) => Promise<ResponseEnvelope>;
};

export const COMMANDS: Record<CommandName, CommandSpec> = {
  version: {
    name: "version",
    requiresInput: false,
    handle: async () =>
      ok({
        name: APP_NAME,
        version: APP_VERSION,
        contract: CONTRACT_VERSION,
        provider: PROVIDER_KIND
      })
  },
  contract: {
    name: "contract",
    requiresInput: false,
    handle: async () => ok(CONTRACT_SUMMARY)
  },
  spawn: {
    name: "spawn",
    requiresInput: true,
    handle: async (input) => {
      const request = validateSpawn(input ?? {});
      return notImplemented("spawn", request.id);
    }
  },
  recv: {
    name: "recv",
    requiresInput: true,
    handle: async (input) => {
      const request = validateRecv(input ?? {});
      return notImplemented("recv", request.id);
    }
  },
  await: {
    name: "await",
    requiresInput: true,
    handle: async (input) => {
      const request = validateAwait(input ?? {});
      return notImplemented("await", request.id);
    }
  },
  send: {
    name: "send",
    requiresInput: true,
    handle: async (input) => {
      const request = validateSend(input ?? {});
      return notImplemented("send", request.id);
    }
  },
  inspect: {
    name: "inspect",
    requiresInput: true,
    handle: async (input) => {
      const request = validateInspect(input ?? {});
      return notImplemented("inspect", request.id);
    }
  },
  list: {
    name: "list",
    requiresInput: true,
    handle: async (input) => {
      const request = validateList(input ?? {});
      return notImplemented("list", request.id);
    }
  },
  cancel: {
    name: "cancel",
    requiresInput: true,
    handle: async (input) => {
      const request = validateCancel(input ?? {});
      return notImplemented("cancel", request.id);
    }
  },
  run: {
    name: "run",
    requiresInput: true,
    handle: async (input) => {
      const request = validateRun(input ?? {});
      return notImplemented("run", request.id);
    }
  }
};
