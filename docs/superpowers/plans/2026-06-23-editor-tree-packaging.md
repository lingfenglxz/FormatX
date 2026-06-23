# Editor, Tree, and Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make pasted JSON remain clean and readable, compact and align JSON tree controls, and ship Chinese MSI plus a no-install portable ZIP.

**Architecture:** Keep the textarea plus inert syntax mirror. Replace chained HTML replacements with one token matcher so generated markup is never parsed again. Render property labels inside the recursive tree node so the chevron is always before the label. A Windows PowerShell release script packages Tauri's already-built EXE into a ZIP after one normal Tauri build.

**Tech Stack:** React 19, TypeScript, Vitest, CSS, Tauri 2, WiX, Windows PowerShell.

---

### Task 1: Preserve JSON text during highlighting

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
it('keeps pasted JSON free of syntax token markup', () => {
  render(<App />);
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '{"customerOrder":{"custId":1}}' } });
  expect(textarea.value).not.toContain('tok-key');
  expect(document.querySelector('.editor-mirror')!.textContent).toBe('{"customerOrder":{"custId":1}}\n');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm.cmd test -- src/App.test.tsx`

Expected: FAIL because the mirror text contains `tok-key` from nested highlighting markup.

- [ ] **Step 3: Replace the chained highlighter with one token matcher**

```ts
const tokenPattern = /"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g;
return html.replace(tokenPattern, (token, offset, source) => {
  const isKey = token.startsWith('"') && /^\s*:/.test(source.slice(offset + token.length));
  const cls = token.startsWith('"') ? (isKey ? 'tok-key' : 'tok-str') : token === 'null' ? 'tok-null' : /^(true|false)$/.test(token) ? 'tok-bool' : 'tok-num';
  return `<span class="${cls}">${token}</span>`;
});
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npm.cmd test -- src/App.test.tsx`

Expected: PASS, including the new mirror-text assertion.

### Task 2: Align tree chevrons and compact indentation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
it('places a child chevron before its key label', () => {
  render(<App />);
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '{"customerOrder":{"custId":1}}' } });
  expect(document.querySelectorAll('.node-head')[1].textContent).toMatch(/^▸customerOrder:/);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm.cmd test -- src/App.test.tsx`

Expected: FAIL because the child arrow is currently rendered after `customerOrder:`.

- [ ] **Step 3: Move property-label rendering into `JsonTree`**

```tsx
interface JsonTreeProps { value: unknown; label?: string; /* existing props */ }

<div className="node-head" onClick={() => setManualOpen(!open)}>
  <span className="chevron">{open ? '▾' : '▸'}</span>
  {label && <><span className="key">{label}</span><span className="colon">:</span></>}
  <span className="bracket">{ob}</span>
  {!open && <span className="ellipsis">{entries.length ? '…' : ''}</span>}
  {!open && <span className="bracket">{cb}</span>}
  <span className="meta">{entries.length}{isArray ? ' 项' : ' 键'}</span>
</div>

<JsonTree value={child} label={key} depth={depth + 1} query={query}
  activePath={childActive ? activePath : null}
  onChange={(next) => onChange(setJsonPrimitive(value as Record<string, unknown>, [key], next))}
  onNodeRef={onNodeRef} currentPath={cp} />
```

For primitive children, retain the existing `AutoKeyInput`, colon, and `EditableValue` rendering. For object/array children, omit that outer key/colon pair and pass `label={key}` instead.

- [ ] **Step 4: Make the tree indentation exactly two characters and restore selection readability**

```css
.node-body { padding-left:2ch; margin-left:0; }
.editor-wrap textarea::selection { background:var(--accent); color:var(--accent-fg); -webkit-text-fill-color:var(--accent-fg); }
```

Remove `mix-blend-mode:screen`; it makes the transparent textarea selection hide glyphs over the mirror.

- [ ] **Step 5: Run the focused test and confirm it passes**

Run: `npm.cmd test -- src/App.test.tsx`

Expected: PASS, with the child node head beginning `▸customerOrder:`.

### Task 3: Add Chinese MSI and a portable release artifact

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Create: `scripts/build-release.ps1`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Write the release-script assertions**

Create `scripts/build-release.test.ps1` with assertions that load `build-release.ps1` as text and verify it references `FormatX.exe`, `FormatX-portable.zip`, and `Compress-Archive`.

- [ ] **Step 2: Run the script assertions and confirm they fail**

Run: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.test.ps1`

Expected: FAIL because `scripts/build-release.ps1` does not exist.

- [ ] **Step 3: Add the smallest Windows-only release script and configuration**

Set `bundle.windows.wix.language` to `["zh-CN"]`. Add `build:release` as `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.ps1`. The script must invoke `npm.cmd run tauri build`, copy `src-tauri/target/release/FormatX.exe` into a temporary `FormatX-portable` directory below `src-tauri/target/release/bundle`, zip that directory as `FormatX-portable.zip`, then remove only that temporary directory.

- [ ] **Step 4: Update build instructions**

Document `npm.cmd run build:release` and list the NSIS EXE, Chinese MSI, and portable ZIP output locations. State that the portable ZIP requires no installation but needs the Microsoft Edge WebView2 Runtime available on the target Windows machine.

- [ ] **Step 5: Run release-script assertions and confirm they pass**

Run: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.test.ps1`

Expected: PASS.

### Task 4: Verify the completed application and release output

**Files:**
- Test: `src/App.test.tsx`
- Test: `scripts/build-release.test.ps1`

- [ ] **Step 1: Run all frontend tests**

Run: `npm.cmd test`

Expected: PASS.

- [ ] **Step 2: Run type checking and production frontend build**

Run: `npm.cmd run check`

Expected: PASS.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 3: Build all Windows artifacts**

Run: `npm.cmd run build:release`

Expected: `src-tauri/target/release/bundle/nsis/`, `src-tauri/target/release/bundle/msi/`, and `src-tauri/target/release/bundle/FormatX-portable.zip` exist; the ZIP contains `FormatX-portable/FormatX.exe`.
