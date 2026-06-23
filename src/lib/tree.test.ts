import { describe, expect, it } from 'vitest';
import { renameJsonKey, setJsonPrimitive } from './tree';

describe('JSON tree edits', () => {
  it('renames a nested key', () => {
    expect(renameJsonKey({ customer: { name: 'Ada' } }, ['customer', 'name'], 'fullName')).toEqual({ customer: { fullName: 'Ada' } });
  });

  it('replaces a primitive value', () => {
    expect(setJsonPrimitive({ customer: { name: 'Ada' } }, ['customer', 'name'], 'Grace')).toEqual({ customer: { name: 'Grace' } });
  });
});
