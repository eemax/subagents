# Command Contract

This document defines the first durable external contract for the `subagents` CLI.

## Scope

V1 contract constraints:
- non-interactive CLI only
- one provider only: OpenRouter completions
- owner-scoped task visibility keyed by harness session identity
- one background worker process per running task
- no scheduler queue in the public model
- all machine commands return one JSON object on stdout

## Command Set

- `subagents help`
- `subagents version`
- `subagents contract`
- `subagents spawn`
- `subagents recv`
- `subagents await`
- `subagents send`
- `subagents inspect`
- `subagents list`
- `subagents cancel`
- `subagents run`

The runtime may also expose private internal commands such as `internal-worker`, but those are not part of the public harness contract.

## Global Flags

- `--input <json>`: inline JSON request
- `--input-file <path>`: JSON request file
- `--pretty`: pretty-print JSON output

If neither `--input` nor `--input-file` is given, machine commands read JSON from stdin.

## Request Envelope

All machine commands accept a command-specific JSON object. Commands do not require a nested `payload` key.

Optional shared top-level fields:

```json
{
  "contract": "subagents.v1alpha1",
  "id": "req_123"
}
```

- `contract`: optional contract version hint; if present it must equal `subagents.v1alpha1`
- `id`: optional caller correlation id echoed back in the response envelope

## Response Envelope

Success:

```json
{
  "contract": "subagents.v1alpha1",
  "ok": true,
  "id": "req_123",
  "data": {}
}
```

Failure:

```json
{
  "contract": "subagents.v1alpha1",
  "ok": false,
  "id": "req_123",
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "spawn is scaffolded but not implemented yet",
    "retryable": false
  }
}
```

## Owner Model

Owner identity is a visibility namespace, not an OS or security boundary:

```json
{
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  }
}
```

Rules:
- all task-bearing commands require `owner`
- the runtime derives an internal `owner_key` from `harness + ":" + session_id`
- `list`, `inspect`, `recv`, `await`, `send`, and `cancel` only operate on tasks in that owner namespace
- this is meant to keep concurrent supervisors from stepping on each other, not to provide strong security isolation

## Shared Domain Types

Owner:

```json
{
  "harness": "codex",
  "session_id": "sess_123"
}
```

Attachment:

```json
{
  "type": "file",
  "ref": "notes/report.md",
  "label": "Final report"
}
```

Progress:

```json
{
  "percent": 40,
  "milestone": "finished repo scan"
}
```

## `spawn`

`spawn` is idempotent per `owner + idempotency_key`.

Request:

```json
{
  "contract": "subagents.v1alpha1",
  "id": "req_spawn_1",
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
  "idempotency_key": "repo_inspect_001",
  "task": {
    "title": "Repo inspection",
    "goal": "Inspect the repo and summarize the architecture.",
    "instructions": "Stay read-only.",
    "cwd": "/tmp/project",
    "context": {
      "repo": "project",
      "branch": "main"
    },
    "labels": {
      "kind": "analysis"
    },
    "artifacts": [],
    "limits": {
      "max_turns": 20,
      "max_wall_time_sec": 900,
      "max_total_tokens": 50000
    },
    "execution": {
      "model": "openai/gpt-4.1-mini",
      "temperature": 0
    },
    "tools": {
      "preset": "read_only"
    },
    "completion": {
      "require_structured_result": true,
      "require_final_summary": true
    }
  }
}
```

Behavior:
- `spawn` tries to start a worker immediately
- if the runtime pool is full, `spawn` fails with a pool-cap style error
- `spawn` does not enqueue work in the public contract

Response:

```json
{
  "contract": "subagents.v1alpha1",
  "ok": true,
  "id": "req_spawn_1",
  "data": {
    "task_id": "task_01...",
    "state": "starting",
    "cursor": "evt_01...",
    "created_at": "2026-04-07T00:00:00.000Z"
  }
}
```

## `recv`

Request:

```json
{
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
  "tasks": {
    "task_01": "evt_05",
    "task_02": "evt_09"
  },
  "max_events": 50
}
```

Response:

```json
{
  "contract": "subagents.v1alpha1",
  "ok": true,
  "data": {
    "tasks": {
      "task_01": {
        "events": [],
        "cursor": "evt_05"
      },
      "task_02": {
        "events": [],
        "cursor": "evt_09"
      }
    }
  }
}
```

`recv` is grouped by task, not returned as one merged flat stream.

## `await`

Request:

```json
{
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
  "task_id": "task_01",
  "until": ["terminal", "needs_input"],
  "timeout_ms": 30000,
  "cursor": "evt_05"
}
```

Valid `until` values:
- `terminal`
- `needs_input`
- `progress`
- `any_event`

Representative response:

```json
{
  "contract": "subagents.v1alpha1",
  "ok": true,
  "data": {
    "task_id": "task_01",
    "events": [],
    "cursor": "evt_08"
  }
}
```

## `send`

Request:

```json
{
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
  "task_id": "task_01",
  "message": {
    "kind": "guidance",
    "content": "Continue, but do not edit files."
  }
}
```

Valid message kinds:
- `guidance`
- `correction`
- `override`
- `approval`
- `answer`

## `inspect`

Request:

```json
{
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
  "task_id": "task_01"
}
```

Representative response fields:
- `task_id`
- `owner`
- `title`
- `state`
- `turn_owner`
- `created_at`
- `started_at`
- `updated_at`
- `last_event_id`
- `last_heartbeat_at`
- `progress`
- `result`
- `error`
- `labels`
- `available_tools`

## `list`

Request:

```json
{
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
  "filter": {
    "states": ["running", "needs_input"],
    "labels": {
      "kind": "analysis"
    }
  }
}
```

Representative response:

```json
{
  "contract": "subagents.v1alpha1",
  "ok": true,
  "data": {
    "tasks": []
  }
}
```

## `cancel`

Request:

```json
{
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
  "task_id": "task_01",
  "reason": "caller stopped waiting"
}
```

## `run`

`run` is a convenience wrapper for `spawn + await terminal`.

Request:
- same as `spawn`
- optional `await` object:

```json
{
  "await": {
    "timeout_ms": 300000
  }
}
```

`run` uses the same `idempotency_key` semantics as `spawn`.

## Task State Model

Planned states:
- `starting`
- `running`
- `needs_input`
- `completed`
- `failed`
- `timed_out`
- `cancelled`
- `stalled`

Planned turn-owner values:
- `subagent`
- `owner`
- `none`

## Tool Presets

The public contract supports convenience presets for the initial tool set:
- `all`
- `read_only`
- `workspace_write`
- `custom`

These are configuration presets, not sandbox boundaries.

## Result Schema

Completed tasks should normalize to a structured result payload inspired by `agent-commander`:

```json
{
  "summary": "Short final summary",
  "outcome": "success",
  "confidence": 0.84,
  "confirmed": [],
  "inferred": [],
  "unverified": [],
  "deliverables": [],
  "evidence": [],
  "open_issues": [],
  "recommended_next_steps": [],
  "raw_final_message": "Optional raw assistant text"
}
```

## Event Schema

Each task event carries a stable core shape:

```json
{
  "event_id": "evt_01",
  "task_id": "task_01",
  "seq": 1,
  "ts": "2026-04-07T00:00:00.000Z",
  "state": "running",
  "kind": "progress",
  "turn_owner": "subagent",
  "message": "Finished repo scan",
  "final": false
}
```

Supported `kind` values:
- `started`
- `heartbeat`
- `progress`
- `question`
- `artifact`
- `result`
- `error`
- `status_change`
- `warning`

Optional fields:
- `progress`
- `attachments`
- `result`
- `error`
- `deadline_at`

## Internal Protocol Tools

The worker runtime should prefer explicit internal protocol tools over parsing assistant prose markers:
- `task_progress`
- `task_request_input`
- `task_complete`

These are internal runtime tools, not public CLI commands.

## Error Codes

Stable first-pass codes:
- `USAGE`
- `INVALID_JSON`
- `INVALID_REQUEST`
- `UNSUPPORTED_CONTRACT`
- `TASK_NOT_FOUND`
- `TASK_CONFLICT`
- `POOL_FULL`
- `TIMEOUT`
- `NOT_IMPLEMENTED`
- `INTERNAL`

## Exit Codes

- `0`: success
- `2`: usage error
- `3`: request validation error
- `4`: not found
- `5`: conflict
- `6`: timeout
- `7`: not implemented
- `10`: internal error
