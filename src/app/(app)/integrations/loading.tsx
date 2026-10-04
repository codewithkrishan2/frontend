import { Card, Skeleton } from "@/components/ui";

/**
 * Shown while the hub's two backend reads are in flight.
 *
 * Mirrors the real layout — header, stat strip, connection rows, provider grid —
 * so the page does not jump when it arrives. The whole thing is `aria-hidden`
 * behind one live-region announcement rather than narrating every block.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-10">
      <span className="sr-only">Loading integrations</span>

      <div>
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <Card padding="lg">
        <div className="grid gap-6 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="mt-2.5 h-8 w-12" />
            </div>
          ))}
        </div>
      </Card>

      <div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />

        <div className="mt-5 flex flex-col gap-4">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index} padding="lg">
              <div className="flex items-start gap-4">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3.5 w-56" />
                </div>
              </div>
              <Skeleton className="mt-6 h-px w-full rounded-none" />
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                {Array.from({ length: 3 }, (_, cell) => (
                  <div key={cell}>
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="mt-2 h-4 w-28" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="h-5 w-48" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index} padding="lg">
              <Skeleton className="size-14 rounded-xl" />
              <Skeleton className="mt-5 h-4 w-32" />
              <Skeleton className="mt-2.5 h-3.5 w-full" />
              <Skeleton className="mt-6 h-8 w-28" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
