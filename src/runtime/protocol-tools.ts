import type { Attachment, ProgressInfo, TaskResult } from "../contracts";

export const PROTOCOL_TOOL_NAMES = [
  "task_progress",
  "task_request_input",
  "task_complete"
] as const;

export type ProtocolToolName = typeof PROTOCOL_TOOL_NAMES[number];

export interface TaskProgressToolInput {
  message?: string;
  progress?: ProgressInfo;
  attachments?: Attachment[];
}

export interface TaskRequestInputToolInput {
  question: string;
  message?: string;
  deadline_at?: string;
}

export interface TaskCompleteToolInput {
  message?: string;
  result: TaskResult;
}

