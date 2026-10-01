import { SectionHeading } from "@/components/marketing/section-heading";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Badge, Container } from "@/components/ui";
import { CodeBlock, type CodeLine } from "@/components/ui/code-block";

const terminalLines: readonly CodeLine[] = [
  {
    tokens: [
      { text: "$ ", kind: "comment" },
      { text: "coderev", kind: "function" },
      { text: " review --pr ", kind: "plain" },
      { text: "2481", kind: "number" },
    ],
  },
  { tokens: [{ text: "", kind: "plain" }] },
  {
    tokens: [
      { text: "→ indexing ", kind: "punctuation" },
      { text: "api-gateway", kind: "string" },
      { text: " (1,284 files)", kind: "plain" },
    ],
  },
  {
    tokens: [
      { text: "→ resolving call graph", kind: "punctuation" },
      { text: " ✓", kind: "string" },
    ],
  },
  {
    tokens: [
      { text: "→ analyzing diff", kind: "punctuation" },
      { text: " ✓", kind: "string" },
    ],
  },
  { tokens: [{ text: "", kind: "plain" }] },
  {
    tokens: [
      { text: "  critical ", kind: "keyword" },
      { text: "src/auth/session.ts:43", kind: "plain" },
    ],
  },
  {
    tokens: [{ text: "    signature verification skipped", kind: "comment" }],
  },
  {
    tokens: [
      { text: "  high     ", kind: "keyword" },
      { text: "src/api/repos.controller.ts:88", kind: "plain" },
    ],
  },
  {
    tokens: [{ text: "    unbounded query on list endpoint", kind: "comment" }],
  },
  { tokens: [{ text: "", kind: "plain" }] },
  {
    tokens: [
      { text: "4 signals", kind: "number" },
      { text: " · ", kind: "punctuation" },
      { text: "2 blocking", kind: "plain" },
      { text: " · ", kind: "punctuation" },
      { text: "1.8s", kind: "string" },
    ],
  },
];

const configLines: readonly CodeLine[] = [
  { tokens: [{ text: "# .coderev.yml", kind: "comment" }] },
  {
    tokens: [
      { text: "version", kind: "type" },
      { text: ": ", kind: "punctuation" },
      { text: "1", kind: "number" },
    ],
  },
  { tokens: [{ text: "", kind: "plain" }] },
  {
    tokens: [
      { text: "review", kind: "type" },
      { text: ":", kind: "punctuation" },
    ],
  },
  {
    tokens: [
      { text: "  block_on", kind: "type" },
      { text: ": [", kind: "punctuation" },
      { text: "critical", kind: "string" },
      { text: ", ", kind: "punctuation" },
      { text: "high", kind: "string" },
      { text: "]", kind: "punctuation" },
    ],
  },
  {
    tokens: [
      { text: "  paths", kind: "type" },
      { text: ":", kind: "punctuation" },
    ],
  },
  {
    tokens: [
      { text: "    - ", kind: "punctuation" },
      { text: "src/**", kind: "string" },
    ],
  },
  {
    tokens: [
      { text: "  ignore", kind: "type" },
      { text: ":", kind: "punctuation" },
    ],
  },
  {
    tokens: [
      { text: "    - ", kind: "punctuation" },
      { text: "**/*.generated.ts", kind: "string" },
    ],
  },
];

const highlights = [
  {
    title: "Runs in CI or locally",
    body: "The same analysis from a terminal, a pre-push hook, or a pipeline step.",
  },
  {
    title: "Config lives in the repo",
    body: "Thresholds and ignore rules are reviewed like any other change.",
  },
  {
    title: "Machine-readable output",
    body: "JSON and SARIF, so findings land wherever your team already looks.",
  },
];

export function DeveloperSection() {
  return (
    <section
      id="developers"
      className="relative scroll-mt-24 py-20 sm:py-28"
      aria-labelledby="developers-heading"
    >
      <Container width="wide">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              align="left"
              eyebrow="For developers"
              title={
                <span id="developers-heading">
                  Built to live where you already work
                </span>
              }
              description="No new tab to babysit. CodeRev is a command, a check, and a config file your team owns."
            />

            <Stagger className="mt-9 flex flex-col gap-5" gap={0.09}>
              {highlights.map((item) => (
                <StaggerItem key={item.title} className="flex gap-3.5">
                  <span
                    className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-brand-500/30 bg-brand-500/10 font-mono text-[0.625rem] text-brand-300"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <div>
                    <p className="text-[0.9375rem] font-medium text-ink-100">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            <Reveal delay={0.2} className="mt-8">
              <div className="flex flex-wrap gap-2">
                <Badge tone="outline" size="sm">
                  CLI
                </Badge>
                <Badge tone="outline" size="sm">
                  GitHub Action
                </Badge>
                <Badge tone="outline" size="sm">
                  SARIF
                </Badge>
                <Badge tone="outline" size="sm">
                  JSON
                </Badge>
              </div>
            </Reveal>
          </div>

          {/* Terminal + config stack. Parallax gives the column a slower
              scroll rate than the copy beside it, which reads as depth. */}
          <Reveal from="right" delay={0.1} duration={0.9} className="min-w-0">
            <Parallax distance={26} className="relative">
              <CodeBlock
                lines={terminalLines}
                filename="zsh — coderev"
                showLineNumbers={false}
                className="shadow-[0_30px_80px_-40px_oklch(0_0_0/0.9)]"
              />

              {/* Offset config card, giving the pair depth. */}
              <div className="mt-4 lg:-mr-8 lg:ml-8">
                <CodeBlock
                  lines={configLines}
                  filename=".coderev.yml"
                  language="yaml"
                  showLineNumbers={false}
                  className="shadow-[0_30px_80px_-40px_oklch(0_0_0/0.9)]"
                />
              </div>
            </Parallax>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <p className="mt-10 text-center text-xs text-ink-600">
            Command output and configuration shown are illustrative examples of
            the planned developer surface.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
