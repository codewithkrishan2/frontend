import type { Metadata } from "next";
import Link from "next/link";

import { CodeField } from "@/components/backdrop/code-field";
import { SpotlightSection } from "@/components/backdrop/spotlight-section";
import { Logo } from "@/components/brand/logo";
import { OAuthSignInOptions } from "@/components/auth/oauth-sign-in";
import { appRoutes } from "@/lib/api/endpoints";
import { Card, Container, Separator } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to CodeRev with your GitHub or Bitbucket account.",
  robots: { index: false, follow: false },
};

/**
 * Sign-in screen.
 *
 * OAuth is the only route in: the backend exposes no credential login endpoint,
 * so there is deliberately no email/password form here. The provider buttons are
 * rendered from the registry in `lib/api/endpoints`, so this page does not need
 * to change when a provider is added.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <SpotlightSection className="relative isolate flex flex-1 items-center overflow-hidden py-16">
        <CodeField />

        <Container width="narrow" className="relative">
          <div className="mx-auto flex max-w-sm flex-col items-center">
            <Link href={appRoutes.home} aria-label="CodeRev home">
              <Logo markClassName="size-9" />
            </Link>

            <h1 className="mt-10 text-display text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Sign in to CodeRev
            </h1>

            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
              Connect your code host to start reviewing your repositories.
            </p>

            <Card tone="glass" padding="lg" className="mt-9 w-full">
              <OAuthSignInOptions />

              <Separator soft className="my-6" />

              <p className="text-center text-xs leading-relaxed text-subtle-foreground">
                CodeRev requests read access to the repositories you choose. We
                never write to your code.
              </p>
            </Card>

            <p className="mt-8 text-center text-xs leading-relaxed text-ink-600">
              By continuing you agree to the CodeRev terms of service and
              privacy policy.
            </p>
          </div>
        </Container>
      </SpotlightSection>
    </main>
  );
}
