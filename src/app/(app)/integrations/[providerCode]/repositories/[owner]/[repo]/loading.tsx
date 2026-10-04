import { Card, Skeleton } from "@/components/ui";

/**
 * Fallback for the repository detail page.
 *
 * Overrides the repository-list skeleton above it, which would otherwise stand
 * in for a page that is actually a metadata panel followed by a pull-request
 * list. The two have very different heights, so without this the content would
 * jump when it arrived.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-8">
      <span className="sr-only">Loading repository</span>

      <div>
        <Skeleton className="h-3.5 w-36 rounded-full" />
        <Skeleton className="mt-4 h-9 w-56" />
        <Skeleton className="mt-3 h-3 w-40" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      </div>

      <Card padding="lg">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-5">
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3.5 w-64" />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <Skeleton className="h-11 w-72 rounded-lg" />
          <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
        </div>

        <Card padding="none">
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </div>
                <div className="mt-2.5 flex gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
