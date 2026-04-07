import type { OwnerRef, TaskInput, TaskState, TurnOwner } from "../contracts";

export interface WorkerLaunchSpec {
  task_id: string;
  owner: OwnerRef;
  task: TaskInput;
}

export interface WorkerStateSnapshot {
  task_id: string;
  state: TaskState;
  turn_owner: TurnOwner;
  updated_at: string;
}

export interface WorkerEvent {
  event_id: string;
  task_id: string;
  ts: string;
  kind: string;
  state: TaskState;
  turn_owner: TurnOwner;
  message?: string;
}

