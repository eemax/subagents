# subagents

`subagents` is a standalone, non-interactive CLI for spawning and managing owner-namespaced background subagents.

This repo is intentionally in skeleton mode:
- command and JSON contracts are defined
- Bun TypeScript package layout is in place
- provider direction is fixed to OpenRouter completions
- task commands validate request envelopes, then return `NOT_IMPLEMENTED`

Implemented now:
- `subagents help`
- `subagents version`
- `subagents contract`
- request envelope parsing from `--input`, `--input-file`, or stdin
- stable JSON response envelope and error shape
- typed command surface for `spawn`, `recv`, `await`, `send`, `inspect`, `list`, `cancel`, and `run`

Planned next:
- durable owner/task store
- idempotent `spawn`
- immediate-start worker pool
- worker subprocess lifecycle
- grouped `recv` and blocking `await`
- OpenRouter-backed agent loop
- pinned `cwd`, heartbeats, and owner namespacing
- internal protocol tools for progress, input requests, and completion

## Quick Start

```bash
bun install
bun run src/cli.ts help
bun run src/cli.ts version --pretty
bun run src/cli.ts contract --pretty
```

Example contract validation:

```bash
echo '{
  "contract": "subagents.v1alpha1",
  "owner": { "harness": "codex", "session_id": "sess_123" },
  "idempotency_key": "inspect_repo_001",
  "task": {
    "title": "Inspect repo",
    "goal": "Summarize the repository structure.",
    "cwd": "/tmp/project",
    "tools": { "preset": "read_only" }
  }
}' | bun run src/cli.ts spawn --pretty
```

That currently exits with `NOT_IMPLEMENTED`, but the request shape is the one we will build against.

## CLI Principles

- Non-interactive only
- JSON on stdout for machine commands
- stderr reserved for human diagnostics
- owner-scoped task visibility and namespacing
- immediate-start worker pool with no public queue
- tool presets are convenience bundles, not sandboxing
- one provider in v1: OpenRouter completions

## Docs

- [Command Contract](./docs/command-contract.md)
- [Architecture](./docs/architecture.md)
- [V1.0 Milestone](./docs/v1-milestone.md)
