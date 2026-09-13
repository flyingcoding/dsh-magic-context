import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { resolve } from "node:path";

/** Bundle the self-contained DSH source while keeping host packages external. */
async function build(): Promise<void> {
  if (existsSync("dist")) {
    mkdirSync(".cache/builds", { recursive: true });
    renameSync("dist", `.cache/builds/${randomUUID()}`);
  }
  const result = await Bun.build({
    entrypoints: ["src/index.ts", "src/tools.ts", "src/recall.ts", "src/store.ts"],
    outdir: "dist",
    target: "node",
    format: "esm",
    splitting: false,
    packages: "external",
    sourcemap: "external",
  });
  if (!result.success) throw new AggregateError(result.logs, "DSH adapter build failed");
  for (const output of result.outputs) {
    if (!output.path.endsWith(".js")) continue;
    execFileSync("node", ["--check", output.path], { stdio: "pipe" });
    const text = await output.text();
    if (/onnxruntime|@huggingface|@opentui|@cortexkit\/subc|@opencode-ai/.test(text)) {
      throw new Error(`Unexpected heavyweight dependency in ${output.path}`);
    }
  }
  const client = await Bun.build({
    entrypoints: ["src/client/index.ts"],
    target: "browser",
    format: "cjs",
    packages: "external",
    minify: true,
    jsx: { runtime: "automatic", development: false },
    define: { "process.env.NODE_ENV": '"production"' },
  });
  if (!client.success) throw new AggregateError(client.logs, "DSH client build failed");
  const source = await client.outputs[0].text();
  if (source.includes("react/jsx-dev-runtime")) {
    throw new Error("DSH client must use the production React JSX runtime");
  }
  await Bun.write(
    "dist/client.js",
    `window.__ModuleLoader__.load({id:"@flyingcoding/dsh-magic-context",factory:(require)=>{var module={exports:{}};var exports=module.exports;\n${source}\nreturn module.exports;}});\n`,
  );
  console.log(`Built native DSH adapter in ${resolve("dist")}`);
}

await build();
