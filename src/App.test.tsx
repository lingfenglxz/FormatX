import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import App from './App';

it('formats the editor content in place', async () => {
  render(<App />);
  const editor = screen.getByRole('textbox', { name: '内容编辑器' });
  fireEvent.change(editor, { target: { value: '{"a":[1,2]}' } });
  await userEvent.click(screen.getByRole('button', { name: '格式化' }));
  expect((editor as HTMLTextAreaElement).value).toContain('\n');
});
