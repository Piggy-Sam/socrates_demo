import { type ReactNode } from "react";

// A small, dependency-free markdown renderer for the recap letter. The recap
// is intentionally plain markdown (short paragraphs, light emphasis, the odd
// heading or list), so we handle just those — body set in Geist (readable, a
// letter not a feed), headings in Plex Mono, clean hairline-accented lists.
// Shared by the server page and the client button.

/** Inline emphasis: **bold**, *italic* / _italic_. Escaped, no raw HTML. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // tokenise on **...**, *...*, _..._
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-marble">
          {m[2]}
        </strong>,
      );
    } else {
      const italic = m[4] ?? m[6] ?? "";
      nodes.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic">
          {italic}
        </em>,
      );
    }
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Render plain markdown into the Geist recap body. */
export function renderRecap(markdown: string): ReactNode {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length === 0) return;
    const text = para.join(" ").trim();
    para = [];
    if (!text) return;
    blocks.push(
      <p key={`p-${key++}`} className="text-pretty leading-relaxed">
        {renderInline(text, `p${key}`)}
      </p>,
    );
  };

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    list = [];
    blocks.push(
      <ul
        key={`ul-${key++}`}
        className="ml-1 list-none space-y-2.5"
      >
        {items.map((item, idx) => (
          <li
            key={idx}
            className="text-pretty leading-relaxed before:mr-3 before:text-accent before:content-['—']"
          >
            {renderInline(item, `li${key}-${idx}`)}
          </li>
        ))}
      </ul>,
    );
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flushPara();
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushPara();
      flushList();
      blocks.push(
        <h3
          key={`h-${key++}`}
          className="font-mono-display text-base font-medium tracking-tight text-marble"
        >
          {renderInline(heading[2], `h${key}`)}
        </h3>,
      );
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      flushPara();
      list.push(bullet[1]);
      continue;
    }

    // accumulate into the current paragraph
    if (list.length > 0) flushList();
    para.push(trimmed);
  }
  flushPara();
  flushList();

  return (
    <div className="space-y-5 font-sans text-lg leading-relaxed text-marble">
      {blocks}
    </div>
  );
}
