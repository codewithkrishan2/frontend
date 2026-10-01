import { cn } from "@/lib/utils";

/**
 * A faint field of scattered code characters, used as hero atmosphere.
 *
 * Two stacked copies of the same grid:
 *
 * 1. A dim base layer, always visible.
 * 2. A bright layer masked to a circle at the pointer, so moving the cursor
 *    lights up the characters underneath it.
 *
 * The pointer position arrives as the `--spot-x` / `--spot-y` custom properties
 * published by `SpotlightSection`, which must be an ancestor. Both have
 * fallbacks, so without any pointer (touch, keyboard, reduced motion) the
 * highlight simply rests in a fixed, pleasant position.
 *
 * Implementation notes:
 *
 * - The grid is generated once at module scope with a seeded PRNG, never
 *   `Math.random()`. Random output would differ between the server render and
 *   any client render, producing a hydration mismatch.
 * - Each layer is one `<pre>` of newline-separated rows: a handful of text nodes
 *   rather than thousands of spans, and no JavaScript ships for the field itself.
 * - Mostly blank, which reads as scattered code and compresses very well. The
 *   second copy is byte-identical to the first, so gzip charges almost nothing
 *   for it.
 * - The spotlight animates only `mask-image` and `opacity` on a layer that is
 *   already composited, so there is no layout or paint work per frame.
 * - `aria-hidden`: pure decoration that would otherwise be read out as gibberish.
 */

const CHARS = "01<>/{}[]();=+-*&|!?#$%_.:abcdefhilmnoprstuxy";

const COLUMNS = 190;
const ROWS = 60;
/** Fraction of cells that get a character rather than a space. */
const DENSITY = 0.34;

/** Radius of the cursor light. */
const SPOT_RADIUS = "270px";

/** Shared type/grid metrics, so both layers line up exactly. */
const gridStyle = {
  fontSize: "clamp(11px, 0.78vw, 15px)",
  lineHeight: 1.5,
  letterSpacing: "0.15em",
} as const;

/** Clears the centre, where the headline and CTAs sit. */
const CENTRE_CLEAR_MASK =
  "radial-gradient(ellipse 58% 46% at 50% 36%, transparent 0%, transparent 34%, #000 80%)";

/**
 * Circle of light at the pointer. A flat, fully opaque core out to 22% keeps
 * the characters nearest the cursor at full brightness, then it falls away —
 * a pure linear falloff reads as a weak smudge rather than a light source.
 */
const SPOTLIGHT_MASK = `radial-gradient(circle ${SPOT_RADIUS} at var(--spot-x, 50%) var(--spot-y, 26%), #000 0%, #000 22%, oklch(0 0 0 / 0.55) 48%, transparent 76%)`;

/** xorshift32. Deterministic across engines, so SSR output is stable. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function buildField(): string {
  const random = createRandom(0x5eed_1337);
  const rows: string[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    let line = "";

    for (let column = 0; column < COLUMNS; column += 1) {
      line +=
        random() < DENSITY
          ? // charAt (not indexing) returns "" rather than undefined, which
            // keeps this total under noUncheckedIndexedAccess.
            CHARS.charAt(Math.floor(random() * CHARS.length))
          : " ";
    }

    rows.push(line);
  }

  return rows.join("\n");
}

const FIELD = buildField();

export function CodeField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none",
        className,
      )}
    >
      {/* The centre-clear mask lives on this wrapper so it applies to both
          layers at once. Nesting masks avoids needing mask-composite, which is
          easy to get subtly wrong. */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: CENTRE_CLEAR_MASK,
          WebkitMaskImage: CENTRE_CLEAR_MASK,
        }}
      >
        {/* Base layer: dim enough to read as texture. Any brighter and the
            characters become legible, which pulls the eye off the headline. */}
        <pre
          className="absolute top-0 left-1/2 -translate-x-1/2 font-mono whitespace-pre"
          style={{ ...gridStyle, color: "oklch(0.34 0.012 265 / 0.5)" }}
        >
          {FIELD}
        </pre>

        {/* Highlight layer: same grid, brighter, revealed only around the
            cursor. `--spot-opacity` fades the whole thing in on enter. */}
        <pre
          className="absolute top-0 left-1/2 -translate-x-1/2 font-mono whitespace-pre transition-opacity duration-500 ease-out"
          style={{
            ...gridStyle,
            color: "oklch(0.86 0.1 205 / 0.92)",
            opacity: "var(--spot-opacity, 0)",
            maskImage: SPOTLIGHT_MASK,
            WebkitMaskImage: SPOTLIGHT_MASK,
          }}
        >
          {FIELD}
        </pre>

        {/* A soft brand glow riding with the cursor, to give the light some
            body rather than only tinting glyphs. */}
        <div
          className="absolute inset-0 transition-opacity duration-500 ease-out"
          style={{
            opacity: "var(--spot-opacity, 0)",
            background: `radial-gradient(circle ${SPOT_RADIUS} at var(--spot-x, 50%) var(--spot-y, 26%), oklch(0.62 0.205 280 / 0.22) 0%, oklch(0.63 0.12 200 / 0.1) 45%, transparent 75%)`,
          }}
        />
      </div>

      {/* Scrims, not extra mask layers: they paint after the field in the same
          stacking context. The top one keeps the navigation on clean
          background; the bottom one fades into the next section. */}
      <div
        className="absolute inset-x-0 top-0 h-28"
        style={{
          background:
            "linear-gradient(to bottom, var(--background) 10%, transparent)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            "linear-gradient(to top, var(--background) 10%, transparent)",
        }}
      />
    </div>
  );
}
