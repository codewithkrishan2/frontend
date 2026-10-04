import { Alert, Badge, Card, EmptyState } from "@/components/ui";
import type {
  DiffFile,
  DiffHunk,
  DiffLine,
  PullRequestDiffResponse,
} from "@/lib/api/types";
import { fileChange } from "@/lib/repositories/presentation";
import { cn } from "@/lib/utils";

type DiffViewerProps = {
  diff: PullRequestDiffResponse;
};

/**
 * How many files are expanded on arrival.
 *
 * Small enough that a typical pull request opens fully readable, low enough that
 * a 300-file dependency bump does not ship 300 expanded tables to the browser.
 * The rest are collapsed `<details>`, so opening one costs nothing but a click
 * and no JavaScript.
 */
const EXPANDED_FILE_LIMIT = 5;

/**
 * A readable diff: file, then added, removed and context lines.
 *
 * Deliberately **not** a code-review editor. No syntax highlighting, no inline
 * commenting, no side-by-side toggle, no expanding of unchanged regions. The
 * purpose is for a reader to understand what changed, and every one of those
 * features would be scaffolding for a review feature that does not exist yet and
 * whose shape is not yet known.
 *
 * The parse is already done — the backend returns files, hunks and lines with
 * both sets of line numbers resolved — so this component is a map over arrays.
 * That is why it needs no client JavaScript and why the line numbering is
 * trustworthy: it is computed once, server-side, under test.
 *
 * **Colour is never the only signal.** Each line carries its `+`, `-` or space
 * in a gutter column, so the diff is readable in monochrome, by anyone who
 * cannot distinguish the tints, and when pasted as plain text.
 */
export function DiffViewer({ diff }: DiffViewerProps) {
  if (diff.files.length === 0) {
    return (
      <Card padding="none" tone="flat">
        <EmptyState
          title="No diff to show"
          description="The provider returned an empty diff for this pull request."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Truncation is announced rather than hidden: a viewer showing 40 of 900
          changed files without saying so would read as a small pull request. */}
      {diff.truncated ? (
        <Alert tone="warn" title="This diff was shortened">
          It exceeded the size this app will render, so some files are missing or
          are shown without their changes. Open the pull request at the provider
          to see all of it.
        </Alert>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {diff.totalFiles} {diff.totalFiles === 1 ? "file" : "files"} changed
        <span aria-hidden> · </span>
        <span className="font-mono text-signal-pass">
          +{diff.totalAdditions}
        </span>{" "}
        <span className="font-mono text-signal-fail">
          −{diff.totalDeletions}
        </span>
      </p>

      {diff.files.map((file, index) => (
        <DiffFileCard
          key={`${file.path}:${index}`}
          file={file}
          defaultOpen={index < EXPANDED_FILE_LIMIT}
        />
      ))}
    </div>
  );
}

function DiffFileCard({
  file,
  defaultOpen,
}: {
  file: DiffFile;
  defaultOpen: boolean;
}) {
  const change = fileChange(file.status);

  return (
    <Card padding="none" tone="flat" className="overflow-hidden">
      {/* <details> rather than client-side collapse state: it is the one
          interactive affordance here that the platform already provides, and it
          works before hydration. */}
      <details open={defaultOpen}>
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 transition-colors hover:bg-white/3 sm:px-5">
          <Badge tone={change.tone} size="sm">
            {change.label}
          </Badge>

          <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-100">
            {file.path}
          </span>

          {file.previousPath ? (
            <span className="shrink-0 font-mono text-[0.6875rem] text-subtle-foreground">
              was {file.previousPath}
            </span>
          ) : null}

          <span className="shrink-0 font-mono text-xs tabular-nums">
            <span className="text-signal-pass">+{file.additions}</span>{" "}
            <span className="text-signal-fail">−{file.deletions}</span>
          </span>
        </summary>

        {/* Binary and truncated both mean "no hunks", for different reasons, and
            a reader must be able to tell them apart: one will never have a
            textual diff, the other has one we chose not to render. */}
        {file.binary ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-5">
            Binary file — there is no text diff to show.
          </p>
        ) : file.truncated ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-5">
            This file&rsquo;s changes were too large to render here.
          </p>
        ) : file.hunks.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-5">
            No line changes reported for this file.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <caption className="sr-only">Changes to {file.path}</caption>

              <thead className="sr-only">
                <tr>
                  <th scope="col">Line in old file</th>
                  <th scope="col">Line in new file</th>
                  <th scope="col">Change</th>
                  <th scope="col">Content</th>
                </tr>
              </thead>

              {/* One tbody per hunk, which is what gives each its own header row
                  and keeps the gap between hunks visible. Flattening them would
                  lose the skipped, unchanged region between two changes. */}
              {file.hunks.map((hunk, index) => (
                <HunkBody key={`${hunk.header}:${index}`} hunk={hunk} />
              ))}
            </table>
          </div>
        )}
      </details>
    </Card>
  );
}

function HunkBody({ hunk }: { hunk: DiffHunk }) {
  return (
    <tbody>
      <tr>
        <td
          colSpan={4}
          className="border-y border-border bg-ink-900/60 px-3 py-1 text-[0.6875rem] text-subtle-foreground"
        >
          {hunk.header}
        </td>
      </tr>

      {hunk.lines.map((line, index) => (
        <DiffLineRow key={index} line={line} />
      ))}
    </tbody>
  );
}

const lineStyles = {
  ADDED: {
    row: "bg-signal-pass/8",
    gutter: "bg-signal-pass/12 text-signal-pass",
    marker: "+",
  },
  REMOVED: {
    row: "bg-signal-fail/8",
    gutter: "bg-signal-fail/12 text-signal-fail",
    marker: "−",
  },
  CONTEXT: {
    row: "",
    gutter: "text-subtle-foreground",
    marker: " ",
  },
} as const;

function DiffLineRow({ line }: { line: DiffLine }) {
  const style = lineStyles[line.type];

  return (
    <tr className={style.row}>
      {/* Line numbers are select-none so dragging across a diff copies the code
          and not the gutter, which is the single most common thing anyone does
          with a diff. */}
      <td className="w-px select-none border-r border-border px-2 text-right align-top tabular-nums text-subtle-foreground">
        {line.oldLineNumber ?? ""}
      </td>
      <td className="w-px select-none border-r border-border px-2 text-right align-top tabular-nums text-subtle-foreground">
        {line.newLineNumber ?? ""}
      </td>

      {/* The marker column is what makes this readable without colour. It is
          real text rather than a background, so it survives being pasted. */}
      <td
        className={cn(
          "w-px select-none px-1.5 text-center align-top",
          style.gutter,
        )}
      >
        {style.marker}
      </td>

      <td className="w-full px-3 align-top whitespace-pre text-ink-100">
        {line.content === "" ? "\u00A0" : line.content}
      </td>
    </tr>
  );
}

export type { DiffViewerProps };
