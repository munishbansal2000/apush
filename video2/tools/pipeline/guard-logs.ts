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
/** One line per distinct problem (kind, element, other element) with the frames it covers; at most `max` lines. */
export const formatLayoutIssues = (issues: LayoutIssue[], max = 20) => {
  const groups = new Map<string, {issue: LayoutIssue; frames: number[]}>();
  for (const issue of issues) {
    const key = `${issue.kind}|${issue.id}|${issue.other ?? ''}`;
    const g = groups.get(key) ?? {issue, frames: []};
    g.frames.push(issue.frame);
    groups.set(key, g);
  }
  const span = (f: number[]) => { const s = [...f].sort((a, b) => a - b); return s.length === 1 ? `frame ${s[0]}` : `frames ${s[0]}-${s[s.length - 1]} (${s.length})`; };
  const lines = [...groups.values()].map(({issue, frames}) => `  - ${span(frames)}: ${issue.kind} ${issue.id}${issue.other ? ` x ${issue.other}` : ''}${issue.detail ? ` - ${issue.detail}` : ''}`);
  return [...lines.slice(0, max), ...(lines.length > max ? [`  ... and ${lines.length - max} more (see the layout report)`] : [])].join('\n');
};
