import { Badge } from "@/components/ui";
import { scmStatus } from "@/lib/scm/presentation";
import { cn } from "@/lib/utils";

type ConnectionStatusBadgeProps = {
  /** `ScmConnectionResponse.connectionStatus`, serialised as the enum name. */
  status: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * A connection's status as a badge, with a status dot.
 *
 * The dot is not decoration: `pass` and `warn` differ only in hue, and a badge
 * that relies on colour alone fails for anyone who cannot distinguish them. The
 * label carries the meaning; the dot just makes the row scannable.
 */
export function ConnectionStatusBadge({
  status,
  size = "sm",
  className,
}: ConnectionStatusBadgeProps) {
  const { label, tone } = scmStatus(status);

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
