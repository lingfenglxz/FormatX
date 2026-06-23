import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('indents node children from the field label after the chevron', () => {
  const css = readFileSync('src/styles.css', 'utf8');
  expect(css).toContain('.node-body{padding-left:calc(2ch + 12px)');
});

it('keeps a node field label aligned with a primitive field label', () => {
  const css = readFileSync('src/styles.css', 'utf8');
  expect(css).toContain('.node-head.has-label .chevron{margin-left:-12px');
  expect(css).toContain('.node-head.has-label{padding-left:0;gap:0}');
});
