"use client";

import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Tilt } from "@/components/motion/tilt";
import {
  Badge,
  Container,
  DataTable,
  Progress,
  Stat,
  Tabs,
  type DataTableColumn,
} from "@/components/ui";
import { CodeBlock, type CodeLine } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";

/**
 * Mock CodeRev dashboard.
 *
 * Illustrative data only — clearly labelled as a preview. It is built from the
 * same shared primitives the real application will use, so this doubles as a
 * usage example for DataTable, Tabs, Stat and Progress.
 */

type Finding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  file: string;
  category: string;
  confidence: number;
};

const findings: readonly Finding[] = [
  {
    id: "CR-1042",
    severity: "critical",
    title: "Signature verification skipped on session token",
    file: "src/auth/session.ts",
    category: "Security",
    confidence: 0.97,
  },
  {
    id: "CR-1039",
    severity: "high",
    title: "Unbounded query on paginated endpoint",
    file: "src/api/repos.controller.ts",
    category: "Performance",
    confidence: 0.91,
  },
  {
    id: "CR-1036",
    severity: "medium",
    title: "Retry loop lacks backoff ceiling",
    file: "src/queue/worker.ts",
    category: "Reliability",
    confidence: 0.84,
  },
  {
    id: "CR-1031",
    severity: "medium",
    title: "Duplicate validation logic across handlers",
    file: "src/api/validators.ts",
    category: "Maintainability",
    confidence: 0.78,
  },
  {
    id: "CR-1027",
    severity: "low",
    title: "Exported type is never consumed",
    file: "src/types/review.ts",
    category: "Cleanup",
    confidence: 0.69,
  },
];

const severityTone = {
  critical: "fail",
  high: "fail",
  medium: "warn",
  low: "info",
} as const;

const severityRank = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
} as const;

const columns: readonly DataTableColumn<Finding>[] = [
  {
    id: "severity",
    header: "Severity",
    sortValue: (row) => severityRank[row.severity],
    cell: (row) => (
      <Badge tone={severityTone[row.severity]} size="sm" className="capitalize">
        {row.severity}
      </Badge>
    ),
  },
  {
    id: "title",
    header: "Finding",
    sortValue: (row) => row.title,
    cell: (row) => (
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] font-medium text-ink-100">
          {row.title}
        </p>
        <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-subtle-foreground">
          {row.file}
        </p>
      </div>
    ),
    className: "max-w-[22rem]",
  },
  {
    id: "category",
    header: "Category",
    hideBelow: "md",
    sortValue: (row) => row.category,
    cell: (row) => (
      <span className="text-[0.8125rem] text-muted-foreground">
        {row.category}
      </span>
    ),
  },
  {
    id: "confidence",
    header: "Confidence",
    align: "right",
    hideBelow: "sm",
    sortValue: (row) => row.confidence,
    cell: (row) => (
      <span className="font-mono text-[0.8125rem] text-ink-200 tabular-nums">
        {Math.round(row.confidence * 100)}%
      </span>
    ),
  },
];

const repositories = [
  { name: "api-gateway", signals: 12, active: true },
  { name: "web-client", signals: 4, active: false },
  { name: "billing-service", signals: 7, active: false },
  { name: "infra-terraform", signals: 2, active: false },
  { name: "shared-ui", signals: 0, active: false },
];

const explanationLines: readonly CodeLine[] = [
  {
    tokens: [{ text: "// CodeRev · why this matters", kind: "comment" }],
  },
  {
    tokens: [
      { text: "jwt", kind: "plain" },
      { text: ".", kind: "punctuation" },
      { text: "decode", kind: "function" },
      { text: "() parses the payload but never", kind: "plain" },
    ],
  },
  {
    tokens: [
      { text: "checks the signature, so any caller can", kind: "plain" },
    ],
  },
  {
    tokens: [
      { text: "forge a ", kind: "plain" },
      { text: "sub", kind: "type" },
      { text: " claim and assume another", kind: "plain" },
    ],
  },
  {
    tokens: [{ text: "user's session.", kind: "plain" }],
  },
  { tokens: [{ text: "", kind: "plain" }] },
  {
    tokens: [{ text: "// Suggested change", kind: "comment" }],
  },
  {
    change: "add",
    highlight: true,
    tokens: [
      { text: "const claims = ", kind: "plain" },
      { text: "await", kind: "keyword" },
      { text: " jwt.", kind: "plain" },
      { text: "verify", kind: "function" },
      { text: "(token, secret)", kind: "punctuation" },
    ],
  },
];

function OverviewPanel() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Open signals"
          value="24"
          delta={{ value: "18%", direction: "down", positiveIsGood: false }}
          hint="Across 5 repositories"
        />
        <Stat
          label="Review time"
          value="3.4h"
          delta={{ value: "41%", direction: "down", positiveIsGood: false }}
          hint="Median, last 30 days"
        />
        <Stat
          label="Merge confidence"
          value="92%"
          delta={{ value: "6pts", direction: "up" }}
          hint="Weighted by blast radius"
        />
        <Stat
          label="Coverage delta"
          value="+2.8%"
          delta={{ value: "steady", direction: "flat" }}
          hint="Since last release"
        />
      </div>

      <div className="grid gap-5 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Progress label="Security" value={78} tone="fail" showValue />
        <Progress label="Reliability" value={88} tone="warn" showValue />
        <Progress label="Maintainability" value={94} tone="pass" showValue />
        <Progress label="Test coverage" value={81} tone="brand" showValue />
      </div>
    </div>
  );
}

function FindingsPanel() {
  return (
    <DataTable
      columns={columns}
      rows={findings}
      rowKey={(row) => row.id}
      defaultSortId="severity"
      caption="Illustrative findings for the api-gateway repository."
    />
  );
}

function ExplainPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
      <CodeBlock
        lines={explanationLines}
        filename="coderev/explanation.md"
        showLineNumbers={false}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-ink-900/50 p-4">
        <div className="flex items-center gap-2">
          <Badge tone="fail" size="sm">
            Critical
          </Badge>
          <span className="font-mono text-[0.6875rem] text-subtle-foreground">
            CR-1042
          </span>
        </div>

        <p className="text-sm font-medium text-ink-100">
          Signature verification skipped
        </p>

        <dl className="mt-1 space-y-2 text-xs">
          {[
            ["Blast radius", "Authentication, all routes"],
            ["Introduced", "PR #2481 · 2 commits"],
            ["Owner", "auth-platform"],
            ["Confidence", "97%"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="shrink-0 text-subtle-foreground">{label}</dt>
              <dd className="text-right text-ink-200">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function ProductShowcase() {
  return (
    <section
      id="product"
      className="relative scroll-mt-24 py-20 sm:py-28"
      aria-labelledby="product-heading"
    >
      <Container width="wide">
        <SectionHeading
          eyebrow="Product preview"
          title={
            <span id="product-heading">A review surface built for depth</span>
          }
          description="Signals, explanations and trends in one place, so a reviewer never has to reconstruct context by hand."
        />

        <Reveal delay={0.12} duration={0.9} scale={0.98} className="mt-14">
          <Tilt max={2} perspective={1800} className="rounded-2xl">
            <div
              className={cn(
                "overflow-hidden rounded-2xl border border-border-strong bg-ink-950/80",
                "shadow-[0_50px_140px_-50px_oklch(0_0_0/0.95),0_1px_0_0_oklch(1_0_0/0.07)_inset]",
              )}
            >
              {/* App chrome */}
              <div className="flex items-center gap-3 border-b border-border bg-ink-900/70 px-4 py-2.5">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-ink-700" />
                  <span className="size-2.5 rounded-full bg-ink-700" />
                  <span className="size-2.5 rounded-full bg-ink-700" />
                </div>
                <div className="mx-auto hidden max-w-xs flex-1 rounded-md border border-border bg-ink-950/70 px-3 py-1 text-center font-mono text-[0.6875rem] text-ink-500 sm:block">
                  app.coderev.dev/api-gateway
                </div>
                <Badge tone="outline" size="sm" className="shrink-0">
                  Preview
                </Badge>
              </div>

              <div className="grid lg:grid-cols-[13rem_1fr]">
                {/* Repository sidebar. Hidden on small screens where the
                    dashboard needs the full width. */}
                <aside className="hidden flex-col gap-1 border-r border-border p-3 lg:flex">
                  <p className="px-2 py-1.5 font-mono text-[0.625rem] tracking-[0.16em] text-subtle-foreground uppercase">
                    Repositories
                  </p>

                  {repositories.map((repo) => (
                    <div
                      key={repo.name}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] transition-colors",
                        repo.active
                          ? "bg-brand-500/12 text-ink-50"
                          : "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          repo.active ? "bg-brand-400" : "bg-ink-600",
                        )}
                        aria-hidden
                      />
                      <span className="truncate font-mono text-xs">
                        {repo.name}
                      </span>
                      {repo.signals > 0 ? (
                        <span className="ml-auto font-mono text-[0.625rem] text-subtle-foreground tabular-nums">
                          {repo.signals}
                        </span>
                      ) : null}
                    </div>
                  ))}

                  {/* Anchored to the bottom so the sidebar does not read as
                      an empty column next to the taller main panel. */}
                  <div className="mt-auto pt-4">
                    <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-2 text-[0.6875rem] text-subtle-foreground">
                      <span aria-hidden>+</span>
                      Connect repository
                    </div>
                  </div>
                </aside>

                {/* Main panel */}
                <div className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-sm text-ink-50">
                      api-gateway
                    </h3>
                    <Badge tone="brand" size="sm">
                      main
                    </Badge>
                    <span className="text-xs text-subtle-foreground">
                      Last analyzed 4 minutes ago
                    </span>
                  </div>

                  <Tabs
                    items={[
                      {
                        id: "overview",
                        label: "Overview",
                        content: <OverviewPanel />,
                      },
                      {
                        id: "findings",
                        label: "Findings",
                        content: <FindingsPanel />,
                      },
                      {
                        id: "explain",
                        label: "AI explanation",
                        content: <ExplainPanel />,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </Tilt>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-6 text-center text-xs text-ink-600">
            Interface preview with illustrative data. Figures are examples, not
            measured results.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
