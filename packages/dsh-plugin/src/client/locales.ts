/** Copy keys belong to this settings page and remain synchronized across locales. */
export const en = {
  nav: "Memory",
  title: "Local memory",
  intro:
    "Review saved facts, correct outdated content, and archive what should no longer be recalled.",
  workspace: "Workspace",
  global: "Global preferences",
  refresh: "Refresh",
  next: "Next page",
  first: "First page",
  moreWorkspaces: "Load more workspaces",
  exportPage: "Export this page",
  empty: "No memories in this scope.",
  loading: "Loading memories…",
  content: "Saved fact",
  save: "Save correction",
  archive: "Archive",
  saving: "Saving…",
  active: "Active",
  archived: "Archived",
  superseded: "Superseded",
  revision: "Revision {revision}",
  fromTool: "Saved by an agent",
  fromUser: "Edited in settings",
  error: "Could not complete the operation: {message}",
  archiveHint: "Archived facts stay in the revision history and are excluded from future recall.",
  pageHint:
    "Exports contain the displayed page, including archived records. Use Next page for additional records.",
};

export const zh: Record<keyof typeof en, string> = {
  nav: "记忆",
  title: "本地记忆",
  intro: "查看已保存的事实，纠正过时内容，归档不应继续召回的记忆。",
  workspace: "工作区",
  global: "全局偏好",
  refresh: "刷新",
  next: "下一页",
  first: "第一页",
  moreWorkspaces: "加载更多工作区",
  exportPage: "导出当前页",
  empty: "此作用域暂无记忆。",
  loading: "正在加载记忆…",
  content: "已保存的事实",
  save: "保存修正",
  archive: "归档",
  saving: "正在保存…",
  active: "有效",
  archived: "已归档",
  superseded: "已被修订",
  revision: "修订 {revision}",
  fromTool: "由智能体保存",
  fromUser: "在设置中编辑",
  error: "操作未完成：{message}",
  archiveHint: "归档内容保留在修订历史中，后续召回不再包含它。",
  pageHint: "导出仅包含当前页（含已归档记录），更多记录请翻页查看。",
};

export type MemoryCopyKey = keyof typeof en;

declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface LocaleNamespaceMap {
    "settings.magicMemory": MemoryCopyKey;
  }
}
