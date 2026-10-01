"use client";

import { motion } from "motion/react";

import { Badge } from "@/components/ui";
import { CodeBlock, type CodeLine } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";

/**
 * The hero's product visualisation: a mock CodeRev review panel.
 *
 * Illustrative content, not live analysis. Kept to token data plus CSS so the
 * visual costs almost nothing at runtime.
 */

const diff: readonly CodeLine[] = [
  {
    tokens: [
      { text: "export async function ", kind: "keyword" },
      { text: "resolveSession", kind: "function" },
      { text: "(", kind: "punctuation" },
      { text: "token", kind: "plain" },
      { text: ": ", kind: "punctuation" },
      { text: "string", kind: "type" },
      { text: ") {", kind: "punctuation" },
    ],
  },
  {
    change: "remove",
    tokens: [
      { text: "  const claims = ", kind: "plain" },
      { text: "jwt", kind: "plain" },
      { text: ".", kind: "punctuation" },
      { text: "decode", kind: "function" },
      { text: "(token)", kind: "punctuation" },
    ],
  },
  {
    change: "add",
    highlight: true,
    tokens: [
      { text: "  const claims = ", kind: "plain" },
      { text: "await jwt", kind: "keyword" },
      { text: ".", kind: "punctuation" },
      { text: "verify", kind: "function" },
      { text: "(token, secret)", kind: "punctuation" },
    ],
  },
  {
    tokens: [
      { text: "  if ", kind: "keyword" },
      { text: "(!claims", kind: "punctuation" },
      { text: ".sub", kind: "plain" },
      { text: ") ", kind: "punctuation" },
      { text: "throw new ", kind: "keyword" },
      { text: "AuthError", kind: "type" },
      { text: "()", kind: "punctuation" },
    ],
  },
  {
    tokens: [
      { text: "  return ", kind: "keyword" },
      { text: "session", kind: "plain" },
      { text: ".", kind: "punctuation" },
      { text: "from", kind: "function" },
      { text: "(claims)", kind: "punctuation" },
    ],
  },
  { tokens: [{ text: "}", kind: "punctuation" }] },
];

type Finding = {
  id: string;
  tone: "fail" | "warn" | "pass";
  label: string;
  title: string;
  detail: string;
};

const findings: readonly Finding[] = [
  {
    id: "auth",
    tone: "fail",
    label: "Security",
    title: "Unverified token decoded",
    detail:
      "decode() trusts the payload without checking the signature. Use verify() so a forged token cannot mint a session.",
  },
  {
    id: "async",
    tone: "warn",
    label: "Correctness",
    title: "Promise not awaited",
    detail:
      "resolveSession returns before validation settles, so callers observe an empty session.",
  },
  {
    id: "cover",
    tone: "pass",
    label: "Coverage",
    title: "New branch is tested",
    detail:
      "auth/session.test.ts covers both the valid and forged-token paths.",
  },
];

const toneRing = {
  fail: "bg-signal-fail",
  warn: "bg-signal-warn",
  pass: "bg-signal-pass",
} as const;

export function ReviewConsole({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border-strong bg-ink-950/75",
        "shadow-[0_40px_120px_-40px_oklch(0_0_0/0.95),0_1px_0_0_oklch(1_0_0/0.08)_inset]",
        className,
      )}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-ink-900/70 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-signal-fail/70" />
          <span className="size-2.5 rounded-full bg-signal-warn/70" />
          <span className="size-2.5 rounded-full bg-signal-pass/70" />
        </div>

        <p className="truncate font-mono text-xs text-ink-300">
          coderev / api-gateway
          <span className="text-ink-600"> · </span>
          <span className="text-brand-300">#2481</span>
        </p>

        <Badge tone="brand" size="sm" className="ml-auto shrink-0">
          {/* CSS animation, so the global reduced-motion rule collapses it
              with no JS branch that could desync from the server render. */}
          <span
            className="size-1.5 animate-shimmer rounded-full bg-brand-400"
            aria-hidden
          />
          Analyzing
        </Badge>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        {/* Diff pane, with a sweeping scan line */}
        <div className="relative border-b border-white/6 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
            <p className="truncate font-mono text-[0.6875rem] text-ink-400">
              src/auth/session.ts
            </p>
            <span className="shrink-0 font-mono text-[0.6875rem] text-ink-600">
              +1 −1
            </span>
          </div>

          <CodeBlock
            lines={diff}
            startLine={42}
            className="rounded-none border-0 bg-transparent"
          />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.8 0.12 197 / 0.9), transparent)",
              animation: "scan 5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Findings pane */}
        <div className="flex flex-col gap-2.5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[0.6875rem] font-medium tracking-wide text-subtle-foreground uppercase">
              CodeRev findings
            </p>
            <span className="font-mono text-[0.6875rem] text-ink-500">
              3 signals
            </span>
          </div>

          {findings.map((finding, index) => (
            <motion.div
              key={finding.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.5 + index * 0.22,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-lg border border-border bg-ink-900/60 p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    toneRing[finding.tone],
                  )}
                  aria-hidden
                />
                <span className="text-[0.6875rem] font-medium tracking-wide text-subtle-foreground uppercase">
                  {finding.label}
                </span>
              </div>

              <p className="mt-1.5 text-[0.8125rem] font-medium text-ink-100">
                {finding.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {finding.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
