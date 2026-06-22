// A tiny, dependency-free markdown renderer for daily/weekly summaries. We only
// support the restrained subset Socrates' summaries use — paragraphs, headings,
// bullet/numbered lists, **bold**, *italic*, and `code` — and we never render
// raw HTML. The body is set in Geist so the bank reads like a commonplace book,
// not a feed; headings and metadata carry the Plex Mono instrument register.

import { Fragment } from "react";

type Props = {
  content: string;
  className?: string;
};

// Inline emphasis: **bold**, *italic* / _italic_, `code`. Escaped first so no
// markup from the model can inject HTML.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|(?<!\w)[_*][^_*\n]+[_*](?!\w))/g);
  return tokens.filter(Boolean).map((tok, i) => {
    const key = `${keyBase}-${i}`;
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return (
        <strong key={key} className="font-medium text-marble">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded-sm bg-raised-2 px-1 py-0.5 font-mono text-[0.85em] text-accent"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (
      (tok.startsWith("*") && tok.endsWith("*")) ||
      (tok.startsWith("_") && tok.endsWith("_"))
    ) {
      return (
        <em key={key} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={key}>{tok}</Fragment>;
  });
}

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(
        list.ordered
          ? { kind: "ol", items: list.items }
          : { kind: "ul", items: list.items },
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ kind: "h", level: heading[1].length, text: heading[2] });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return blocks;
}

const HEADING_CLASS: Record<number, string> = {
  1: "font-display text-xl font-normal tracking-tight text-marble",
  2: "font-display text-lg font-normal tracking-tight text-marble",
  3: "label-mono",
  4: "label-mono",
};

/** Render restrained markdown in the Geist reading voice. */
export function SummaryMarkdown({ content, className = "" }: Props) {
  const blocks = parseBlocks(content);

  return (
    <div
      className={`space-y-3 font-sans text-[15px] leading-relaxed text-marble text-pretty ${className}`}
    >
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        if (b.kind === "h") {
          const cls = HEADING_CLASS[b.level] ?? HEADING_CLASS[2];
          return b.level >= 3 ? (
            <p key={key} className={`${cls} pt-1`}>
              {b.text}
            </p>
          ) : (
            <p key={key} className={`${cls} pt-1`}>
              {renderInline(b.text, key)}
            </p>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={key} className="list-disc space-y-1.5 pl-5 marker:text-accent">
              {b.items.map((it, j) => (
                <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol
              key={key}
              className="list-decimal space-y-1.5 pl-5 marker:font-mono marker:text-accent"
            >
              {b.items.map((it, j) => (
                <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={key} className="text-marble">
            {renderInline(b.text, key)}
          </p>
        );
      })}
    </div>
  );
}
