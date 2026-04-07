export const USAGE = `usage:
  subagents help
  subagents version [--pretty]
  subagents contract [--pretty]
  subagents spawn [--input <json> | --input-file <path>] [--pretty]
  subagents recv [--input <json> | --input-file <path>] [--pretty]
  subagents await [--input <json> | --input-file <path>] [--pretty]
  subagents send [--input <json> | --input-file <path>] [--pretty]
  subagents inspect [--input <json> | --input-file <path>] [--pretty]
  subagents list [--input <json> | --input-file <path>] [--pretty]
  subagents cancel [--input <json> | --input-file <path>] [--pretty]
  subagents run [--input <json> | --input-file <path>] [--pretty]

notes:
  machine commands print one JSON object to stdout
  request JSON may be provided via --input, --input-file, or stdin
  task commands are scaffolded but not implemented yet`;

