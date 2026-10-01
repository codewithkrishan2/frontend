"use client";

import { useEffect } from "react";

import { Button, Container } from "@/components/ui";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Swap for a real reporter (Sentry, etc.) when one is wired up.
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-signal-fail uppercase">
        Error
      </p>

      <h1 className="mt-4 text-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Something went wrong
      </h1>

      <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
        An unexpected error occurred while rendering this page.
      </p>

      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-subtle-foreground">
          Digest: {error.digest}
        </p>
      ) : null}

      <Button size="lg" className="mt-9 px-7" onClick={reset}>
        Try again
      </Button>
    </Container>
  );
}
