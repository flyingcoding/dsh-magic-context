import type { Translate } from "@deepseek-ai/dsh-client-ui-slots";
import { useEffect, useRef, useState } from "react";
import type { ManagementRequest, MemoryPage as PageData } from "../management-wire.ts";
import type { MemoryRecord } from "../types.ts";
import type { MemoryCopyKey } from "./locales.ts";

export interface MemoryPageProps {
  t: Translate<MemoryCopyKey>;
  invoke(request: ManagementRequest): Promise<string>;
}

/** Validate the fields this view renders before accepting a decoded gateway page. */
function readPage(text: string): PageData {
  const value = JSON.parse(text) as PageData;
  if (
    !value ||
    !Array.isArray(value.records) ||
    typeof value.maxContentChars !== "number" ||
    (value.next !== null && typeof value.next !== "string") ||
    value.records.some(
      (record) =>
        !record ||
        typeof record.id !== "string" ||
        typeof record.content !== "string" ||
        !Number.isSafeInteger(record.revision) ||
        !["active", "archived", "superseded"].includes(record.status) ||
        !record.provenance ||
        !["tool", "user"].includes(record.provenance.source),
    )
  ) {
    throw new Error("Invalid memory page response");
  }
  return value;
}

/** Download only the explicitly displayed page as portable JSON. */
function exportPage(page: PageData): string {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ format: "dsh-memory-export-v1", records: page.records }, null, 2)], {
      type: "application/json",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "dsh-memories.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  return url;
}

/** Edit one revision; concurrent changes remain visible as errors instead of being overwritten. */
function MemoryRow({
  record,
  maxContentChars,
  invoke,
  t,
  refresh,
}: MemoryPageProps & {
  record: MemoryRecord;
  maxContentChars: number;
  refresh(): void;
}) {
  const [content, setContent] = useState(record.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /** Submit a single explicit action and refresh only after durable success. */
  async function submit(action: "update" | "archive"): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const selection = {
        workspace: record.workspaceKey,
        scope: record.scope,
        id: record.id,
        expectedRevision: record.revision,
        requestId: crypto.randomUUID(),
      };
      await invoke(
        action === "update" ? { action, ...selection, content } : { action, ...selection },
      );
      refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="dsh-memory-row">
      <div className="dsh-memory-meta">
        <span>{t(record.status)}</span>
        <span>{t("revision", { revision: String(record.revision) })}</span>
        <span>{t(record.provenance.source === "user" ? "fromUser" : "fromTool")}</span>
      </div>
      <label htmlFor={`memory-${record.id}`}>{t("content")}</label>
      <textarea
        id={`memory-${record.id}`}
        value={content}
        maxLength={maxContentChars}
        disabled={busy || record.status !== "active"}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
      />
      {record.status === "active" ? (
        <div className="dsh-memory-actions">
          <button
            type="button"
            disabled={busy || !content.trim() || content === record.content}
            onClick={() => void submit("update")}
          >
            {t(busy ? "saving" : "save")}
          </button>
          <button type="button" disabled={busy} onClick={() => void submit("archive")}>
            {t("archive")}
          </button>
        </div>
      ) : null}
      {error ? <p role="alert">{t("error", { message: error })}</p> : null}
    </li>
  );
}

/** Load bounded pages only while the settings section is mounted; discard stale responses. */
export function MemoryPage({ invoke, t }: MemoryPageProps) {
  const downloadUrl = useRef<string>();
  const [workspaces, setWorkspaces] = useState<string[] | null>(null);
  const [workspace, setWorkspace] = useState("");
  const [after, setAfter] = useState("");
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState<PageData | null>(null);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void invoke({ action: "workspaces" })
      .then((text) => {
        const values: unknown = JSON.parse(text);
        if (!Array.isArray(values) || values.some((value) => typeof value !== "string"))
          throw new Error("Invalid workspace response");
        if (active) {
          setWorkspaces(values);
          setWorkspace(values[0] ?? "");
        }
      })
      .catch((error) => {
        if (active) setError(String(error));
      });
    return () => {
      active = false;
    };
  }, [invoke]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the explicit refresh action.
  useEffect(() => {
    if (workspaces === null) return;
    let active = true;
    setPage(null);
    setError("");
    void invoke({
      action: "list",
      workspace,
      scope: workspace === "" ? "global" : "workspace",
      after,
    })
      .then((text) => {
        const value = readPage(text);
        if (active) setPage(value);
      })
      .catch((error) => {
        if (active) setError(String(error));
      });
    return () => {
      active = false;
    };
  }, [invoke, workspace, after, revision, workspaces]);

  /** Refresh the selected scope without retaining prior page results in memory. */
  function refresh(): void {
    setRevision((current) => current + 1);
  }

  /** Extend the workspace selector by one bounded page on explicit user action. */
  async function moreWorkspaces(): Promise<void> {
    try {
      const values: unknown = JSON.parse(
        await invoke({ action: "workspaces", after: workspaces?.at(-1) ?? "" }),
      );
      if (!Array.isArray(values) || values.some((value) => typeof value !== "string"))
        throw new Error("Invalid workspace response");
      setWorkspaces((current) => [...new Set([...(current ?? []), ...values])]);
    } catch (error) {
      setError(String(error));
    }
  }

  return (
    <section className="dsh-memory-page" aria-label={t("title")}>
      <h2>{t("title")}</h2>
      <p>{t("intro")}</p>
      <label htmlFor="dsh-memory-workspace">{t("workspace")}</label>
      <select
        id="dsh-memory-workspace"
        value={workspace}
        onChange={(event) => {
          setWorkspace(event.target.value);
          setAfter("");
        }}
      >
        <option value="">{t("global")}</option>
        {(workspaces ?? []).map((value) => (
          <option value={value} key={value}>
            {value}
          </option>
        ))}
      </select>
      <div className="dsh-memory-actions">
        <button type="button" onClick={() => void moreWorkspaces()}>
          {t("moreWorkspaces")}
        </button>
        <button type="button" onClick={refresh}>
          {t("refresh")}
        </button>
        <button
          type="button"
          disabled={!page || page.records.length === 0}
          onClick={() => {
            if (page) {
              if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
              downloadUrl.current = exportPage(page);
            }
          }}
        >
          {t("exportPage")}
        </button>
      </div>
      {error ? <p role="alert">{t("error", { message: error })}</p> : null}
      {!page && !error ? <p role="status">{t("loading")}</p> : null}
      {page?.records.length === 0 ? <p>{t("empty")}</p> : null}
      <ul>
        {page?.records.map((record) => (
          <MemoryRow
            key={`${record.id}:${record.revision}`}
            record={record}
            maxContentChars={page.maxContentChars}
            t={t}
            invoke={invoke}
            refresh={refresh}
          />
        ))}
      </ul>
      <div className="dsh-memory-actions">
        <button type="button" disabled={!after} onClick={() => setAfter("")}>
          {t("first")}
        </button>
        <button
          type="button"
          disabled={!page?.next}
          onClick={() => {
            if (page?.next) setAfter(page.next);
          }}
        >
          {t("next")}
        </button>
      </div>
      <p className="dsh-memory-hint">{t("archiveHint")}</p>
      <p className="dsh-memory-hint">{t("pageHint")}</p>
    </section>
  );
}
