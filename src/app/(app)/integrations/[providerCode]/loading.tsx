import { Card, Skeleton } from "@/components/ui";

/**
 * Fallback for the provider detail route.
 *
 * Exists to *override* the one at `../loading.tsx`. A `loading.tsx` applies to
 * its segment and everything nested beneath it, so without this file the hub's
 * skeleton — a stat strip and a provider grid — would stand in for a page that
 * is actually a scope list and two capability columns, and the layout would jump
 * when the real content arrived.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-10">
      <span className="sr-only">Loading provider</span>

      <div>
        <Skeleton className="h-3.5 w-28 rounded-full" />
        <Skeleton className="mt-4 h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      </div>

      <Card padding="lg">
        <div className="flex items-center gap-5">
          <Skeleton className="size-14 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="mt-2.5 h-3 w-48" />
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-2.5 h-4 w-full max-w-xl" />

        <div className="mt-8 flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex items-start gap-3">
              <Skeleton className="size-4 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="mt-2 h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} padding="lg">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-2.5 h-4 w-48" />
            <div className="mt-8 flex flex-col gap-3">
              {Array.from({ length: 6 }, (_, row) => (
                <Skeleton key={row} className="h-3.5 w-40" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
