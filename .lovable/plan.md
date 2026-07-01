# Full-bleed video Hero (revised)

Replace the current padded Hero with an edge-to-edge, tall banner playing a muted looping summer video behind the existing headline, eyebrow, subcopy, and CTAs.

## Scope (only these change)

1. New public Supabase Storage bucket `marketing-media`.
2. New helper `src/lib/marketing-media.ts` — wraps `supabase.storage.from("marketing-media").getPublicUrl(path)` and exports resolved URLs for `hero-summer.webm`, `hero-summer.mp4`, `hero-summer-poster.jpg`.
3. Rewrite `src/components/marketing/Hero.tsx`.

No changes to `MarketingLayout`, `MarketingNav`, `index.tsx`, other sections, tokens, or dependencies.

## CTAs

Keep the **existing inline markup** — a TanStack `<Link>` primary CTA whose `to` and label are driven by `usePrivateBeta` (`/login` + "Sign in" when beta, `/signup` + "Create your signal" otherwise), plus the `<a href="#how-it-works">See how it works</a>` secondary. No `AuthCTA` component. Only restyle for dark scrim using existing tokens (`text-background`, `border-background/40`, `hover:border-background`).

## Hero structure

```text
<section relative full-bleed min-h-[72svh] md:min-h-[82vh] overflow-hidden bg-foreground>
  ├─ if !reducedMotion: <video absolute inset-0 w-full h-full object-cover
  │     autoPlay muted loop playsInline preload="metadata" poster={posterUrl} aria-hidden>
  │        <source src=webm type=video/webm />
  │        <source src=mp4  type=video/mp4  />
  │     </video>
  ├─ if reducedMotion: <img src={posterUrl} class="absolute inset-0 h-full w-full object-cover" aria-hidden />
  ├─ scrim: absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none
  └─ content: relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-end
              px-5 md:px-10 pt-40 md:pt-56 pb-16 md:pb-24
        - eyebrow
        - h1 serif (existing copy)
        - subcopy
        - CTA row (existing Link + anchor, dark-scrim styling)
```

Full-bleed: the section drops `max-w-*` and side padding so it spans the viewport; the inner content column re-introduces `max-w-6xl` + `px-5 md:px-10`. Height uses `min-h-[72svh] md:min-h-[82vh]` only (no `min-h-inherit`); the content column fills the section via `absolute inset-0` or by making the section a flex column (`flex flex-col justify-end`) with the content column as a normal child — the plan uses the flex-column approach so no absolute positioning of text is needed.

## Reduced motion

Small SSR-safe `useReducedMotion` hook (matchMedia `(prefers-reduced-motion: reduce)`, `useState` + `useEffect`). When true, render only the poster `<img>`; skip `<video>` entirely so no sources are fetched and no autoplay occurs.

## Media helper

`src/lib/marketing-media.ts`:

```ts
import { supabase } from "@/integrations/supabase/client";
const url = (p: string) =>
  supabase.storage.from("marketing-media").getPublicUrl(p).data.publicUrl;
export const heroSummer = {
  webm: url("hero-summer.webm"),
  mp4: url("hero-summer.mp4"),
  poster: url("hero-summer-poster.jpg"),
};
```

## Storage bucket & policies

Create `marketing-media` (public) via the storage tool. Then migration on `storage.objects` mirroring the real `brand-logos` pattern:

- **SELECT**: public (anyone) where `bucket_id = 'marketing-media'`.
- **INSERT / UPDATE / DELETE**: admin-only via `public.has_role(auth.uid(), 'admin')` where `bucket_id = 'marketing-media'`.

You upload `hero-summer.webm`, `hero-summer.mp4`, `hero-summer-poster.jpg` to the bucket root after it exists.

## Accessibility & perf

- Video/poster are decorative → `aria-hidden`, no captions.
- `preload="metadata"` keeps initial payload small; poster paints immediately.
- Legibility from bottom-up scrim; only existing tokens used.

## Out of scope

Sections below the hero, nav, layout wrappers, tokens, deps, analytics.

Approve and I'll implement.