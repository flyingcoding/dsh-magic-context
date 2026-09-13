import { resolveConfig } from "../src/config.ts";
import { MemoryStore } from "../src/store.ts";
import { caller } from "./fixtures.ts";

const store = new MemoryStore(resolveConfig({ databasePath: process.argv[2] }));
store.remember(caller(process.argv[3]), {
  content: "crash-durable-marker",
  requestId: "write-1",
  scope: "workspace",
  category: "CONSTRAINTS",
});
process.kill(process.pid, "SIGKILL");
