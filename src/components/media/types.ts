/**
 * Shared prop interfaces for media backdrop patterns.
 *
 * Every full-bleed editorial band on the site — marketing hero, dashboard
 * band, watchlist band, and any future section — MUST be built with
 * `VideoBanner` (which composes `FullBleedSection` + `MediaBackdrop`).
 * That guarantees a single implementation of:
 *   • `prefers-reduced-motion` → poster swap
 *   • absolute-inset, object-cover sizing
 *   • scrim + grain overlay timing and spacing
 *   • flush, viewport-edge layout under the sticky header
 *
 * Do NOT hand-roll `<video>` elements in new sections; extend this
 * interface additively if a new option is needed. The
 * `full-bleed-flush.test.ts` suite enforces this contract.
 */


/** Video source URLs. Either or both may be omitted; the poster is used alone. */
export interface MediaSources {
  /** Optional WebM source (preferred where supported). */
  webm?: string;
  /** Optional MP4 source (universal fallback). */
  mp4?: string;
}

/**
 * Foreground overlay applied above the media and below content.
 * - `"none"`: no overlay.
 * - `"bottom"`: bottom-up dark gradient for hero-style copy legibility.
 * - `"full"`: even dark wash across the whole surface.
 */
export type MediaScrim = "none" | "bottom" | "full";

/**
 * Core options shared by every media-backed surface. Keep this shape
 * minimal — new opt-in flags should be additive with sane defaults so
 * existing sections do not change behaviour.
 */
export interface MediaBackdropOptions extends MediaSources {
  /** Poster image; always shown as fallback and under reduced motion. */
  poster?: string;
  /** Class overrides applied to the underlying `<img>` / `<video>`. */
  className?: string;
  /**
   * Scrim intensity multiplier (0-1). Applied to the scrim's opacity so
   * consumers can lighten or deepen the wash without redefining the
   * gradient. Defaults to 1 (unchanged from the base scrim).
   */
  overlayOpacity?: number;
  /** Optional paper-grain overlay above the media, below content. */
  grain?: boolean;
  /** Foreground scrim variant. Defaults to `"none"`. */
  scrim?: MediaScrim;
}
