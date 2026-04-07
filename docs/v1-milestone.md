# V1.0 Milestone

This document defines the minimum bar for `subagents` to be called `v1.0`.

## Definition Of Done

`v1.0` means another harness can call the `subagents` CLI and rely on it for:
- durable background task execution
- strict owner-scoped task isolation
- stable JSON request and response contracts
- predictable retries, cancellation, and timeout behavior
- a single supported provider path: OpenRouter completions

## V1.0 Must-Haves

### 1. Durable Task Store

The runtime must persist owner and task state on disk, not in memory only.

Required pieces:
- owner directory creation and lookup
- task directory creation and metadata persistence
- durable `task.json` and `state.json`
- append-only `events.jsonl`
- append-only `inbox.jsonl` for owner-to-task messages
- retention rules for completed tasks and logs
- recovery-safe file layout under `~/.subagents/`

### 2. Internal Worker Runtime

Long-running work must execute in a background worker subprocess.

Required pieces:
- internal worker command entrypoint
- worker launch from `spawn`
- PID recording
- heartbeat updates
- crash detection
- stale worker detection
- cooperative cancellation

### 3. Task State Machine

The runtime must implement the planned state model consistently:
- `queued`
- `starting`
- `running`
- `needs_input`
- `completed`
- `failed`
- `timed_out`
- `cancelled`
- `stalled`

Required pieces:
- legal transitions only
- terminal-state enforcement
- turn-owner tracking
- structured result and structured error payloads

### 4. Event Protocol

The event stream is the core supervisor interface and must be durable and correct.

Required pieces:
- event ids and task ids
- per-task cursor semantics
- `recv` behavior without replay bugs
- blocking `await` behavior
- progress, input-needed, terminal, and status events
- monotonic ordering guarantees within a task

### 5. OpenRouter Completion Loop

V1 only supports OpenRouter completions, but that path must be production-usable.

Required pieces:
- API key resolution
- request shaping
- timeout propagation
- bounded retries for retryable failures
- token usage accounting
- assistant final-output extraction
- structured completion parsing for task results

### 6. Minimal Tool Runtime

The subagent needs a minimal but real toolbelt.

Required pieces:
- pinned `cwd` captured at spawn
- explicit read-only mode support
- `read_file`
- `glob` and/or `grep`
- `apply_patch`
- `bash`
- deterministic JSON tool outputs
- tool-call transcript persistence

### 7. Owner Isolation

Owner scoping is a product requirement, not an implementation detail.

Required pieces:
- owner identity from `harness + session_id`
- internal `owner_key` derivation
- all task lookup filtered by owner
- cross-owner access returns `TASK_NOT_FOUND`
- no cross-owner listing or inspection leakage

Preferred for `v1.0` if low-cost:
- capability token layered on top of logical owner identity

### 8. Stable CLI Contract

The contract in [command-contract.md](./command-contract.md) must stop moving in incompatible ways.

Required pieces:
- one JSON object on stdout for machine commands
- stable error envelope
- stable exit codes
- stable command names and required fields
- request validation before execution

### 9. Config Surface

The runtime needs a minimal supported configuration model.

Required pieces:
- root storage directory
- OpenRouter API key env var configuration
- default model
- default task caps
- logging or audit paths

### 10. Packaging And Invocation

Other harnesses must be able to invoke `subagents` directly.

Required pieces:
- runnable `subagents` binary or launcher
- documented install path
- predictable behavior outside the repo checkout
- no requirement for interactive prompts

### 11. Observability And Audit

V1 needs enough logging to debug real failures.

Required pieces:
- worker stderr log
- task transcript log
- owner-to-subagent message audit trail
- subagent-to-owner result and question audit trail
- enough metadata to correlate task id, owner, and timestamps

### 12. Test Coverage

The first release needs real process-level confidence, not just unit coverage.

Required pieces:
- CLI contract tests
- store persistence tests
- lock and concurrency tests
- worker lifecycle tests
- OpenRouter provider mock tests
- end-to-end `spawn` -> `await` tests
- cancellation and timeout tests
- owner-isolation tests

## Hardening Required Before Release

These are not optional polish items. They are part of the `v1.0` bar.

- No duplicate workers can successfully claim the same task.
- Concurrent `spawn`, `send`, `cancel`, `recv`, and `await` calls must not corrupt state.
- Worker crashes must leave tasks inspectable with a clear failed or stalled outcome.
- Timeouts must be enforced both for provider calls and overall task runtime.
- Cancellation must behave deterministically and leave a terminal state.
- Same request class should always map to the same error code and exit code.

## Acceptance Criteria

`subagents` is ready for `v1.0` when all of the following are true:

1. A harness can `spawn` a task, receive a task id and cursor, and later `inspect`, `recv`, and `await` that task from a separate process.
2. A task can complete successfully through the OpenRouter path and return a durable terminal event plus a final result payload.
3. A task can request input, pause, receive `send`, and continue.
4. A task can be cancelled and will converge to a terminal cancelled state.
5. Cross-owner requests cannot discover, inspect, await, or cancel another owner's task.
6. The documented JSON contract matches the actual CLI behavior.
7. The install and invocation flow works outside the development checkout.

## Deferred Until After V1.0

These are explicitly out of the initial release bar:
- multiple providers
- plugin or skill system
- advanced scheduling, task pools, or queue prioritization
- compaction or rolling summaries

## Recommended Build Order

1. Durable store, ids, and locking
2. `spawn`, `inspect`, and `list` against real persisted task state
3. Internal worker launch and heartbeat
4. Event append/read model for `recv` and `await`
5. OpenRouter completion loop
6. Minimal tool runtime
7. Cancellation, timeout, and crash recovery
8. Audit logging and end-to-end tests
