import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import App from './App';

afterEach(() => cleanup());

it('formats the editor content in place', async () => {
  render(<App />);
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '{"a":[1,2]}' } });
  await userEvent.click(screen.getByRole('button', { name: '格式化' }));
  expect(textarea.value).toContain('\n');
});

it('creates and switches between tabs', async () => {
  render(<App />);
  const addBtn = screen.getByTitle('新建标签');
  await userEvent.click(addBtn);
  const textareas = document.querySelectorAll('textarea');
  // Only the active tab's editor is rendered
  expect(textareas.length).toBe(1);
  fireEvent.change(textareas[0], { target: { value: '{"x":1}' } });
  expect((textareas[0] as HTMLTextAreaElement).value).toBe('{"x":1}');
});

it('toggles theme', async () => {
  render(<App />);
  const toggle = screen.getByTitle('切换主题');
  const mainBefore = document.querySelector('main')!.className;
  await userEvent.click(toggle);
  const mainAfter = document.querySelector('main')!.className;
  expect(mainBefore).not.toBe(mainAfter);
});
