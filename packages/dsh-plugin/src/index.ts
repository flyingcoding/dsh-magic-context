import type { Context } from "@deepseek-ai/cordis";
import { Config, resolveConfig } from "./config.ts";
import { installManagement } from "./management.ts";
import { MemoryService } from "./service.ts";
import { MemoryStore } from "./store.ts";

export { Config, resolveConfig } from "./config.ts";
export type { MemoryRepository } from "./service.ts";
export { MemoryService } from "./service.ts";
export type * from "./types.ts";

/** Node SQLite provider; opening and closing the connection follow the Cordis fiber. */
export default class SqliteMemoryService extends MemoryService {
  static Config = Config;
  readonly store: MemoryStore;

  /** Open one configured database and register connection teardown as an effect. */
  constructor(ctx: Context, config: Config = {}) {
    super(ctx);
    this.store = new MemoryStore(resolveConfig(config));
    ctx.effect(() => () => this.store.close());
    ctx.inject(["typert"], (managementCtx) => installManagement(managementCtx, this.store));
  }
}
