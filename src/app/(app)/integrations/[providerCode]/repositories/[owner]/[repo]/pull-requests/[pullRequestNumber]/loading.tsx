import { Card, Skeleton } from "@/components/ui";

/**
 * Fallback for the pull-request detail page.
 *
 * The deepest of the overriding skeletons, and the one that matters most: this
 * page issues three provider-backed reads in parallel, so it is the slowest in
 * the feature, and the fallback is on screen longest. Reserving the right shape
 * — detail panel, file list, diff — keeps the page from reflowing twice when the
 * content lands.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-8">
      <span className="sr-only">Loading pull request</span>

      <div>
        <Skeleton className="h-3.5 w-32 rounded-full" />
        <Skeleton className="mt-4 h-9 w-full max-w-md" />
        <Skeleton className="mt-3 h-3 w-40" />
      </div>

      <Card padding="lg">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-56" />
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3.5 w-44" />
        </div>

        <Card padding="none">
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
              >
                <Skeleton className="size-5 shrink-0 rounded" />
                <Skeleton className="h-3 flex-1 max-w-sm" />
                <Skeleton className="h-3 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="mt-2 h-3.5 w-64" />
        </div>

        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} padding="none">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <Skeleton className="h-3.5 w-full max-w-md" />
            </div>
            <div className="flex flex-col gap-1.5 p-4 sm:p-5">
              {Array.from({ length: 6 }, (_, row) => (
                <Skeleton key={row} className="h-3 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
