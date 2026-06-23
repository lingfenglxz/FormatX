import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDocument, minifyDocument, parseDocument, type DocumentKind } from './lib/formatters';
import { renameJsonKey, setJsonPrimitive } from './lib/tree';

type Theme = 'light' | 'dark';

interface Tab {
  id: string;
  kind: DocumentKind;
  text: string;
  valid: unknown;
  error: string;
  query: string;
}

function escapeRegExp(text: string): string { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function uid(): string { return Math.random().toString(36).slice(2, 9); }
function parseValue(value: string): unknown { try { return JSON.parse(value); } catch { return value; } }

function createTab(kind: DocumentKind = 'json', text = ''): Tab {
  let valid: unknown = null;
  let error = '就绪';
  if (text.trim()) {
    try { valid = parseDocument(kind, text); } catch (e) { error = e instanceof Error ? e.message : '内容无效'; }
  }
  return { id: uid(), kind, text, valid, error, query: '' };
}

/* ========== 搜索匹配工具 ========== */
function matchText(value: unknown, query: string): boolean {
  if (!query) return false;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.toLowerCase().includes(query.toLowerCase());
}
function highlightHtml(text: string, query: string): string {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!query) return safe;
  try { return safe.replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), '<mark>$1</mark>'); } catch { return safe; }
}
function findTextMatches(text: string, query: string): number[] {
  if (!query) return [];
  const out: number[] = [];
  const lower = text.toLowerCase(), q = query.toLowerCase();
  let i = 0;
  while (i <= lower.length) { const idx = lower.indexOf(q, i); if (idx < 0) break; out.push(idx); i = idx + q.length; }
  return out;
}
interface TreeHit { path: string[] }
function collectTreeHits(value: unknown, query: string, path: string[] = [], out: TreeHit[] = []): TreeHit[] {
  if (!query) return out;
  if (value && typeof value === 'object') {
    const entries = Array.isArray(value)
      ? (value as unknown[]).map((v, i) => [String(i), v] as const)
      : Object.entries(value as Record<string, unknown>);
    for (const [k, v] of entries) {
      if (k.toLowerCase().includes(query.toLowerCase())) out.push({ path: [...path, k] });
      collectTreeHits(v, query, [...path, k], out);
    }
  } else if (matchText(value, query)) out.push({ path });
  return out;
}

/* ========== JSON 语法着色 ========== */
function highlightJson(text: string, query: string): string {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 先用 mark 包裹搜索命中
  if (query) {
    try { html = html.replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), '<mark>$1</mark>'); } catch { /* noop */ }
  }
  // token 着色
  html = html.replace(/(\s*"(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="tok-key">$1</span>$2');
  html = html.replace(/(\s*"(?:[^"\\]|\\.)*")/g, '<span class="tok-str">$1</span>');
  html = html.replace(/(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, '<span class="tok-num">$1</span>');
  html = html.replace(/\b(true|false)\b/g, '<span class="tok-bool">$1</span>');
  html = html.replace(/\b(null)\b/g, '<span class="tok-null">$1</span>');
  return html;
}

/* ========== 输入组件 ========== */
function AutoKeyInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [val, setVal] = useState(value);
  return (
    <input
      className="key-input" value={val} size={1} spellCheck={false}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onChange(val); }}
      style={{ width: `${Math.max(val.length, 1)}ch` }}
    />
  );
}

function EditableValue({ value, query, isCurrent, onChange }: { value: unknown; query: string; isCurrent: boolean; onChange: (next: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const typeClass = value === null ? 'null' : typeof value;
  const isHit = matchText(value, query);

  if (editing) {
    return (
      <input
        className={`val-input ${typeClass}`} defaultValue={text} autoFocus
        onBlur={(e) => { onChange(parseValue(e.target.value)); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{ width: `${Math.max(text.length, 2)}ch` }}
      />
    );
  }
  return (
    <span
      className={`val ${typeClass}${isHit ? ' hit' : ''}${isCurrent ? ' current' : ''}`}
      dangerouslySetInnerHTML={{ __html: highlightHtml(text, query) }}
      onDoubleClick={() => setEditing(true)}
      title="双击编辑值"
    />
  );
}

/* ========== 树组件 ========== */
interface JsonTreeProps {
  value: unknown;
  depth: number;
  query: string;
  activePath: string[] | null;
  onChange: (next: unknown) => void;
  onNodeRef?: (el: HTMLDivElement | null) => void;
  currentPath?: string[];
}
function JsonTree({ value, depth, query, activePath, onChange, onNodeRef, currentPath = [] }: JsonTreeProps) {
  const isOnPath = activePath !== null && activePath.length > currentPath.length && activePath.slice(0, currentPath.length).join('.') === currentPath.join('.');
  const isCurrent = activePath !== null && activePath.join('.') === currentPath.join('.');
  const [manualOpen, setManualOpen] = useState(depth === 0);  // 仅根节点默认展开
  const open = isOnPath ? true : manualOpen;                   // 命中路径强制展开

  if (value && typeof value === 'object') {
    const entries = Array.isArray(value)
      ? (value as unknown[]).map((v, i) => [String(i), v] as const)
      : Object.entries(value as Record<string, unknown>);
    const isArray = Array.isArray(value);
    const ob = isArray ? '[' : '{';
    const cb = isArray ? ']' : '}';
    const hasMatch = query ? entries.some(([k, v]) => k.toLowerCase().includes(query.toLowerCase()) || matchText(v, query)) : false;
    return (
      <div className={`node${open ? ' open' : ''}${hasMatch ? ' matched' : ''}${isCurrent ? ' current' : ''}`} ref={isCurrent ? (el) => onNodeRef?.(el) : undefined}>
        <div className="node-head" onClick={() => setManualOpen(!open)}>
          <span className="chevron">{open ? '▾' : '▸'}</span>
          <span className="bracket">{ob}</span>
          {!open && <span className="ellipsis">{entries.length ? '…' : ''}</span>}
          {!open && <span className="bracket">{cb}</span>}
          <span className="meta">{entries.length}{isArray ? ' 项' : ' 键'}</span>
        </div>
        {open && (
          <div className="node-body">
            {entries.map(([key, child]) => {
              const cp = [...currentPath, key];
              const childActive = activePath !== null && cp.join('.') === activePath.slice(0, cp.length).join('.');
              return (
                <div className="prop" key={key}>
                  {isArray
                    ? <span className="key" dangerouslySetInnerHTML={{ __html: highlightHtml(key, query) }} />
                    : <AutoKeyInput value={key} onChange={(next) => onChange(renameJsonKey(value as Record<string, unknown>, [key], next))} />}
                  <span className="colon">:</span>
                  <JsonTree
                    value={child} depth={depth + 1} query={query}
                    activePath={childActive ? activePath : null}
                    onChange={(next) => onChange(setJsonPrimitive(value as Record<string, unknown>, [key], next))}
                    onNodeRef={onNodeRef} currentPath={cp}
                  />
                </div>
              );
            })}
            <div className="node-tail"><span className="bracket">{cb}</span></div>
          </div>
        )}
      </div>
    );
  }
  return <EditableValue value={value} query={query} isCurrent={isCurrent} onChange={onChange} />;
}

/* ========== 语法着色编辑器 ========== */
function CodeEditor({ tab, onUpdate }: { tab: Tab; onUpdate: (p: Partial<Tab>) => void }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const highlighted = useMemo(() => highlightJson(tab.text, tab.query), [tab.text, tab.query]);

  const handleChange = (text: string) => {
    if (!text.trim()) { onUpdate({ text, valid: null, error: '就绪' }); return; }
    try { onUpdate({ text, valid: parseDocument(tab.kind, text), error: '已同步' }); }
    catch (err) { onUpdate({ text, valid: null, error: err instanceof Error ? err.message : '内容无效' }); }
  };

  return (
    <div className="editor-wrap">
      <div className="editor-mirror" ref={mirrorRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlighted + '\n' }} />
      <textarea ref={taRef} value={tab.text} spellCheck={false}
        onChange={(e) => handleChange(e.target.value)}
        onScroll={() => { if (mirrorRef.current && taRef.current) { mirrorRef.current.scrollTop = taRef.current.scrollTop; mirrorRef.current.scrollLeft = taRef.current.scrollLeft; } }}
      />
    </div>
  );
}

/* ========== 主面板 ========== */
function Pane({ tab, onUpdate, onQuery, onSearch, onNav, activeIdx, matchCount }: {
  tab: Tab; onUpdate: (p: Partial<Tab>) => void; onQuery: (q: string) => void;
  onSearch: () => void; onNav: (d: -1 | 1) => void; activeIdx: number; matchCount: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement | null>(null);
  const [activePath, setActivePath] = useState<string[] | null>(null);

  const hasContent = tab.text.trim().length > 0;
  const textMatches = useMemo(() => findTextMatches(tab.text, tab.query), [tab.text, tab.query]);
  const treeHits = useMemo(() => hasContent && tab.valid !== null && tab.kind === 'json' ? collectTreeHits(tab.valid, tab.query) : [], [tab.valid, tab.query, hasContent, tab.kind]);

  // 左侧选区 + 滚动
  useEffect(() => {
    const ta = document.querySelector<HTMLTextAreaElement>('.editor-wrap textarea');
    if (!ta || !tab.query || textMatches.length === 0) return;
    const pos = textMatches[activeIdx % textMatches.length] ?? textMatches[0];
    ta.focus();
    ta.setSelectionRange(pos, pos + tab.query.length);
    const lineHeight = 19;
    const lines = (tab.text.slice(0, pos).match(/\n/g)?.length ?? 0);
    ta.scrollTop = Math.max(0, lines * lineHeight - ta.clientHeight / 2);
  }, [activeIdx, tab.query, tab.text, textMatches]);

  // 右侧命中路径
  useEffect(() => {
    if (tab.kind !== 'json' || !tab.query || treeHits.length === 0 || !hasContent) { setActivePath(null); return; }
    setActivePath(treeHits[activeIdx % treeHits.length].path);
  }, [activeIdx, tab.query, treeHits, hasContent, tab.kind]);
  // 路径变更后滚动
  useEffect(() => {
    const el = activeNodeRef.current;
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activePath]);

  const tree = hasContent && tab.valid !== null
    ? (tab.kind === 'json'
        ? <JsonTree value={tab.valid} depth={0} query={tab.query} activePath={activePath}
            onChange={(next) => onUpdate({ text: JSON.stringify(next, null, 2), valid: next, error: '已同步' })}
            onNodeRef={(el) => { activeNodeRef.current = el; }} />
        : <pre className="xml-tree">{tab.valid instanceof Document ? new XMLSerializer().serializeToString(tab.valid) : ''}</pre>)
    : <div className="tree-empty">在左侧输入内容后将自动生成结构</div>;

  return (
    <section className="editor-section">
      <div className="pane">
        <div className="pane-head"><span>编辑器</span><span className="pane-meta">{tab.text.length} 字符</span></div>
        <CodeEditor tab={tab} onUpdate={onUpdate} />
      </div>
      <div className="pane">
        <div className="pane-head"><span>结构</span><span className="pane-meta">{tab.query && matchCount > 0 ? `${activeIdx + 1} / ${matchCount}` : '可编辑 (双击值)'}</span></div>
        <div className="tree" ref={treeRef}>{tree}</div>
      </div>
      <div className="search-bar">
        <input className="search-input" placeholder="查找…" value={tab.query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch(); } }} />
        <button className="search-btn" onClick={onSearch}>查找</button>
        <button className="nav-btn" onClick={() => onNav(-1)} disabled={matchCount === 0} title="上一个">↑</button>
        <span className="match-count">{matchCount > 0 ? `${activeIdx + 1}/${matchCount}` : '0/0'}</span>
        <button className="nav-btn" onClick={() => onNav(1)} disabled={matchCount === 0} title="下一个">↓</button>
        {tab.query && <button className="search-clear" onClick={() => onQuery('')}>✕</button>}
      </div>
    </section>
  );
}

/* ========== App ========== */
export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([createTab()]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('formatx-theme') as Theme) ?? 'dark');
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => { localStorage.setItem('formatx-theme', theme); document.documentElement.dataset.theme = theme; }, [theme]);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const updateActive = useCallback((p: Partial<Tab>) => setTabs((prev) => prev.map((t) => (t.id === active.id ? { ...t, ...p } : t))), [active.id]);

  const transform = (fn: typeof formatDocument) => {
    try { const n = fn(active.kind, active.text); updateActive({ text: n, valid: parseDocument(active.kind, n), error: '已格式化' }); }
    catch (e) { updateActive({ error: e instanceof Error ? e.message : '处理失败' }); }
  };
  const addTab = () => { const t = createTab(); setTabs((prev) => [...prev, t]); setActiveId(t.id); setActiveIdx(0); };
  const closeTab = (id: string) => {
    setTabs((prev) => {
      if (prev.length === 1) { const fresh = createTab(); setActiveId(fresh.id); return [fresh]; }
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (id === activeId) setActiveId(next[Math.min(idx, next.length - 1)].id);
      return next;
    });
  };
  const switchKind = (kind: DocumentKind) => { try { updateActive({ kind, text: '', valid: null, error: '就绪' }); } catch { /* noop */ } setActiveIdx(0); };

  const matchCount = useMemo(() => findTextMatches(active.text, active.query).length, [active.text, active.query]);
  const doSearch = useCallback(() => setActiveIdx(0), []);
  const navMatch = useCallback((dir: -1 | 1) => { if (matchCount === 0) return; setActiveIdx((i) => (i + dir + matchCount) % matchCount); }, [matchCount]);

  return (
    <main className={`app theme-${theme}`}>
      <div className="titlebar">
        <span className="app-name">FormatX</span>
        <div className="tabs">
          {tabs.map((t) => (
            <div key={t.id} className={`tab ${t.id === active.id ? 'active' : ''}`} onClick={() => { setActiveId(t.id); setActiveIdx(0); }}>
              <span className="tab-kind">{t.kind.toUpperCase()}</span>
              <span className="tab-close" onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}>✕</span>
            </div>
          ))}
          <button className="tab-add" onClick={addTab} title="新建标签">+</button>
        </div>
        <div className="titlebar-right">
          <div className="kind-switch">
            <button className={active.kind === 'json' ? 'active' : ''} onClick={() => switchKind('json')}>JSON</button>
            <button className={active.kind === 'xml' ? 'active' : ''} onClick={() => switchKind('xml')}>XML</button>
          </div>
          <button className="icon-btn" onClick={() => transform(formatDocument)} title="格式化">格式化</button>
          <button className="icon-btn" onClick={() => transform(minifyDocument)} title="压缩">压缩</button>
          <button className="icon-btn" onClick={() => navigator.clipboard.writeText(active.text)} title="复制">复制</button>
          <button className="icon-btn" onClick={() => updateActive({ text: '', valid: null, error: '就绪' })} title="清空">清空</button>
          <button className="icon-btn theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="切换主题">{theme === 'dark' ? '☀' : '☾'}</button>
        </div>
      </div>
      <Pane tab={active} onUpdate={updateActive} onQuery={(q) => { updateActive({ query: q }); setActiveIdx(0); }}
        onSearch={doSearch} onNav={navMatch} activeIdx={activeIdx} matchCount={matchCount} />
      <footer className="statusbar">
        <span>{active.kind.toUpperCase()}</span>
        <span>{active.text.length} 字符</span>
        <span className={active.error === '就绪' || active.error === '已同步' || active.error === '已格式化' ? 'ok' : 'err'}>{active.error}</span>
      </footer>
    </main>
  );
}
