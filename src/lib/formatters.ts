export type DocumentKind = 'json' | 'xml';

export function parseDocument(kind: DocumentKind, text: string): unknown {
  if (kind === 'json') {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`JSON 解析失败: ${error instanceof Error ? error.message : '无效内容'}`);
    }
  }

  const document = new DOMParser().parseFromString(text, 'application/xml');
  if (document.documentElement.localName === 'parsererror' || document.querySelector('parsererror')) {
    throw new Error('XML 解析失败: 请检查标签是否闭合。');
  }
  return document;
}

export function serializeDocument(kind: DocumentKind, parsed: unknown): string {
  return kind === 'json'
    ? JSON.stringify(parsed)
    : new XMLSerializer().serializeToString(parsed as Document);
}

export function formatDocument(kind: DocumentKind, text: string): string {
  const parsed = parseDocument(kind, text);
  if (kind === 'json') {
    return JSON.stringify(parsed, null, 2);
  }

  return prettyXml(new XMLSerializer().serializeToString(parsed as Document));
}

export function minifyDocument(kind: DocumentKind, text: string): string {
  const parsed = parseDocument(kind, text);
  if (kind === 'json') {
    return JSON.stringify(parsed);
  }

  stripInterElementWhitespace((parsed as Document).documentElement);
  return new XMLSerializer().serializeToString(parsed as Document);
}

function prettyXml(xml: string): string {
  const compact = xml.replace(/>\s+</g, '><');
  const lines = compact.replace(/(>)(<)(\/?)/g, '$1\n$2$3').split('\n');
  let depth = 0;

  return lines.map((line) => {
    if (line.startsWith('</')) depth -= 1;
    const formatted = `${'  '.repeat(Math.max(depth, 0))}${line}`;
    if (/^<[^!?/][^>]*[^/]>$/.test(line) && !line.includes('</')) depth += 1;
    return formatted;
  }).join('\n');
}

function stripInterElementWhitespace(element: Element): void {
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) {
      child.remove();
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      stripInterElementWhitespace(child as Element);
    }
  }
}
