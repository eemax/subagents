import { COMMANDS } from "./commands";
import { isCliError, CliError } from "./errors";
import { formatJson, parseJsonObject, readCommandInput } from "./json";
import { USAGE } from "./usage";

type ParsedArgs = {
  command?: keyof typeof COMMANDS | "help";
  input?: string;
  inputFile?: string;
  pretty: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const first = args.shift();
  if (!first || first === "help" || first === "--help" || first === "-h") {
    return { command: "help", pretty: false };
  }

  let input: string | undefined;
  let inputFile: string | undefined;
  let pretty = false;

  while (args.length > 0) {
    const arg = args.shift()!;
    switch (arg) {
      case "--input":
        input = args.shift();
        if (input === undefined) {
          throw new CliError({
            code: "USAGE",
            exitCode: 2,
            message: "--input requires a value"
          });
        }
        break;
      case "--input-file":
        inputFile = args.shift();
        if (inputFile === undefined) {
          throw new CliError({
            code: "USAGE",
            exitCode: 2,
            message: "--input-file requires a value"
          });
        }
        break;
      case "--pretty":
        pretty = true;
        break;
      default:
        throw new CliError({
          code: "USAGE",
          exitCode: 2,
          message: `unknown argument: ${arg}`
        });
    }
  }

  if (!(first in COMMANDS)) {
    throw new CliError({
      code: "USAGE",
      exitCode: 2,
      message: `unknown command: ${first}`
    });
  }

  return {
    command: first as keyof typeof COMMANDS,
    input,
    inputFile,
    pretty
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const { command } = parsed;
  if (!command || command === "help") {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const spec = COMMANDS[command];
  let input;
  if (spec.requiresInput) {
    const text = await readCommandInput({
      input: parsed.input,
      inputFile: parsed.inputFile
    });
    input = parseJsonObject(text);
  }

  const response = await spec.handle(input, { command: spec.name });
  process.stdout.write(`${formatJson(response, parsed.pretty)}\n`);
}

void main().catch((error: unknown) => {
  if (isCliError(error)) {
    const shouldPrintJson = process.argv.length > 2 && !["help", "--help", "-h"].includes(process.argv[2] ?? "");
    if (shouldPrintJson) {
      process.stdout.write(`${formatJson(error.toEnvelope(), true)}\n`);
    } else {
      process.stderr.write(`${error.message}\n`);
      process.stderr.write(`${USAGE}\n`);
    }
    process.exit(error.exitCode);
    return;
  }

  const wrapped = new CliError({
    code: "INTERNAL",
    exitCode: 10,
    message: error instanceof Error ? error.message : String(error)
  });
  process.stdout.write(`${formatJson(wrapped.toEnvelope(), true)}\n`);
  process.exit(wrapped.exitCode);
});
