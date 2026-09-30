import type { ReactNode } from 'react';

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={`${key}-${i++}`}>{tok.slice(2, -2)}</strong>);
    else out.push(<code key={`${key}-${i++}`}>{tok.slice(1, -1)}</code>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Mini-markdown: **vet**, `code`, regels met '- ' als lijst, lege regel als alinea. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let para: string[] = [];
  let list: string[] = [];
  let k = 0;
  const flush = () => {
    if (para.length) {
      blocks.push(<p key={k++}>{inline(para.join(' '), `p${k}`)}</p>);
      para = [];
    }
    if (list.length) {
      blocks.push(
        <ul key={k++}>
          {list.map((l, i) => (
            <li key={i}>{inline(l, `l${k}-${i}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const line of lines) {
    if (line.trim() === '') {
      flush();
    } else if (line.startsWith('- ')) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return <div className="md">{blocks}</div>;
}
