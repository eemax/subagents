import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import type { OwnerRef } from "../contracts";

export const DEFAULT_ROOT_DIR = join(homedir(), ".subagents");

export function ownerKey(owner: OwnerRef): string {
  return createHash("sha256")
    .update(`${owner.harness}:${owner.session_id}`)
    .digest("hex");
}

export function ownerDir(rootDir: string, owner: OwnerRef): string {
  return join(rootDir, "owners", ownerKey(owner));
}

export function taskDir(rootDir: string, owner: OwnerRef, taskId: string): string {
  return join(ownerDir(rootDir, owner), "tasks", taskId);
}

