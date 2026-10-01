import { cn } from "@/lib/utils";

const sizeClasses = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

type AvatarProps = {
  /** Full name or handle. Drives the fallback initials and the label. */
  name: string;
  src?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : undefined;
  return (last ? `${first}${last}` : first).toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-ink-800 font-medium text-ink-200 select-none",
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        // A plain <img> is intentional: avatars are small, remote, and often
        // user-supplied, so next/image optimisation buys little here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      {src ? null : <span className="sr-only">{name}</span>}
    </span>
  );
}

type AvatarGroupProps = {
  people: readonly { name: string; src?: string }[];
  max?: number;
  size?: keyof typeof sizeClasses;
  className?: string;
};

/** Overlapping avatars with a "+N" overflow chip. */
export function AvatarGroup({
  people,
  max = 4,
  size = "sm",
  className,
}: AvatarGroupProps) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((person) => (
        <Avatar
          key={person.name}
          name={person.name}
          src={person.src}
          size={size}
          className="-ml-2 ring-2 ring-background first:ml-0"
        />
      ))}

      {overflow > 0 ? (
        <span
          className={cn(
            "-ml-2 inline-flex items-center justify-center rounded-full border border-border-strong bg-ink-850 font-medium text-muted-foreground ring-2 ring-background",
            sizeClasses[size],
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

export type { AvatarProps, AvatarGroupProps };
