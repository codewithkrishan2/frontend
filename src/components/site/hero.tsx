"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // gsap.context scopes selectors to this subtree and gives us a single
    // revert() for cleanup, which matters under React Strict Mode double-mount.
    const ctx = gsap.context(() => {
      gsap.from("[data-animate]", {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="border-b border-border py-20 sm:py-28">
      <Container>
        <p
          data-animate
          className="text-sm font-medium text-brand-600 dark:text-brand-400"
        >
          Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript 7
        </p>

        <h1
          data-animate
          className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
        >
          {siteConfig.name} frontend
        </h1>

        <p
          data-animate
          className="mt-5 max-w-2xl text-lg text-pretty text-muted-foreground"
        >
          The project skeleton is in place: routing, styling, linting,
          formatting and shared UI primitives. API integration with the Spring
          Boot backend comes next.
        </p>

        <div data-animate className="mt-8 flex flex-wrap gap-3">
          <Link href="#next-steps" className={buttonVariants({ size: "lg" })}>
            See next steps
          </Link>
          <Link
            href="#stack"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            What is included
          </Link>
        </div>
      </Container>
    </section>
  );
}
