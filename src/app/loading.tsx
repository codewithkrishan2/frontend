import { Container } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container width="wide" className="pt-32 pb-20">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center"
      >
        <span className="sr-only">Loading</span>

        <Skeleton className="h-6 w-56 rounded-full" />
        <Skeleton className="mt-7 h-12 w-full max-w-2xl" />
        <Skeleton className="mt-3 h-12 w-full max-w-xl" />
        <Skeleton className="mt-6 h-4 w-full max-w-lg" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />

        <div className="mt-9 flex gap-3">
          <Skeleton className="h-12 w-36" />
          <Skeleton className="h-12 w-40" />
        </div>

        <Skeleton className="mt-16 h-80 w-full rounded-2xl" />
      </div>
    </Container>
  );
}
