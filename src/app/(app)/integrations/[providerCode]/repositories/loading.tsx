import { Card, Skeleton } from "@/components/ui";

/**
 * Fallback for the repository list.
 *
 * Exists to override `../loading.tsx`, which stands in for the provider detail
 * page — a scope list and two capability columns. Without this file that
 * skeleton would appear here and the layout would jump when a list of
 * repository cards arrived instead.
 *
 * The shape mirrors the real page: back link, heading, the search-and-switcher
 * row, then cards. Matching it is the point of a skeleton; a generic spinner
 * would reserve no space and produce the same jump.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-8">
      <span className="sr-only">Loading repositories</span>

      <div>
        <Skeleton className="h-3.5 w-28 rounded-full" />
        <Skeleton className="mt-4 h-9 w-48" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} padding="md">
            <div className="flex items-start gap-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-56" />
                <Skeleton className="mt-3.5 h-3 w-full max-w-md" />
                <div className="mt-4 flex gap-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
