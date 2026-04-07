# Architecture

## Overview

`subagents` is a standalone CLI, not an embedded in-process tool. Other harnesses call the `subagents` binary as a machine interface.

The design direction is:
- Bun TypeScript runtime
- file-backed task store
- background worker subprocess per active task
- OpenRouter completions as the only provider in v1
- owner-scoped isolation keyed by harness session identity

## Primary Decisions

### 1. CLI-first, daemon-free

We are following the durable CLI pattern from `headless-agent`, not the in-memory manager shape from `agent-commander`.

That means:
- each CLI invocation is short-lived
- long-running work lives in worker subprocesses
- task state is durable on disk
- callers poll or await via follow-up CLI invocations

### 2. Owner-scoped visibility

Every task belongs to one owner:

```text
owner = {
  harness: string,
  session_id: string
}
```

The runtime derives an internal `owner_key = hash(harness + ":" + session_id)`.

All lookup APIs are filtered by `owner_key`. Cross-owner requests must fail as if the task does not exist.

### 3. Frozen execution context at spawn

Spawn-time values are snapshotted into task metadata:
- `cwd`
- labels
- context
- inference settings
- constraints
- tool policy

The caller can change later, but the running task does not inherit those changes.

### 4. No recursive subagents

The standalone runtime owns its own tools and worker loop. Subagents do not get access to a `subagents` tool.

### 5. One provider only

V1 only targets OpenRouter completions. The codebase should reflect that directly:
- one provider adapter
- one request/response model
- no abstract multi-provider layer beyond what we clearly need

## Planned Repo Layout

```text
bin/
  subagents              Bun launcher
docs/
  architecture.md
  command-contract.md
src/
  cli.ts                 CLI entrypoint
  commands.ts            command registry and stub handlers
  contracts.ts           request/response and domain types
  errors.ts              stable CLI/runtime errors
  json.ts                JSON input/output helpers
  meta.ts                app metadata and contract version
  usage.ts               help text
  runtime/
    openrouter.ts        OpenRouter-only provider surface
    worker.ts            worker process contracts
  store/
    layout.ts            owner/task path helpers
```

## Planned Storage Layout

```text
~/.subagents/
  owners/
    <owner-key>/
      owner.json
      tasks/
        <task-id>/
          task.json
          state.json
          events.jsonl
          inbox.jsonl
          worker.pid
          lock
          runs/
            <run-id>/
              transcript.jsonl
              tool-outputs/
              artifacts/
```

## Worker Model

Planned control flow:

1. `subagents spawn` writes task metadata.
2. The CLI starts `subagents internal-worker --task-id <id> --owner-key <key>`.
3. The worker claims the task lock, updates state, and runs the agent loop.
4. The worker appends events and heartbeats to disk.
5. `recv`, `await`, `inspect`, and `list` read that durable state.

This keeps the user-facing command surface stable while allowing workers to outlive the launching process.

## Command Discipline

- stdout: exactly one JSON object for machine commands
- stderr: human diagnostics only
- no streaming in v1
- no shell-oriented text output for task commands

## What This Skeleton Intentionally Does Not Do Yet

- store real tasks
- talk to OpenRouter
- spawn workers
- implement event cursors
- perform tool execution
- compact or summarize history

This repo state is meant to lock the external contract before runtime work starts.

