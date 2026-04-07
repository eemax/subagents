import type {
  EventKind,
  OwnerRef,
  ProgressInfo,
  TaskError,
  TaskInput,
  TaskResult,
  TaskState,
  TurnOwner
} from "../contracts";
import type { ProtocolToolName } from "./protocol-tools";

export interface WorkerLaunchSpec {
  task_id: string;
  owner: OwnerRef;
  task: TaskInput;
  protocol_tools?: ProtocolToolName[];
}

export interface WorkerStateSnapshot {
  task_id: string;
  state: TaskState;
  turn_owner: TurnOwner;
  updated_at: string;
  last_heartbeat_at?: string | null;
}

export interface WorkerEvent {
  event_id: string;
  task_id: string;
  seq: number;
  ts: string;
  kind: EventKind;
  state: TaskState;
  turn_owner: TurnOwner;
  message: string;
  final: boolean;
  progress?: ProgressInfo;
  result?: TaskResult;
  error?: TaskError;
}
