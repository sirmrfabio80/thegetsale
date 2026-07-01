/**
 * Shared prop interfaces for media backdrop patterns.
 *
 * Both `MediaBackdrop` (the low-level img/video swap) and `VideoBanner`
 * (the full-bleed section wrapper) consume these types so future sections
 * — product spotlights, editorial covers, footer bands — can reuse the
 * exact same shape without introducing behaviour drift.
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
