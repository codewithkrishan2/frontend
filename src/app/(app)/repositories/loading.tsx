import { Card, Skeleton } from "@/components/ui";

/**
 * Fallback for the account chooser.
 *
 * Short on purpose: this page makes one quick read and, for a user with a single
 * connection, immediately redirects. A tall skeleton would flash a layout that
 * is never rendered.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-8">
      <span className="sr-only">Loading your connected accounts</span>

      <div>
        <Skeleton className="h-3.5 w-28 rounded-full" />
        <Skeleton className="mt-4 h-9 w-48" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} padding="md">
            <div className="flex items-center gap-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-3 w-56" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
