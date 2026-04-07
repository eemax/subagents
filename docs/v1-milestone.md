# V1.0 Milestone

This document defines the minimum bar for `subagents` to be called `v1.0`.

## Definition Of Done

`v1.0` means another harness can call the `subagents` CLI and rely on it for:
- durable background task execution
- owner-scoped task namespacing and visibility
- stable JSON request and response contracts
- predictable retries, cancellation, timeout, and pool-cap behavior
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

### 2. Active Task Pool

The runtime must manage a real pool of concurrently active worker processes.

Required pieces:
- one worker process per active task
- pool-cap accounting
- immediate-start admission logic
- no fake queue in the public contract
- active lease files or equivalent runtime records

### 3. Internal Worker Runtime

Long-running work must execute in a background worker subprocess.

Required pieces:
- internal worker command entrypoint
- worker launch from `spawn`
- PID tracking or equivalent runtime identity
- heartbeat updates
- crash detection
- stale worker detection
- cooperative cancellation

### 4. Task State Machine

The runtime must implement the planned state model consistently:
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

### 5. Event Protocol

The event stream is the core supervisor interface and must be durable and correct.

Required pieces:
- event ids and task ids
- per-task cursor semantics
- `recv` grouped by task
- blocking `await` behavior
- progress, input-needed, terminal, and status events
- monotonic ordering guarantees within a task

### 6. Spawn Idempotency

`spawn` must be safe for retrying callers.

Required pieces:
- required `idempotency_key`
- stable lookup by `owner + idempotency_key`
- repeated `spawn` calls resolve to the same task when appropriate
- duplicate worker launch prevention around concurrent retries

### 7. OpenRouter Completion Loop

V1 only supports OpenRouter completions, but that path must be production-usable.

Required pieces:
- API key resolution
- request shaping
- timeout propagation
- bounded retries for retryable failures
- token usage accounting
- assistant final-output extraction
- structured completion parsing for task results

### 8. Internal Protocol Tools

The worker runtime needs explicit machine actions for progress and completion.

Required pieces:
- `task_progress`
- `task_request_input`
- `task_complete`
- mapping from protocol tool calls to durable task events
- test coverage for protocol-tool handling

### 9. Minimal Tool Runtime

The subagent needs a minimal but real toolbelt.

Required pieces:
- pinned `cwd` captured at spawn
- tool presets and allow/deny overrides
- `read_file`
- `glob` and/or `grep`
- `apply_patch`
- `bash`
- deterministic JSON tool outputs
- tool-call transcript persistence

### 10. Owner Namespacing

Owner scoping is required so multiple concurrent supervisors can operate independently.

Required pieces:
- owner identity from `harness + session_id`
- internal `owner_key` derivation
- all task lookup filtered by owner namespace
- no cross-owner task leakage in `list`, `inspect`, `recv`, or `await`

This is a correctness and coordination requirement, not a strong security boundary.

### 11. Stable CLI Contract

The contract in [command-contract.md](./command-contract.md) must stop moving in incompatible ways.

Required pieces:
- one JSON object on stdout for machine commands
- stable error envelope
- stable exit codes
- stable command names and required fields
- request validation before execution

### 12. Config Surface

The runtime needs a minimal supported configuration model.

Required pieces:
- root storage directory
- OpenRouter API key env var configuration
- default model
- default task caps
- max active task count
- logging or audit paths

### 13. Packaging And Invocation

Other harnesses must be able to invoke `subagents` directly.

Required pieces:
- runnable `subagents` binary or launcher
- documented install path
- predictable behavior outside the repo checkout
- no requirement for interactive prompts

### 14. Observability And Audit

V1 needs enough logging to debug real failures.

Required pieces:
- worker stderr log
- task transcript log
- owner-to-subagent message audit trail
- subagent-to-owner result and question audit trail
- enough metadata to correlate task id, owner, and timestamps

### 15. Test Coverage

The first release needs real process-level confidence, not just unit coverage.

Required pieces:
- CLI contract tests
- store persistence tests
- lock and concurrency tests
- worker lifecycle tests
- OpenRouter provider mock tests
- end-to-end `spawn` -> `await` tests
- cancellation and timeout tests
- owner-namespacing tests
- idempotent `spawn` tests

## Hardening Required Before Release

These are not optional polish items. They are part of the `v1.0` bar.

- No duplicate workers can successfully claim the same task.
- Concurrent `spawn`, `send`, `cancel`, `recv`, and `await` calls must not corrupt state.
- Repeated `spawn` calls with the same `idempotency_key` must converge correctly.
- Worker crashes must leave tasks inspectable with a clear failed or stalled outcome.
- Timeouts must be enforced both for provider calls and overall task runtime.
- Cancellation must behave deterministically and leave a terminal state.
- Pool-cap enforcement must be deterministic under concurrent spawns.
- Same request class should always map to the same error code and exit code.

## Acceptance Criteria

`subagents` is ready for `v1.0` when all of the following are true:

1. A harness can `spawn` a task, receive a task id and cursor, and later `inspect`, `recv`, and `await` that task from a separate process.
2. Repeating the same `spawn` with the same `owner + idempotency_key` does not create duplicate tasks.
3. A task can complete successfully through the OpenRouter path and return a durable terminal event plus a final structured result payload.
4. A task can request input through the protocol-tool path, pause, receive `send`, and continue.
5. A task can be cancelled and will converge to a terminal cancelled state.
6. Two concurrent owners only see their own task sets when using owner-scoped commands.
7. The documented JSON contract matches the actual CLI behavior.
8. The install and invocation flow works outside the development checkout.

## Deferred Until After V1.0

These are explicitly out of the initial release bar:
- multiple providers
- plugin or skill system
- advanced scheduling, task pools, or queue prioritization
- compaction or rolling summaries

## Recommended Build Order

1. Durable store, ids, and locking
2. Active pool leases and `spawn` idempotency
3. `spawn`, `inspect`, and `list` against real persisted task state
4. Internal worker launch and heartbeat
5. Event append/read model for grouped `recv` and `await`
6. OpenRouter completion loop
7. Internal protocol-tool handling
8. Minimal tool runtime
9. Cancellation, timeout, and crash recovery
10. Audit logging and end-to-end tests
