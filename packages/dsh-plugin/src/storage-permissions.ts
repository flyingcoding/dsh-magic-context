import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
} from "node:fs";
import { dirname } from "node:path";

/** Reject linked or special database entries before SQLite can open their targets. */
export function inspectStorageEntries(databasePath: string): void {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const path = databasePath + suffix;
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (stat && (!stat.isFile() || stat.nlink !== 1)) {
      throw new Error(`Memory storage requires an unlinked regular file: ${path}`);
    }
  }
}

/** Create new databases privately from the first byte without truncating existing files. */
export function prepareStoragePath(databasePath: string, privateDirectory: boolean): void {
  const directory = dirname(databasePath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (privateDirectory && !lstatSync(directory).isDirectory()) {
    throw new Error("Memory storage directory must not be a symbolic link");
  }
  inspectStorageEntries(databasePath);
  try {
    const fd = openSync(
      databasePath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      0o600,
    );
    closeSync(fd);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    inspectStorageEntries(databasePath);
  }
}

/** Tighten only verified database entries and the explicitly owned default directory. */
export function tightenStoragePermissions(databasePath: string, privateDirectory: boolean): void {
  if (process.platform === "win32") return;
  inspectStorageEntries(databasePath);
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const path = databasePath + suffix;
    if (!lstatSync(path, { throwIfNoEntry: false })) continue;
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1)
        throw new Error("Memory storage file changed during open");
      fchmodSync(fd, 0o600);
    } finally {
      closeSync(fd);
    }
  }
  if (privateDirectory) {
    const fd = openSync(
      dirname(databasePath),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_DIRECTORY,
    );
    try {
      fchmodSync(fd, 0o700);
    } finally {
      closeSync(fd);
    }
  }
}
