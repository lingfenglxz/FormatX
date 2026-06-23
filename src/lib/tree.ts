type JsonRecord = Record<string, unknown>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parentAt(document: unknown, path: string[]): JsonRecord {
  return path.slice(0, -1).reduce<unknown>((node, key) => (node as JsonRecord)[key], document) as JsonRecord;
}

export function renameJsonKey(document: unknown, path: string[], nextKey: string): unknown {
  if (!nextKey.trim()) throw new Error('字段名不能为空。');
  const next = clone(document);
  const parent = parentAt(next, path);
  const previousKey = path.at(-1)!;
  if (nextKey !== previousKey && nextKey in parent) throw new Error('字段名已存在。');
  parent[nextKey] = parent[previousKey];
  delete parent[previousKey];
  return next;
}

export function setJsonPrimitive(document: unknown, path: string[], value: unknown): unknown {
  const next = clone(document);
  parentAt(next, path)[path.at(-1)!] = value;
  return next;
}
