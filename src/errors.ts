import type { ErrorEnvelope, ErrorPayload, JsonObject } from "./contracts";
import { CONTRACT_VERSION } from "./meta";

export class CliError extends Error {
  readonly exitCode: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: JsonObject;
  readonly requestId?: string;

  constructor(params: {
    message: string;
    code: string;
    exitCode: number;
    retryable?: boolean;
    details?: JsonObject;
    requestId?: string;
  }) {
    super(params.message);
    this.name = "CliError";
    this.exitCode = params.exitCode;
    this.code = params.code;
    this.retryable = params.retryable ?? false;
    this.details = params.details;
    this.requestId = params.requestId;
  }

  toEnvelope(): ErrorEnvelope {
    const error: ErrorPayload = {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.details ? { details: this.details } : {})
    };

    return {
      contract: CONTRACT_VERSION,
      ok: false,
      ...(this.requestId ? { id: this.requestId } : {}),
      error
    };
  }
}

export function isCliError(value: unknown): value is CliError {
  return value instanceof CliError;
}

