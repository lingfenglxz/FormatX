# FormatX MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a Windows Tauri desktop app that formats, compresses, searches, and tree-edits JSON/XML locally.

**Architecture:** A React renderer owns the text, parsed document, search query, and theme preference in one reducer. JSON uses native parsing; XML uses the browser DOM APIs. The tree mutates the parsed representation and serializes it back into the single left-hand editor, so the panes cannot drift.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Vitest, browser DOM APIs, Rust stable.

---

### Task 1: Scaffold the Tauri application

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`

- [ ] **Step 1: Create the smallest React/Vite/Tauri project manifest**

Use React, Tauri, Vite, TypeScript and Vitest only. Do not add a UI kit, state library, code editor, XML library, or icon library.

- [ ] **Step 2: Run the type-check command before application code exists**

Run: `npm.cmd run check`

Expected: command is present and reports missing initial application modules.

- [ ] **Step 3: Add the minimal Tauri entry point and React bootstrap**

```rust
fn main() {
    tauri::Builder::default().run(tauri::generate_context!()).expect("error while running FormatX");
}
```

```ts
createRoot(document.getElementById('root')!).render(<App />);
```

- [ ] **Step 4: Run the baseline checks**

Run: `npm.cmd run check` and `cargo check --manifest-path src-tauri/Cargo.toml`

Expected: both exit 0.

### Task 2: Implement and test pure JSON/XML formatting utilities

**Files:**
- Create: `src/lib/formatters.ts`
- Create: `src/lib/formatters.test.ts`

- [ ] **Step 1: Write failing format tests**

```ts
expect(formatDocument('json', '{"a":[1,2]}')).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
expect(minifyDocument('json', '{\n  "a": 1\n}')).toBe('{"a":1}');
expect(() => formatDocument('json', '{')).toThrow(/JSON/);
expect(formatDocument('xml', '<root><a>1</a></root>')).toContain('<a>1</a>');
```

- [ ] **Step 2: Run the targeted test and verify it fails because the module is missing**

Run: `npm.cmd test -- formatters.test.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement only the formatter APIs under test**

Export `DocumentKind`, `formatDocument(kind, text)`, `minifyDocument(kind, text)`, `parseDocument(kind, text)`, and `serializeDocument(kind, parsed)`. JSON uses `JSON.parse`/`JSON.stringify`; XML validates `DOMParser` parser errors, uses `XMLSerializer`, and indentation is derived from XML elements without changing text-node content.

- [ ] **Step 4: Run the formatter tests**

Run: `npm.cmd test -- formatters.test.ts`

Expected: PASS.

### Task 3: Implement and test tree data and edit operations

**Files:**
- Create: `src/lib/tree.ts`
- Create: `src/lib/tree.test.ts`

- [ ] **Step 1: Write failing tree tests**

```ts
const document = parseDocument('json', '{"customer":{"name":"Ada"}}');
expect(renameJsonKey(document, ['customer', 'name'], 'fullName')).toEqual({ customer: { fullName: 'Ada' } });
expect(setJsonPrimitive(document, ['customer', 'name'], 'Grace')).toEqual({ customer: { name: 'Grace' } });
```

- [ ] **Step 2: Run the targeted test and verify it fails because the module is missing**

Run: `npm.cmd test -- tree.test.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the minimum mutation helpers**

Implement JSON object-key rename and primitive-value replacement. Implement XML element-name, attribute-name/value, and text-node replacement through DOM node references. Reject duplicate JSON keys and invalid XML names before mutating.

- [ ] **Step 4: Run all unit tests**

Run: `npm.cmd test -- --run`

Expected: PASS.

### Task 4: Build the FormatX interface

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/components/EditorPane.tsx`
- Create: `src/components/TreePane.tsx`
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/StatusBar.tsx`

- [ ] **Step 1: Write failing interaction tests**

```ts
render(<App />);
await user.click(screen.getByRole('button', { name: '格式化' }));
expect(screen.getByRole('textbox', { name: '内容编辑器' })).toHaveValue(expect.stringContaining('\n'));
```

- [ ] **Step 2: Run the interaction test and verify it fails because controls are absent**

Run: `npm.cmd test -- App.test.tsx`

Expected: FAIL with missing accessible button or editor.

- [ ] **Step 3: Implement the one-document interface**

Include FormatX branding; JSON/XML switcher; format, minify, copy, clear, find previous/next and theme controls. Make the left `textarea` the only text source. Render a compact editable tree on the right, with `▶`/`▼`; expand only the root initially. Apply tree edits back to the editor through the Task 3 utilities. Implement search highlights and automatically open matching tree ancestors. Parse failures retain the last valid tree and report location in the status bar.

- [ ] **Step 4: Implement theme preference**

Use a three-value setting: `system`, `light`, `dark`. Default to `system`, subscribe to `prefers-color-scheme`, and store only the explicit theme preference in `localStorage`.

- [ ] **Step 5: Run all frontend tests and type-check**

Run: `npm.cmd test -- --run` and `npm.cmd run check`

Expected: both PASS.

### Task 5: Verify visual behavior and build Windows artifacts

**Files:**
- Create: `docs/screenshots/formatx-dark.png`
- Create: `docs/screenshots/formatx-light.png`

- [ ] **Step 1: Start the development renderer and inspect it at desktop width**

Run: `npm.cmd run dev -- --host 127.0.0.1`

Expected: Vite serves the renderer locally.

- [ ] **Step 2: Capture dark and light screenshots**

Use representative JSON containing nested objects, arrays, and search matches. Capture the default dark/system appearance and explicit light appearance after checking toolbar labels, focus states, tree editing, and responsive split panes.

- [ ] **Step 3: Build the release artifacts**

Run: `npm.cmd run tauri build`

Expected: Tauri produces the Windows installer/bundle under `src-tauri/target/release/bundle/`.

### Task 6: Write project documentation and publish

**Files:**
- Create: `README.md`
- Create: `.github/workflows/release.yml`
- Modify: `.gitignore`

- [ ] **Step 1: Write the README**

Document the FormatX purpose, JSON/XML scope, offline/privacy policy, screenshot embeds, local prerequisites, development commands, test command, Windows build command, and release download location.

- [ ] **Step 2: Add a tag-triggered GitHub Actions release build**

Build on `v*` tags using Windows, run frontend tests, and attach Tauri bundle artifacts to the GitHub release. Do not add credentials beyond GitHub's built-in token.

- [ ] **Step 3: Run final verification**

Run: `npm.cmd test -- --run`, `npm.cmd run check`, `npm.cmd run build`, and `npm.cmd run tauri build`.

Expected: all exit 0.

- [ ] **Step 4: Commit, push and create the first release**

Commit all generated source, docs and screenshots to `codex/formatx-mvp`, push to `origin`, open a release/tag `v0.1.0`, and upload the verified Windows artifacts. Use `https://github.com/lingfenglxz/FormatX/releases`, not the Gomoku repository.
