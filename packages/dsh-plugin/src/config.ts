import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import z from "@deepseek-ai/schemastery";
import type { StoreOptions } from "./types.ts";

/** Native storage settings; these do not configure the upstream Magic runtime. */
export interface Config {
  databasePath?: string;
  cacheSizeMiB?: number;
  busyTimeoutMs?: number;
  maxContentChars?: number;
  maxQueryChars?: number;
  maxResults?: number;
}

export const Config: z<Config> = z.object({
  databasePath: z.string(),
  cacheSizeMiB: z.number().step(1).min(1).max(64).default(8),
  busyTimeoutMs: z.number().step(1).min(0).max(5000).default(100),
  maxContentChars: z.number().step(1).min(128).max(16000).default(4000),
  maxQueryChars: z.number().step(1).min(32).max(4096).default(512),
  maxResults: z.number().step(1).min(1).max(100).default(20),
});

/** Reject invalid deployment values even when a caller bypasses the Cordis loader. */
export function boundedInteger(name: string, value: number, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new TypeError(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

/** Resolve the owning Harness home without inspecting any live profile or credentials. */
export function resolveConfig(config: Config = {}): StoreOptions {
  const home = process.env.DSH_HOME ?? resolve(homedir(), ".dsh");
  const databasePath = config.databasePath ?? resolve(home, "magic-context", "memory.sqlite");
  if (!isAbsolute(databasePath)) throw new TypeError("databasePath must be absolute");
  return {
    databasePath,
    cacheSizeMiB: boundedInteger("cacheSizeMiB", config.cacheSizeMiB ?? 8, 1, 64),
    busyTimeoutMs: boundedInteger("busyTimeoutMs", config.busyTimeoutMs ?? 100, 0, 5000),
    maxContentChars: boundedInteger("maxContentChars", config.maxContentChars ?? 4000, 128, 16000),
    maxQueryChars: boundedInteger("maxQueryChars", config.maxQueryChars ?? 512, 32, 4096),
    maxResults: boundedInteger("maxResults", config.maxResults ?? 20, 1, 100),
  };
}
