import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-20">
      <div role="status" aria-live="polite" className="animate-pulse space-y-4">
        <span className="sr-only">Loading</span>
        <div className="h-8 w-1/3 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
      </div>
    </Container>
  );
}
