import { useMemo, useState } from 'react';
import { formatDocument, minifyDocument, parseDocument, type DocumentKind } from './lib/formatters';
import { renameJsonKey, setJsonPrimitive } from './lib/tree';

function parseValue(value: string): unknown { try { return JSON.parse(value); } catch { return value; } }

function JsonTree({ value, path = [], depth = 0, onChange }: { value: unknown; path?: string[]; depth?: number; onChange: (value: unknown) => void }) {
  const [open, setOpen] = useState(depth === 0);
  if (value && typeof value === 'object') {
    const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
    return (<div className="tree-node">
      <button className="chevron" aria-label={open ? '收起节点' : '展开节点'} onClick={() => setOpen(!open)}>{open ? '▼' : '▶'}</button>
      <span>{Array.isArray(value) ? `[ ${entries.length} items ]` : '{'}</span>
      {open && <div className="tree-children">{entries.map(([key, child]) => (
        <div className="tree-row" key={key}>
          {Array.isArray(value) ? <span className="key">[{key}]</span> : <input className="key-input" defaultValue={key} onBlur={(e) => { if (e.target.value !== key) onChange(renameJsonKey(value, [key], e.target.value)); }} />}
          <span>: </span>
          <JsonTree value={child} path={[...path, key]} depth={depth + 1} onChange={(next) => onChange(setJsonPrimitive(value, [key], next))} />
        </div>
      ))}</div>}
    </div>);
  }
  return <input className="value-input" defaultValue={typeof value === 'string' ? value : JSON.stringify(value)} onBlur={(e) => onChange(parseValue(e.target.value))} />;
}

export default function App() {
  const [kind, setKind] = useState<DocumentKind>('json');
  const [text, setText] = useState('{"customer":{"name":"Ada","active":true},"orders":[1,2]}');
  const [valid, setValid] = useState<unknown>(() => parseDocument('json', text));
  const [error, setError] = useState('就绪');
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('formatx-theme') ?? 'system');
  const isDark = theme === 'dark' || (theme === 'system' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false));
  const update = (next: string) => { setText(next); try { setValid(parseDocument(kind, next)); setError('已同步'); } catch (e) { setError(e instanceof Error ? e.message : '内容无效'); } };
  const transform = (fn: typeof formatDocument) => { try { update(fn(kind, text)); } catch (e) { setError(e instanceof Error ? e.message : '处理失败'); } };
  const tree = useMemo(() => kind === 'json' ? <JsonTree value={valid} onChange={(next) => update(JSON.stringify(next, null, 2))} /> : <pre className="xml-tree">{valid instanceof Document ? new XMLSerializer().serializeToString(valid) : ''}</pre>, [valid, kind]);
  return <main className={isDark ? 'app dark' : 'app'}><header><strong>FormatX</strong><div className="tabs">{(['json', 'xml'] as const).map((x) => <button className={kind === x ? 'active' : ''} key={x} onClick={() => { setKind(x); update(x === 'json' ? '{}' : '<root/>'); }}>{x.toUpperCase()}</button>)}</div><button onClick={() => transform(formatDocument)}>格式化</button><button onClick={() => transform(minifyDocument)}>压缩</button><button onClick={() => navigator.clipboard.writeText(text)}>复制</button><button onClick={() => update('')}>清空</button><input aria-label="查找" placeholder="查找" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="主题" value={theme} onChange={(e) => { localStorage.setItem('formatx-theme', e.target.value); setTheme(e.target.value); }}><option value="system">跟随系统</option><option value="light">明亮</option><option value="dark">深色</option></select></header><section><div className="pane"><label>编辑器</label><textarea aria-label="内容编辑器" value={text} onChange={(e) => update(e.target.value)} spellCheck={false} /></div><div className="pane tree"><label>结构 {query && `· ${query}`}</label>{tree}</div></section><footer>{kind.toUpperCase()} · {text.length} 字符 · {error}</footer></main>;
}
