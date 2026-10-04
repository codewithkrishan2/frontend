import { Badge, Card, EmptyState } from "@/components/ui";
import type { PullRequestFileResponse } from "@/lib/api/types";
import { fileChange } from "@/lib/repositories/presentation";

type ChangedFilesListProps = {
  files: readonly PullRequestFileResponse[];
};

/**
 * The files a pull request changes.
 *
 * Optimised for scanning paths, which is what this list is actually for. Three
 * choices follow from that:
 *
 * **A one-letter status marker, not a full badge.** A badge on every row would
 * push the paths — the thing being read — to the right by a fixed width. The
 * letter carries a `title` and an accessible label, so the meaning is available
 * without the letter having to be self-explanatory.
 *
 * **The directory is dimmed and the filename is not.** A list of
 * `src/main/java/com/example/…` paths is mostly shared prefix; de-emphasising it
 * lets the eye land on the part that differs between rows.
 *
 * **Line counts are right-aligned and tabular.** They are compared down the
 * column rather than read individually, so the digits need to line up.
 */
export function ChangedFilesList({ files }: ChangedFilesListProps) {
  if (files.length === 0) {
    return (
      <Card padding="none" tone="flat">
        <EmptyState
          title="No file changes reported"
          description="The provider returned no changed files for this pull request. An empty pull request, or one whose changes have already been merged away, will look like this."
        />
      </Card>
    );
  }

  return (
    <Card padding="none" tone="flat">
      <ul className="divide-y divide-border">
        {files.map((file) => {
          const change = fileChange(file.status);
          const split = splitPath(file.path);

          return (
            <li
              key={`${file.status}:${file.path}`}
              className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
            >
              <span
                title={change.label}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded font-mono text-[0.6875rem] font-semibold"
                data-status={file.status}
              >
                <Badge tone={change.tone} size="sm" className="px-1.5 py-0">
                  <span aria-hidden>{change.marker}</span>
                  <span className="sr-only">{change.label}</span>
                </Badge>
              </span>

              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {split.directory ? (
                  <span className="text-subtle-foreground">
                    {split.directory}
                  </span>
                ) : null}
                <span className="text-ink-100">{split.filename}</span>
              </span>

              {/* A rename's old path is shown rather than implied, so a reader
                  can tell a move from a delete-plus-add. */}
              {file.previousPath ? (
                <span className="hidden shrink-0 font-mono text-[0.6875rem] text-subtle-foreground sm:inline">
                  was {file.previousPath}
                </span>
              ) : null}

              <span className="shrink-0 font-mono text-xs tabular-nums">
                {file.additions !== undefined ? (
                  <span className="text-signal-pass">+{file.additions}</span>
                ) : null}{" "}
                {file.deletions !== undefined ? (
                  <span className="text-signal-fail">−{file.deletions}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/**
 * Splits a path into its directory prefix and filename.
 *
 * The directory keeps its trailing slash so the two parts concatenate back to
 * the original — rendering them as separate spans must not change the text.
 */
function splitPath(path: string): { directory: string; filename: string } {
  const separator = path.lastIndexOf("/");
  if (separator < 0) return { directory: "", filename: path };

  return {
    directory: path.slice(0, separator + 1),
    filename: path.slice(separator + 1),
  };
}

export type { ChangedFilesListProps };
