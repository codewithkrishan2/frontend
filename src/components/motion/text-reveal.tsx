import { cn } from "@/lib/utils";

type TextRevealTag = "h1" | "h2" | "h3" | "p" | "span";

type TextRevealProps = {
  text: string;
  /** Classes for the wrapper. Must NOT include a `background-clip: text`
   * gradient — see `wordClassName`. */
  className?: string;
  /**
   * Classes for each animated word.
   *
   * Gradient text utilities belong here, not on the wrapper. `background-clip:
   * text` paints the background clipped to glyph geometry, and a `transform` on
   * a descendant moves the glyphs out from under that background — the text
   * renders invisible. Putting the gradient on the same element that is
   * transformed keeps background and glyphs together.
   *
   * Use a vertical gradient: it is applied per word, so a horizontal one would
   * restart on every word and look striped.
   */
  wordClassName?: string;
  /** Seconds before the first word animates. */
  delay?: number;
  /** Seconds between words. */
  gap?: number;
  /** Wrapper element. Use a heading tag to keep the document outline correct. */
  as?: TextRevealTag;
};

/**
 * Reveals a line of text word by word, each word rising and un-blurring.
 *
 * Deliberately a CSS animation in a server component, not a motion component:
 *
 * - No client JavaScript for the most important text on the page.
 * - No hydration risk. Branching markup on `useReducedMotion()` desynchronises
 *   server and client (the server cannot know the user's preference), which
 *   produces a hydration mismatch. A media query cannot.
 *
 * Reduced motion is handled by the global `prefers-reduced-motion` rule, which
 * collapses the animation duration so words land in their final state.
 *
 * Words are split rather than characters: far fewer DOM nodes, and it keeps
 * text selection and screen-reader pronunciation intact.
 */
export function TextReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  gap = 0.055,
  as: Wrapper = "span",
}: TextRevealProps) {
  const words = text.split(" ");

  return (
    <Wrapper className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          // The mask each word rises out of.
          className="inline-block overflow-hidden align-bottom"
          aria-hidden
        >
          <span
            className={cn(
              "inline-block",
              index > 0 && "ml-[0.25em]",
              wordClassName,
            )}
            style={{
              animation: "word-rise 0.75s var(--ease-out-expo) both",
              animationDelay: `${delay + index * gap}s`,
            }}
          >
            {word}
          </span>
        </span>
      ))}

      {/* Words are hidden from assistive tech individually; this gives a single
          clean reading of the whole line. */}
      <span className="sr-only">{text}</span>
    </Wrapper>
  );
}

export type { TextRevealProps };
