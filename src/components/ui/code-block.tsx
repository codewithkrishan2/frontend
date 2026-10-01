import { cn } from "@/lib/utils";

/**
 * A single styled token. Keeping tokens as data rather than parsing source
 * means no syntax-highlighting dependency ships to the browser.
 */
export type CodeToken = {
  text: string;
  kind?:
    | "keyword"
    | "string"
    | "number"
    | "comment"
    | "function"
    | "type"
    | "punctuation"
    | "plain";
};

export type CodeLine = {
  tokens: readonly CodeToken[];
  /** Diff gutter state. */
  change?: "add" | "remove";
  /** Draws attention to a line, e.g. the one an AI comment refers to. */
  highlight?: boolean;
};

const tokenClasses: Record<NonNullable<CodeToken["kind"]>, string> = {
  keyword: "text-brand-300",
  string: "text-signal-pass",
  number: "text-signal-warn",
  comment: "text-ink-500 italic",
  function: "text-accent-300",
  type: "text-accent-400",
  punctuation: "text-ink-400",
  plain: "text-ink-200",
};

type CodeBlockProps = {
  lines: readonly CodeLine[];
  /** Filename shown in the header. Omit to hide the header. */
  filename?: string;
  language?: string;
  showLineNumbers?: boolean;
  /** Line number the listing starts at. */
  startLine?: number;
  className?: string;
};

export function CodeBlock({
  lines,
  filename,
  language,
  showLineNumbers = true,
  startLine = 1,
  className,
}: CodeBlockProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-ink-950/80",
        className,
      )}
    >
      {filename ? (
        <div className="flex items-center gap-2 border-b border-border bg-ink-900/60 px-3 py-2">
          <FileGlyph />
          <span className="font-mono text-xs text-ink-300">{filename}</span>
          {language ? (
            <span className="ml-auto font-mono text-[0.6875rem] tracking-wide text-subtle-foreground uppercase">
              {language}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="no-scrollbar overflow-x-auto">
        <pre className="py-3 font-mono text-[0.8125rem] leading-6">
          <code>
            {lines.map((line, index) => (
              <span
                key={index}
                className={cn(
                  "grid grid-cols-[auto_1fr] items-start",
                  line.highlight && "bg-brand-500/8",
                  line.change === "add" && "bg-signal-pass/8",
                  line.change === "remove" && "bg-signal-fail/8",
                )}
              >
                {showLineNumbers ? (
                  <span
                    className="w-12 shrink-0 pr-3 text-right text-ink-600 select-none"
                    aria-hidden
                  >
                    {startLine + index}
                  </span>
                ) : (
                  <span />
                )}

                <span className="pr-4 whitespace-pre">
                  {line.change ? (
                    <span
                      className={cn(
                        "mr-1 inline-block w-2 select-none",
                        line.change === "add"
                          ? "text-signal-pass"
                          : "text-signal-fail",
                      )}
                      aria-hidden
                    >
                      {line.change === "add" ? "+" : "-"}
                    </span>
                  ) : null}

                  {line.tokens.map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      className={tokenClasses[token.kind ?? "plain"]}
                    >
                      {token.text}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 text-ink-500">
      <path
        d="M9 1.5H4.5A1 1 0 0 0 3.5 2.5v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5L9 1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M9 1.5V5h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export type { CodeBlockProps };
