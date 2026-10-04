import { Button, Input } from "@/components/ui";
import { repositoryBrowseParams } from "@/lib/api/endpoints";

type RepositorySearchProps = {
  /** The page this form submits to. Must be the current path. */
  action: string;
  /** Current term, so the field keeps its value across navigations. */
  value: string | undefined;
  placeholder: string;
  label: string;
  /**
   * Parameters to carry across the submit, as hidden fields.
   *
   * A GET form replaces the whole query string, so anything not represented here
   * is dropped — which is right for `page` and wrong for `connection` and
   * `state`. Searching should return you to the first page of results, but it
   * must not silently switch which account you are looking at.
   */
  preserve?: Record<string, string | number | undefined>;
  /**
   * Where "Clear" goes.
   *
   * Supplied rather than derived from `action`, because clearing a search must
   * keep the account and state filter — only the term is being cleared.
   */
  clearHref: string;
};

/**
 * The search field for a repository or pull-request list.
 *
 * **A plain `<form method="get">`, with no client JavaScript.** Submitting
 * navigates to the same page with a new query string, which the Server Component
 * reads — so search works before hydration, survives a failed bundle, and leaves
 * a real URL that can be shared or reached with the back button. A debounced
 * client-side input would need a client component, an effect, and a router push
 * per keystroke, and would make every search a provider round trip while the
 * user is still typing.
 *
 * The cost is that results appear on submit rather than as you type. For a
 * filter whose backend cost is several provider API calls, that is the better
 * trade: it means one request per search the user actually meant.
 *
 * `page` is deliberately *not* preserved. A new search invalidates the old
 * position, and keeping page 4 would show an empty page and read as "no results".
 */
export function RepositorySearch({
  action,
  value,
  placeholder,
  label,
  preserve,
  clearHref,
}: RepositorySearchProps) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className="flex items-center gap-2"
    >
      {Object.entries(preserve ?? {}).map(([name, carried]) =>
        carried === undefined || carried === "" ? null : (
          <input
            key={name}
            type="hidden"
            name={name}
            value={String(carried)}
          />
        ),
      )}

      <Input
        type="search"
        name={repositoryBrowseParams.search}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        aria-label={label}
        className="max-w-xs"
        startAdornment={
          <svg
            viewBox="0 0 16 16"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="size-4"
          >
            <circle cx="7" cy="7" r="4.25" />
            <path d="M10.2 10.2 13.5 13.5" />
          </svg>
        }
      />

      <Button type="submit" variant="secondary" size="md">
        Search
      </Button>

      {/* A plain link back to the unfiltered list rather than a reset button:
          clearing the field and resubmitting is two actions, and an empty
          `search` would still be a submit the backend has to answer. */}
      {value ? (
        <a
          href={clearHref}
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-ink-100 hover:underline"
        >
          Clear
        </a>
      ) : null}
    </form>
  );
}

export type { RepositorySearchProps };
