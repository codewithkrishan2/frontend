import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { appRoutes, oauthCallbackParams } from "@/lib/api/endpoints";
import { Alert, buttonVariants, Container } from "@/components/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sign-in failed",
  robots: { index: false, follow: false },
};

/**
 * Shown when the backend redirects to `/oauth-error?message=...`.
 *
 * The message comes from `OAuthRedirectFactory.error`, so it is server-authored
 * rather than user-supplied, and it already names the provider where that is
 * relevant. It is still rendered as text only — never as markup — because it
 * arrives through the query string.
 */
export default async function OAuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params[oauthCallbackParams.message];
  const message = typeof raw === "string" ? raw : undefined;

  return (
    <main className="flex min-h-dvh flex-col">
      <Container className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <Link href={appRoutes.home} aria-label="CodeRev home">
          <Logo />
        </Link>

        <p className="mt-12 font-mono text-xs tracking-[0.2em] text-signal-fail uppercase">
          Sign-in failed
        </p>

        <h1 className="mt-4 text-display text-3xl font-semibold tracking-tight sm:text-4xl">
          We could not sign you in
        </h1>

        <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
          The sign-in attempt did not complete. You can try again, or head back
          to the home page.
        </p>

        {message ? (
          <Alert tone="fail" className="mt-8 max-w-md text-left">
            {message}
          </Alert>
        ) : null}

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href={appRoutes.login}
            className={cn(buttonVariants({ size: "lg" }), "px-7")}
          >
            Try again
          </Link>
          <Link
            href={appRoutes.home}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "px-7",
            )}
          >
            Back to home
          </Link>
        </div>
      </Container>
    </main>
  );
}
