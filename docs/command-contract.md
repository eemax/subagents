# Command Contract

This document defines the first-pass external contract for the `subagents` CLI.

## Scope

V1 constraints:
- non-interactive CLI only
- one provider only: OpenRouter completions
- one owner namespace per harness session
- all task commands are owner-scoped
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

Owner identity is logical, not OS-level, in v1:

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
- task lookup is filtered by owner
- cross-owner access returns `TASK_NOT_FOUND`
- runtime storage will derive an internal `owner_key` from `harness + ":" + session_id`

## Shared Domain Types

Owner:

```json
{
  "harness": "codex",
  "session_id": "sess_123"
}
```

Artifact:

```json
{
  "type": "file",
  "ref": "notes/report.md",
  "label": "Final report"
}
```

## `spawn`

Request:

```json
{
  "contract": "subagents.v1alpha1",
  "id": "req_spawn_1",
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
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
    "constraints": {
      "max_turns": 20,
      "max_wall_time_sec": 900,
      "max_total_tokens": 50000
    },
    "inference": {
      "model": "openai/gpt-4.1-mini",
      "temperature": 0
    },
    "tool_policy": {
      "mode": "default"
    },
    "completion": {
      "require_structured_result": true,
      "require_final_summary": true
    }
  }
}
```

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
    "events": [],
    "cursors": {
      "task_01": "evt_05",
      "task_02": "evt_09"
    }
  }
}
```

## `await`

Request:

```json
{
  "owner": {
    "harness": "codex",
    "session_id": "sess_123"
  },
  "task_id": "task_01",
  "until": ["terminal", "requires_input"],
  "timeout_ms": 30000,
  "cursor": "evt_05"
}
```

Valid `until` values:
- `terminal`
- `requires_input`
- `progress`
- `any_event`

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

Response shape will include:
- task metadata
- current state
- turn owner
- latest result or error
- latest progress
- available tools

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

## Task State Model

Planned states:
- `queued`
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

## Error Codes

Stable first-pass codes:
- `USAGE`
- `INVALID_JSON`
- `INVALID_REQUEST`
- `UNSUPPORTED_CONTRACT`
- `TASK_NOT_FOUND`
- `TASK_CONFLICT`
- `TIMEOUT`
- `NOT_IMPLEMENTED`
- `INTERNAL`

## Exit Codes

- `0`: success
- `2`: usage error
- `3`: request validation error
- `4`: not found or isolation rejection
- `5`: conflict
- `6`: timeout
- `7`: not implemented
- `10`: internal error

