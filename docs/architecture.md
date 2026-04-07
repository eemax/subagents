# Architecture

## Overview

`subagents` is a standalone CLI, not an embedded in-process tool. Other harnesses call the `subagents` binary as a machine interface.

The current design direction is:
- Bun TypeScript runtime
- file-backed JSON and JSONL state
- one background worker process per active task
- a global active-task pool with immediate-start semantics
- OpenRouter completions as the only provider in v1
- owner-scoped namespacing keyed by harness session identity

## Primary Decisions

### 1. CLI-first, daemon-free

We are following the durable CLI pattern from `headless-agent`, not the in-memory manager shape from `agent-commander`.

That means:
- each CLI invocation is short-lived
- long-running work lives in worker subprocesses
- task state is durable on disk
- callers poll or await via follow-up CLI invocations

### 2. Owner namespacing, not security isolation

Every task belongs to one owner namespace:

```text
owner = {
  harness: string,
  session_id: string
}
```

The runtime derives an internal `owner_key = hash(harness + ":" + session_id)`.

This key is used so multiple concurrent supervisors can keep their task sets separate. It is not meant to be a strong security boundary.

### 3. Immediate-start pool, no public queue

The runtime uses a pool of active worker processes.

Public semantics:
- `spawn` tries to start a worker immediately
- if a task slot is available, the task enters `starting` and then `running`
- if the pool is full, `spawn` fails with a pool-cap error
- the public contract does not pretend there is a durable queue until we build a real scheduler

### 4. Frozen execution context at spawn

Spawn-time values are snapshotted into task metadata:
- `cwd`
- labels
- context
- limits
- execution settings
- tool preset and allow/deny lists
- completion requirements

The caller can change later, but the running task does not inherit those changes.

### 5. Internal protocol tools over text markers

The worker runtime should prefer explicit internal machine actions instead of parsing assistant prose markers.

Planned internal protocol tools:
- `task_progress`
- `task_request_input`
- `task_complete`

This keeps progress reporting, input pauses, and final completion structured and testable.

### 6. One provider only

V1 only targets OpenRouter completions. The codebase should reflect that directly:
- one provider adapter
- one request/response model
- no abstract multi-provider layer beyond what we clearly need

### 7. Tool presets are convenience bundles, not sandboxing

The runtime should support tool presets such as:
- `all`
- `read_only`
- `workspace_write`
- `custom`

These presets are about spawn-time configuration, not safety boundaries.

## Planned Repo Layout

```text
bin/
  subagents                  Bun launcher
docs/
  architecture.md
  command-contract.md
  v1-milestone.md
src/
  cli.ts                     CLI entrypoint
  commands.ts                command registry and validation
  contracts.ts               request/response and domain types
  errors.ts                  stable CLI/runtime errors
  json.ts                    JSON input/output helpers
  meta.ts                    app metadata and contract version
  usage.ts                   help text
  runtime/
    openrouter.ts            OpenRouter-only provider surface
    protocol-tools.ts        internal progress/input/completion tool shapes
    worker.ts                worker process contracts
  store/
    layout.ts                owner/task path helpers
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
          lock
          runs/
            <run-id>/
              transcript.jsonl
              tool-outputs/
              artifacts/
  runtime/
    active/
      <task-id>.json
```

Design intent:
- `task.json` holds immutable spawn-time inputs
- `state.json` holds the latest mutable state snapshot
- `events.jsonl` is append-only
- `inbox.jsonl` records owner-to-worker messages
- `runtime/active/<task-id>.json` acts as the pool lease and heartbeat record

## Worker Model

Planned control flow:

1. `subagents spawn` validates input and writes task metadata.
2. The CLI attempts to acquire an active pool slot.
3. If the pool is full, `spawn` fails immediately.
4. If a slot is available, the CLI starts `subagents internal-worker --task-id <id> --owner-key <key>`.
5. The worker claims the task lock, updates state, and runs the agent loop.
6. The worker appends events, writes heartbeats, and reads `inbox.jsonl` for owner messages.
7. On terminal completion, the worker writes final state, releases the pool lease, and exits.

This keeps the user-facing command surface stable while allowing workers to outlive the launching process.

## Event And Cursor Model

The external control plane is event-driven:
- each task has an append-only event log
- `spawn` returns the first cursor
- `recv` polls multiple tasks at once and returns events grouped by task
- `await` blocks on one task until a condition is met

The worker owns event emission. Supervisors only consume events and send messages.

## Command Discipline

- stdout: exactly one JSON object for machine commands
- stderr: human diagnostics only
- no shell-oriented text output for task commands

The stable contract is machine-readable JSON. If we later support streaming, it should be additive and not break the existing request/response interface.

## What This Skeleton Intentionally Does Not Do Yet

- store real tasks
- spawn workers
- enforce the active pool
- implement event cursors
- talk to OpenRouter
- execute tools
- parse protocol-tool calls

This repo state is meant to lock the external contract and runtime direction before deeper implementation work starts.
