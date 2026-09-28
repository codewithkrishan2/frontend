import { FadeIn } from "@/components/motion/fade-in";
import { Hero } from "@/components/site/hero";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const stack = [
  {
    title: "Next.js 16 · App Router",
    description:
      "Server Components by default, file-based routing under src/app, Turbopack in development.",
  },
  {
    title: "TypeScript 7",
    description:
      "The native Go compiler. Strict mode on, plus noUncheckedIndexedAccess and unused-symbol checks.",
  },
  {
    title: "Tailwind CSS 4",
    description:
      "CSS-first configuration. Design tokens live in @theme inside src/app/globals.css.",
  },
  {
    title: "cva · clsx · tailwind-merge",
    description:
      "Variant-driven components with the cn() helper resolving conflicting utilities.",
  },
  {
    title: "Motion · GSAP",
    description:
      "Declarative transitions via motion/react, timeline work via GSAP. Both respect reduced-motion.",
  },
  {
    title: "ESLint · Prettier",
    description:
      "Flat config extending next/core-web-vitals, with automatic Tailwind class sorting.",
  },
];

const structure = [
  ["src/app", "Routes, layouts and global styles"],
  ["src/components/ui", "Unstyled-ish primitives: Button, Card, Container"],
  ["src/components/site", "Page composition: header, footer, hero"],
  ["src/components/motion", "Reusable animation wrappers"],
  ["src/lib", "Helpers, env access and site config"],
  ["public", "Static assets served from the root"],
] as const;

const nextSteps = [
  "Copy .env.example to .env.local and point API_PROXY_ORIGIN at the Spring Boot server.",
  "Add src/lib/api for the typed fetch client and shared response envelope.",
  "Mirror the backend DTOs as TypeScript types, then build the auth routes.",
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <section id="stack" className="scroll-mt-20 py-16">
        <Container>
          <FadeIn>
            <h2 className="text-2xl font-semibold tracking-tight">Stack</h2>
            <p className="mt-2 text-muted-foreground">
              Everything below is installed and verified against a production
              build.
            </p>
          </FadeIn>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stack.map((item, index) => (
              <li key={item.title} className="list-none">
                <FadeIn delay={index * 0.05} className="h-full">
                  <Card className="h-full">
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </Card>
                </FadeIn>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section
        id="structure"
        className="scroll-mt-20 border-y border-border py-16"
      >
        <Container>
          <FadeIn>
            <h2 className="text-2xl font-semibold tracking-tight">Structure</h2>

            <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {structure.map(([path, description]) => (
                <div key={path}>
                  <dt className="font-mono text-sm font-medium">{path}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </FadeIn>
        </Container>
      </section>

      <section id="next-steps" className="scroll-mt-20 py-16">
        <Container>
          <FadeIn>
            <h2 className="text-2xl font-semibold tracking-tight">
              Next steps
            </h2>

            <ol className="mt-6 space-y-3">
              {nextSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </FadeIn>
        </Container>
      </section>
    </>
  );
}
