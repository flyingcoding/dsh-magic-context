import {
  DatabaseSync,
  type DatabaseSyncOptions,
  type SQLInputValue,
  type StatementSync,
} from "node:sqlite";

// Adapted from cortexkit/magic-context at 6f718ff019bf327a0b291a8510dfb42f91b65921.
// Original: packages/plugin/src/shared/sqlite.ts (MIT). See NOTICE for retained scope.
type Parameters =
  | SQLInputValue[]
  | [SQLInputValue[]]
  | [Record<string, SQLInputValue>, ...SQLInputValue[]];

/** Retain positional-array compatibility while using Node's own statement types. */
export type Statement = Omit<StatementSync, "run" | "get" | "all"> & {
  run(...parameters: Parameters): ReturnType<StatementSync["run"]>;
  get(...parameters: Parameters): ReturnType<StatementSync["get"]>;
  all(...parameters: Parameters): ReturnType<StatementSync["all"]>;
};

type Operation<Receiver, Args extends unknown[], Result> = (
  this: Receiver,
  ...args: Args
) => Result;
type Transaction<Receiver, Args extends unknown[], Result> = Operation<Receiver, Args, Result> & {
  default: Operation<Receiver, Args, Result>;
  deferred: Operation<Receiver, Args, Result>;
  immediate: Operation<Receiver, Args, Result>;
  exclusive: Operation<Receiver, Args, Result>;
};

/** Node-only SQLite owner with the binding and savepoint contracts used by the memory store. */
export class Database extends DatabaseSync {
  /** Preserve the former readonly spelling while accepting native Node options. */
  constructor(filename = ":memory:", options: DatabaseSyncOptions & { readonly?: boolean } = {}) {
    const { readonly, ...nativeOptions } = options;
    super(filename, { ...nativeOptions, readOnly: readonly ?? nativeOptions.readOnly });
  }

  /** Expand a lone array without changing named, binary, empty, or spread bindings. */
  override prepare(sql: string): Statement {
    const statement = super.prepare(sql);
    for (const method of ["run", "get", "all"] as const) {
      const original = statement[method];
      Object.defineProperty(statement, method, {
        configurable: true,
        value: (...parameters: Parameters) =>
          Reflect.apply(
            original,
            statement,
            parameters.length === 1 && Array.isArray(parameters[0]) ? parameters[0] : parameters,
          ),
      });
    }
    return statement as Statement;
  }

  /** Commit synchronous work atomically; nested calls unwind only their own savepoint. */
  transaction<Receiver, Args extends unknown[], Result>(
    operation: Operation<Receiver, Args, Result>,
  ): Transaction<Receiver, Args, Result> {
    const database = this;
    // Reusing this name is safe: SQLite resolves matching savepoints in LIFO order.
    const savepoint = "mc_tx_sp";

    /** Bind a transaction mode without changing the callback receiver or arguments. */
    function wrap(mode: "" | "DEFERRED" | "IMMEDIATE" | "EXCLUSIVE") {
      return function (this: Receiver, ...args: Args): Result {
        const nested = database.isTransaction;
        database.exec(nested ? `SAVEPOINT ${savepoint}` : `BEGIN${mode ? ` ${mode}` : ""}`);
        try {
          const result = operation.apply(this, args);
          database.exec(nested ? `RELEASE ${savepoint}` : "COMMIT");
          return result;
        } catch (error) {
          if (nested) {
            database.exec(`ROLLBACK TO ${savepoint}`);
            database.exec(`RELEASE ${savepoint}`);
          } else {
            database.exec("ROLLBACK");
          }
          throw error;
        }
      };
    }

    return Object.assign(wrap(""), {
      default: wrap(""),
      deferred: wrap("DEFERRED"),
      immediate: wrap("IMMEDIATE"),
      exclusive: wrap("EXCLUSIVE"),
    });
  }
}
