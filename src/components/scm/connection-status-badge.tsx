import { Badge } from "@/components/ui";
import type { ScmConnectionReadiness } from "@/lib/api/types";
import { scmConnectionState } from "@/lib/scm/presentation";
import { cn } from "@/lib/utils";

type ConnectionStatusBadgeProps = {
  /** `ScmConnectionResponse.connectionStatus`, serialised as the enum name. */
  status: string;
  /**
   * `ScmConnectionResponse.readiness`, when the backend supplied it.
   *
   * Preferred over `status` where present, because the two disagree on the case
   * that matters: a credential the backend renews silently has status `EXPIRED`,
   * which on its own reads as a problem the user has to solve.
   */
  readiness?: ScmConnectionReadiness;
  size?: "sm" | "md";
  className?: string;
};

/**
 * A connection's state as a badge, with a status dot.
 *
 * The dot is not decoration: `pass` and `warn` differ only in hue, and a badge
 * that relies on colour alone fails for anyone who cannot distinguish them. The
 * label carries the meaning; the dot just makes the row scannable.
 */
export function ConnectionStatusBadge({
  status,
  readiness,
  size = "sm",
  className,
}: ConnectionStatusBadgeProps) {
  const { label, tone } = scmConnectionState({
    connectionStatus: status,
    readiness,
  });

  return (
    <Badge tone={tone} size={size} className={className}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "pass" && "bg-signal-pass",
          tone === "warn" && "bg-signal-warn",
          tone === "fail" && "bg-signal-fail",
          (tone === "outline" || tone === "neutral") && "bg-ink-500",
        )}
      />
      {label}
    </Badge>
  );
}

export type { ConnectionStatusBadgeProps };
