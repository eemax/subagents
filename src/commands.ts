import type {
  AwaitRequest,
  CancelRequest,
  CommandName,
  InspectRequest,
  JsonObject,
  JsonValue,
  ListRequest,
  OwnerRef,
  RecvRequest,
  ResponseEnvelope,
  RunRequest,
  SendRequest,
  SpawnRequest,
  SuccessEnvelope
} from "./contracts";
import { CONTRACT_SUMMARY } from "./contracts";
import { CliError } from "./errors";
import { APP_NAME, APP_VERSION, CONTRACT_VERSION, PROVIDER_KIND } from "./meta";

function ok<T extends JsonValue>(data: T, requestId?: string): SuccessEnvelope<T> {
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

function assertStringArray(value: unknown, label: string, requestId?: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: `${label} must be an array of strings`,
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

function assertOwner(value: unknown, requestId?: string): OwnerRef {
  const owner = assertObject(value, "owner", requestId);
  return {
    harness: assertString(owner.harness, "owner.harness", requestId),
    session_id: assertString(owner.session_id, "owner.session_id", requestId)
  };
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

function validateTask(value: unknown, requestId?: string): SpawnRequest["task"] {
  const task = assertObject(value, "task", requestId);
  if (task.context !== undefined) {
    assertObject(task.context, "task.context", requestId);
  }
  if (task.labels !== undefined) {
    assertRecordOfStrings(task.labels, "task.labels", requestId);
  }
  if (task.inference !== undefined) {
    assertObject(task.inference, "task.inference", requestId);
  }
  if (task.constraints !== undefined) {
    assertObject(task.constraints, "task.constraints", requestId);
  }
  if (task.tool_policy !== undefined) {
    assertObject(task.tool_policy, "task.tool_policy", requestId);
  }
  if (task.completion !== undefined) {
    assertObject(task.completion, "task.completion", requestId);
  }
  return {
    title: assertString(task.title, "task.title", requestId),
    goal: assertString(task.goal, "task.goal", requestId),
    ...(task.instructions !== undefined
      ? { instructions: assertString(task.instructions, "task.instructions", requestId) }
      : {}),
    ...(task.cwd !== undefined ? { cwd: assertString(task.cwd, "task.cwd", requestId) } : {}),
    ...(task.context !== undefined ? { context: task.context as SpawnRequest["task"]["context"] } : {}),
    ...(task.labels !== undefined ? { labels: task.labels as Record<string, string> } : {}),
    ...(task.artifacts !== undefined ? { artifacts: task.artifacts as SpawnRequest["task"]["artifacts"] } : {}),
    ...(task.constraints !== undefined ? { constraints: task.constraints as SpawnRequest["task"]["constraints"] } : {}),
    ...(task.inference !== undefined ? { inference: task.inference as SpawnRequest["task"]["inference"] } : {}),
    ...(task.tool_policy !== undefined ? { tool_policy: task.tool_policy as SpawnRequest["task"]["tool_policy"] } : {}),
    ...(task.completion !== undefined ? { completion: task.completion as SpawnRequest["task"]["completion"] } : {})
  };
}

function validateSpawn(input: JsonObject): SpawnRequest {
  const { requestId } = validateEnvelopeBase(input);
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
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
      ? { max_events: assertNumber(input.max_events, "max_events", requestId) }
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
    until: assertStringArray(input.until, "until", requestId) as AwaitRequest["until"],
    timeout_ms: assertNumber(input.timeout_ms, "timeout_ms", requestId),
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
      ...(message.kind !== undefined ? { kind: assertString(message.kind, "message.kind", requestId) as SendRequest["message"]["kind"] } : {}),
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
  if (input.filter !== undefined) {
    assertObject(input.filter, "filter", requestId);
  }
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    ...(input.filter !== undefined ? { filter: input.filter as ListRequest["filter"] } : {})
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
  if (input.await !== undefined) {
    assertObject(input.await, "await", requestId);
  }
  return {
    contract: CONTRACT_VERSION,
    ...(requestId ? { id: requestId } : {}),
    owner: assertOwner(input.owner, requestId),
    task: validateTask(input.task, requestId),
    ...(input.await !== undefined ? { await: input.await as RunRequest["await"] } : {})
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
    handle: async () => ok(CONTRACT_SUMMARY as unknown as JsonValue)
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

