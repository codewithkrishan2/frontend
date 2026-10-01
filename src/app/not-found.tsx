import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants, Container } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center py-20 text-center">
      <Link href="/" aria-label="CodeRev home">
        <Logo />
      </Link>

      <p className="mt-12 font-mono text-xs tracking-[0.2em] text-subtle-foreground uppercase">
        404
      </p>

      <h1 className="mt-4 text-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Page not found
      </h1>

      <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
        That route does not exist. It may have moved, or it was never here.
      </p>

      <Link
        href="/"
        className={cn(buttonVariants({ size: "lg" }), "mt-9 px-7")}
      >
        Back to home
      </Link>
    </Container>
  );
}
