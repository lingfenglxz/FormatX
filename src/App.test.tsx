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

it('keeps pasted JSON free of syntax token markup', () => {
  render(<App />);
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '{"customerOrder":{"custId":1}}' } });
  expect(textarea.value).toBe('{"customerOrder":{"custId":1}}');
  expect(document.querySelector('.editor-mirror')!.textContent).not.toContain('tok-key');
});

it('places a child chevron before its key label', () => {
  render(<App />);
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '{"customerOrder":{"custId":1}}' } });
  const childHead = document.querySelectorAll('.node-head')[1];
  expect(childHead.firstElementChild?.classList.contains('chevron')).toBe(true);
  expect(childHead.querySelector('input')?.value).toBe('customerOrder');
});

it('shows inline counts for root and container nodes while expanded', () => {
  render(<App />);
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: '{"customerOrder":{"custId":1},"prodOrderItems":[1,2]}' } });
  const heads = document.querySelectorAll('.node-head');
  expect(heads[0].textContent).toContain('object {2}');
  expect((heads[1].querySelector('input') as HTMLInputElement).value).toBe('customerOrder');
  expect(heads[1].textContent).toContain(' {1}');
  expect((heads[2].querySelector('input') as HTMLInputElement).value).toBe('prodOrderItems');
  expect(heads[2].textContent).toContain(' [2]');
  expect(document.querySelector('.ellipsis')).toBeNull();
  expect(document.querySelector('.bracket')).toBeNull();
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
