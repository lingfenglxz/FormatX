# Compact Tree Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every JSON container as an inline count label, with the root shown as `object {N}`.

**Architecture:** Keep the existing recursive `JsonTree` component. Replace its separate bracket, ellipsis, and meta spans with one type-aware count span that is rendered in both expanded and collapsed states; root gets a fixed `object` label. The tree data, editing, searching, and expand state remain unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library.

---

### Task 1: Render compact container labels

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Write the failing test**

Replace the old collapsed-only count assertion with this test:

```tsx
it('shows inline counts for root and container nodes while expanded', () => {
  render(<App />);
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '{"customerOrder":{"custId":1},"prodOrderItems":[1,2]}' } });

  const heads = document.querySelectorAll('.node-head');
  expect(heads[0].textContent).toContain('object {2}');
  expect(heads[1].textContent).toContain('customerOrder {1}');
  expect(heads[2].textContent).toContain('prodOrderItems [2]');
  expect(document.querySelector('.ellipsis')).toBeNull();
  expect(document.querySelector('.bracket')).toBeNull();
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npm.cmd test -- src/App.test.tsx -t "shows inline counts for root and container nodes while expanded"`

Expected: FAIL because the root has no `object` label and expanded nodes omit counts.

- [x] **Step 3: Write the minimal implementation**

In `JsonTree` in `src/App.tsx`, replace the `ob`, `cb`, `ellipsis`, `meta`, and `node-tail` rendering with one always-visible count span:

```tsx
const count = `${isArray ? '[' : '{'}${entries.length}${isArray ? ']' : '}'}`;
const nodeLabel = label ?? (depth === 0 ? 'object' : undefined);
```

Render `nodeLabel` when defined and then `<span className="meta">{count}</span>` in the node head. Do not render a colon for the root label, brackets, ellipsis, or a closing-tail row.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npm.cmd test -- src/App.test.tsx -t "shows inline counts for root and container nodes while expanded"`

Expected: PASS.

- [x] **Step 5: Run regression verification**

Run: `npm.cmd test; npm.cmd run check; npm.cmd run build`

Expected: all tests pass, TypeScript reports no errors, and Vite completes a production build.

- [x] **Step 6: Commit**

```powershell
git add src/App.tsx src/App.test.tsx docs/superpowers/plans/2026-06-24-compact-tree-labels.md
git commit -m "feat: compact tree container labels"
```

### Task 2: Rebuild Windows deliverables

**Files:**
- Modify: generated files below `src-tauri/target/release/bundle/`

- [x] **Step 1: Verify the release-script contract**

Run: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.test.ps1`

Expected: exits with code 0, confirming the script produces `FormatX.exe` and `FormatX-portable.zip` and keeps the MSI language setting.

- [x] **Step 2: Rebuild installer and portable ZIP**

Run: `npm.cmd run build:release`

Expected: Tauri generates NSIS and MSI installers under `src-tauri/target/release/bundle/`, and the release script generates `FormatX-portable.zip` in the same directory.

- [x] **Step 3: Verify artifacts**

Run: `Get-ChildItem src-tauri/target/release/bundle -Recurse -File | Select-Object FullName,Length,LastWriteTime`

Expected: non-empty `.exe` installer, `.msi` installer, and `FormatX-portable.zip` are present.
