import { readFile } from "node:fs/promises";
import type { JsonObject, JsonValue } from "./contracts";
import { CliError } from "./errors";

function assertObject(value: JsonValue, requestId?: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CliError({
      code: "INVALID_REQUEST",
      exitCode: 3,
      message: "request body must be a JSON object",
      requestId
    });
  }

  return value as JsonObject;
}

export async function readCommandInput(options: {
  input?: string;
  inputFile?: string;
}): Promise<string> {
  if (options.input && options.inputFile) {
    throw new CliError({
      code: "USAGE",
      exitCode: 2,
      message: "use either --input or --input-file, not both"
    });
  }

  if (options.input) {
    return options.input;
  }

  if (options.inputFile) {
    return await readFile(options.inputFile, "utf8");
  }

  if (process.stdin.isTTY) {
    throw new CliError({
      code: "USAGE",
      exitCode: 2,
      message: "machine commands require JSON via --input, --input-file, or stdin"
    });
  }

  return await new Promise<string>((resolve, reject) => {
    let text = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      text += chunk;
    });
    process.stdin.on("end", () => resolve(text));
    process.stdin.on("error", reject);
  });
}

export function parseJsonObject(text: string): JsonObject {
  let parsed: JsonValue;
  try {
    parsed = JSON.parse(text) as JsonValue;
  } catch (error) {
    throw new CliError({
      code: "INVALID_JSON",
      exitCode: 3,
      message: `invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  return assertObject(parsed);
}

export function formatJson(value: unknown, pretty: boolean): string {
  return JSON.stringify(value, null, pretty ? 2 : 0);
}
