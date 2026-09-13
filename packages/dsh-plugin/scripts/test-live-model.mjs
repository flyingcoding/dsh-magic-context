import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Collect only this isolated run's plain JSONL logs, never the production Session store. */
function sessionFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory()
      ? sessionFiles(path)
      : entry.name === "session.v3.jsonl"
        ? [path]
        : [];
  });
}

/** Execute one supported headless profile and retain its output for reproducible failures. */
function runTask(command, profile, prompt, cwd, env) {
  return new Promise((resolveTask, reject) => {
    const child = spawn(command, ["--profile", profile, prompt], {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), 180000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolveTask({ code, signal, stdout, stderr });
    });
  });
}

/** Verify real cross-process model use with synthetic facts and the explicitly supplied test profile. */
async function main() {
  const supplied = process.env.DSH_MEMORY_TEST_HOME;
  if (!supplied) throw new Error("Set DSH_MEMORY_TEST_HOME to a prepared isolated DSH home");
  const home = realpathSync(supplied);
  assert.notEqual(
    home,
    existsSync(resolve(homedir(), ".dsh"))
      ? realpathSync(resolve(homedir(), ".dsh"))
      : resolve(homedir(), ".dsh"),
    "refusing the production DSH home",
  );
  const profile = process.env.DSH_MEMORY_TEST_PROFILE ?? "memory-live";
  const command = process.env.DSH_MEMORY_TEST_COMMAND ?? "dsh";
  const root = mkdtempSync(join(tmpdir(), "dsh-memory-live-"));
  const workspace = join(root, "project-a");
  const other = join(root, "project-b");
  mkdirSync(workspace);
  mkdirSync(other);
  const initial = `MCTX-${randomUUID().slice(0, 8)}`;
  const corrected = `MCTX-${randomUUID().slice(0, 8)}`;
  const globalPreference = `验收偏好-${randomUUID().slice(0, 8)}`;
  const globalMarker = `GLOBAL-${randomUUID().slice(0, 8)}`;
  const scenarios = [
    [
      "remember",
      workspace,
      `这是本地记忆插件验收。请使用 memory_remember 在当前工作区保存一条已确认事实：项目“苔石”的发布校验码为 ${initial}。类别为 CONFIG_VALUES，scope 为 workspace。只使用记忆工具，不执行任何其他操作，最后简短确认完成。`,
      initial,
      null,
      "memory_remember",
    ],
    [
      "recall",
      workspace,
      "项目“苔石”的发布校验码是什么？只回答校验码，不知道就回答“不知道”。",
      initial,
      null,
      null,
    ],
    [
      "isolation",
      other,
      "项目“苔石”的发布校验码是什么？只能根据当前工作区已有的已确认信息回答；不知道就回答“不知道”。不要猜测，不要搜索其他工作区。",
      null,
      initial,
      null,
    ],
    [
      "correct",
      workspace,
      `更正之前保存的项目“苔石”发布校验码：正确值为 ${corrected}。先使用 memory_recall 查到对应记忆及当前 revision，再使用 memory_update 修正原记录，不要新增重复记忆。只使用记忆工具，最后简短确认。`,
      corrected,
      null,
      "memory_update",
    ],
    [
      "recall-corrected",
      workspace,
      "项目“苔石”的当前发布校验码是什么？只回答当前校验码，不知道就回答“不知道”。",
      corrected,
      initial,
      null,
    ],
    [
      "archive",
      workspace,
      "项目“苔石”的发布校验码已经作废。请先使用 memory_recall 查到它，然后使用 memory_forget 归档这条记忆。只使用记忆工具，最后简短确认。",
      null,
      null,
      "memory_forget",
    ],
    [
      "recall-archived",
      workspace,
      "项目“苔石”的发布校验码是什么？仅根据当前有效记忆回答；不知道就回答“不知道”，不要猜测或查找历史对话。",
      null,
      corrected,
      null,
    ],
    [
      "history",
      workspace,
      "请使用 session_search 搜索当前工作区此前关于项目‘苔石’发布校验码更正的对话，再使用 session_event_read 阅读其中一个相关事件。仅使用宿主的会话查询工具，最后写出来源 session_id 和事件 seq，并说明它是历史记录，不能当作当前有效记忆。不要猜测来源。",
      null,
      null,
      "session_search",
    ],
    [
      "global-remember",
      workspace,
      `这是全局偏好验收，请使用 memory_remember 显式保存 scope=global、category=USER_PREFERENCES 的事实：全局偏好“${globalPreference}”的值为 ${globalMarker}。只使用记忆工具并简短确认。`,
      globalMarker,
      null,
      "memory_remember",
    ],
    [
      "global-recall",
      other,
      `全局偏好“${globalPreference}”的值是什么？请仅根据有效全局记忆回答完整值；不知道就回答不知道。只使用记忆工具。`,
      globalMarker,
      null,
      null,
    ],
  ];
  const results = [];
  let projectMemoryId;
  mkdirSync(".cache/live-model", { recursive: true });
  for (const [name, cwd, prompt, expected, excluded, expectedTool] of scenarios) {
    const before = new Set(sessionFiles(join(home, "live-sessions")));
    const started = Date.now();
    console.log(`Live model scenario: ${name}`);
    const processResult = await runTask(command, profile, prompt, cwd, {
      ...process.env,
      DSH_HOME: home,
    });
    writeFileSync(`.cache/live-model/${name}.stdout.txt`, processResult.stdout);
    writeFileSync(`.cache/live-model/${name}.stderr.txt`, processResult.stderr);
    assert.equal(processResult.code, 0, `${name}: ${processResult.stderr.slice(-4000)}`);
    const added = sessionFiles(join(home, "live-sessions")).filter((path) => !before.has(path));
    assert.equal(added.length, 1, `${name}: expected exactly one real Session log`);
    const events = readFileSync(added[0], "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const messages = events.filter((event) => event.type === "assistant/message");
    const final =
      messages
        .at(-1)
        ?.data.message.content.filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n") ?? "";
    const tools = messages.flatMap((event) =>
      event.data.message.content
        .filter((block) => block.type === "tool-call")
        .map((block) => block.name),
    );
    const failedTools = events.filter(
      (event) => event.type === "tool/result" && event.data.message.content[0].isError,
    );
    assert.ok(messages.length > 0 && final.trim().length > 0, `${name}: no completed model answer`);
    if (name === "isolation" || name === "recall-archived") {
      assert.match(final, /不知道|不清楚|不确定|无法|没有.+(?:记录|信息)|unknown|do not know/i);
      assert.doesNotMatch(final, /MCTX-[\da-f]{8}/i);
    }
    if (name === "history") {
      const reads = messages
        .flatMap((event) => event.data.message.content)
        .filter((block) => block.type === "tool-call" && block.name === "session_event_read");
      assert.ok(reads.length > 0, "history: an exact source event was not read");
      const logs = sessionFiles(join(home, "live-sessions")).map((path) =>
        readFileSync(path, "utf8")
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line)),
      );
      const cited = reads.some((read) => {
        const args = JSON.parse(read.arguments);
        if (typeof args.session_id !== "string" || !Number.isSafeInteger(args.seq)) return false;
        const source = logs
          .find((events) => events[0].id === args.session_id)
          ?.find((event) => event.seq === args.seq);
        return (
          source &&
          JSON.stringify(source).includes(corrected) &&
          final.includes(args.session_id) &&
          final.includes(String(args.seq))
        );
      });
      assert.ok(cited, "history: no read, relevant source event was cited in the final answer");
      assert.match(final, /历史|过期|当前.*(?:无效|不再)/);
    }
    if (name === "global-remember") {
      const write = messages
        .flatMap((event) => event.data.message.content)
        .find((block) => block.type === "tool-call" && block.name === "memory_remember");
      assert.ok(write, "global preference was not written");
      assert.equal(JSON.parse(write.arguments).scope, "global");
    }
    if (name === "history") {
      assert.ok(
        tools.every((tool) =>
          [
            "session_search",
            "session_event_read",
            "session_event_search",
            "session_trace",
            "session_event_trace",
          ].includes(tool),
        ),
        "history must not recapture archived facts",
      );
    }
    const database = new DatabaseSync(join(home, "live-memory.sqlite"), { readOnly: true });
    let stored;
    try {
      stored = database
        .prepare("SELECT record_json FROM memories WHERE scope='workspace' AND workspace_key=?")
        .all(realpathSync(cwd))
        .map((row) => JSON.parse(row.record_json));
      if (name === "remember") {
        assert.equal(stored.length, 1);
        projectMemoryId = stored[0].id;
      }
      if (["correct", "recall-corrected", "archive", "recall-archived", "history"].includes(name)) {
        assert.equal(stored.length, 1, "project fact was duplicated");
        assert.equal(stored[0].id, projectMemoryId, "correction changed the logical record id");
        assert.ok(stored[0].content.includes(corrected));
      }
      if (["archive", "recall-archived", "history"].includes(name))
        assert.equal(stored[0].status, "archived");
      if (name === "global-remember") {
        const global = database
          .prepare("SELECT record_json FROM memories WHERE scope='global' AND record_json LIKE ?")
          .all(`%${globalMarker}%`)
          .map((row) => JSON.parse(row.record_json));
        assert.equal(global.length, 1);
        assert.equal(global[0].workspaceKey, "");
      }
    } finally {
      database.close();
    }
    if (expected)
      assert.ok(
        (expectedTool
          ? JSON.stringify(events.filter((event) => event.type === "tool/result"))
          : final
        ).includes(expected),
        `${name}: missing expected fact in final answer: ${final}`,
      );
    if (excluded)
      assert.ok(!final.includes(excluded), `${name}: obsolete or foreign fact leaked: ${final}`);
    if (expectedTool)
      assert.ok(tools.includes(expectedTool), `${name}: ${expectedTool} was not called`);
    assert.equal(
      failedTools.length,
      0,
      `${name}: native tool errors: ${JSON.stringify(failedTools)}`,
    );
    assert.ok(
      messages.every(
        (event) =>
          event.data.message.source.provider === "ollama" &&
          event.data.message.source.model === "deepseek-v4.1-flash",
      ),
      "unexpected model route",
    );
    const result = {
      name,
      passed: true,
      elapsedMs: Date.now() - started,
      final,
      tools,
      modelCalls: messages.length,
      storedProjectRecords: stored.map(({ id, revision, status }) => ({ id, revision, status })),
      usage: messages.map((event) => event.data.usage).filter(Boolean),
      sessionLog: added[0],
    };
    results.push(result);
    writeFileSync(
      ".cache/live-model.json",
      `${JSON.stringify({ testedAt: new Date().toISOString(), model: "ollama/deepseek-v4.1-flash", profile, home, results }, null, 2)}\n`,
    );
    console.log(JSON.stringify(result));
  }
}

await main();
