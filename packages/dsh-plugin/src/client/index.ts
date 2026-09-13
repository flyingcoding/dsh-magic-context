import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-api-remotes/client";
import type {} from "@deepseek-ai/dsh-client-locale/client";
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
import type {} from "@deepseek-ai/dsh-client-ui-settings/client";
import { MANAGEMENT_CLIENT, type ManagementRequest } from "../management-wire.ts";
import { en, zh } from "./locales.ts";
import { MemoryPage } from "./page.tsx";

export const inject = ["remote", "slots", "locale"];
export const PAGE_CSS = `
.dsh-memory-page{max-width:780px;display:flex;flex-direction:column;gap:12px;color:var(--dsw-alias-label-primary,#222)}
.dsh-memory-page h2,.dsh-memory-page p{margin:0}.dsh-memory-page p{line-height:1.6}
.dsh-memory-page ul{list-style:none;padding:0;margin:0}.dsh-memory-row{display:flex;flex-direction:column;gap:9px;border-top:1px solid var(--dsw-alias-border-l2,#ddd);padding:18px 0}
.dsh-memory-page textarea,.dsh-memory-page select{box-sizing:border-box;width:100%;font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:7px;padding:9px;background:var(--dsw-alias-bg-layer-1,#fff)}
.dsh-memory-page textarea{resize:vertical;min-height:88px;line-height:1.6}.dsh-memory-page textarea:disabled{opacity:.65}
.dsh-memory-actions,.dsh-memory-meta{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.dsh-memory-meta,.dsh-memory-hint{font-size:12px;color:var(--dsw-alias-label-tertiary,#666)}
.dsh-memory-page button{font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-3,#f5f5f5);border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:7px;padding:7px 12px;cursor:pointer}
.dsh-memory-page button:disabled{opacity:.5;cursor:default}.dsh-memory-page :focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3b6dba);outline-offset:2px}
.dsh-memory-page [role=alert]{color:var(--dsw-alias-label-error,#b3261e)}
`;

/** Mount one locale-owned settings page through the existing DSH client loader. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register("settings.magicMemory", { en, zh }));
  ctx.effect(() => {
    const style = document.createElement("style");
    style.textContent = PAGE_CSS;
    document.head.append(style);
    return () => style.remove();
  });
  ctx.effect(() => {
    let active = true;
    let unmount: (() => Promise<void>) | undefined;
    const mounting = ctx.remote
      .$mount(MANAGEMENT_CLIENT)
      .then(async (dispose: () => Promise<void>) => {
        if (!active) {
          await dispose();
          return;
        }
        unmount = dispose;
        ctx.inject(["remote.magicMemoryManager", "slots", "locale"], (pageCtx) => {
          /** Validate the gateway result before passing JSON text to the settings component. */
          const invoke = async (request: ManagementRequest): Promise<string> => {
            const result = await pageCtx.remote.magicMemoryManager.dispatch(
              JSON.stringify(request),
            );
            if (!result.ok) throw new Error(result.error.message);
            return result.value;
          };
          pageCtx.slots.inject("settings.section", () =>
            pageCtx.slots.register(
              {
                name: "settings.section",
                id: "magic-memory",
                order: 16,
                label: () => pageCtx.locale.bind("settings.magicMemory")("nav"),
                locale: "settings.magicMemory",
                inject: () => ({ invoke }),
              },
              MemoryPage,
            ),
          );
        });
      });
    // Loader diagnostics receive mount failures; no polling or retry timer is retained.
    void mounting.catch((error: unknown) => ctx.logger.error(error));
    return async () => {
      active = false;
      await mounting;
      await unmount?.();
    };
  });
}
