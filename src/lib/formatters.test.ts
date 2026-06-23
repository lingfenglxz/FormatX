import { describe, expect, it } from 'vitest';
import { formatDocument, minifyDocument } from './formatters';

describe('formatters', () => {
  it('formats JSON using two-space indentation', () => {
    expect(formatDocument('json', '{"a":[1,2]}')).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
  });

  it('minifies JSON without changing its value', () => {
    expect(minifyDocument('json', '{\n  "a": 1\n}')).toBe('{"a":1}');
  });

  it('reports invalid JSON', () => {
    expect(() => formatDocument('json', '{')).toThrow(/JSON/);
  });

  it('formats XML while retaining its element text', () => {
    expect(formatDocument('xml', '<root><a>1</a></root>')).toContain('<a>1</a>');
  });
});
