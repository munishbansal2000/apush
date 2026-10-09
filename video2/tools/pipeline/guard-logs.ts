/** Layout-guard browser logs: per-frame heartbeats and issue reports (src/kit/guard.tsx). */
export interface LayoutIssue {frame: number; kind: string; id: string; other?: string; detail?: string}
export const layoutIssuesFromLog = (text: string): LayoutIssue[] => {
  const match = /\[(?:kit-layout|layout-guard)\]\s+(\{.*\})$/s.exec(text);
  if (!match) return [];
  try {
    const payload = JSON.parse(match[1]) as {frame?: number; issues?: Omit<LayoutIssue, 'frame'>[]};
    return (payload.issues ?? []).map(issue => ({frame: Number(payload.frame ?? -1), ...issue}));
  } catch (error) {
    throw new Error(`invalid layout-guard browser log: ${error instanceof Error ? error.message : String(error)}`);
  }
};
/** Frame number from the guard's per-frame `[kit-layout-ok]` heartbeat, or null for any other log line. */
export const guardHeartbeat = (text: string): number | null => {
  if (!text.startsWith('[kit-layout-ok]')) return null;
  const frame = Number((JSON.parse(text.slice('[kit-layout-ok]'.length)) as {frame?: number}).frame);
  return Number.isFinite(frame) ? frame : null;
};
export const blockingLayoutIssues = (issues: LayoutIssue[]) => issues.filter(issue => issue.kind !== 'unsafe');
export const formatLayoutIssues = (issues: LayoutIssue[]) => issues.slice(0, 12).map(issue =>
  `  - frame ${issue.frame}: ${issue.kind} ${issue.id}${issue.other ? ` x ${issue.other}` : ''}${issue.detail ? ` - ${issue.detail}` : ''}`,
).join('\n');
