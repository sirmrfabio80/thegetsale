<div align="center">

# The Get

**Know when to buy. Know when to wait.**

Private shopping intelligence for premium fashion — a calm, editorial read on when each house is likely to go on sale, how deep it tends to go, and whether to act now or hold.

[![Built with TanStack Start](https://img.shields.io/badge/TanStack-Start-0F172A?logo=react&logoColor=white)](https://tanstack.com/start)
[![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Backend-Lovable%20Cloud-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Status](https://img.shields.io/badge/status-private%20beta-9C7B5E)]()

</div>

<p align="center">
  <img src="https://id-preview--ba1e041c-74b2-4a5d-a81e-04bf1398a6ce.lovable.app/__l5e/assets-v1/03e737d9-b74a-4943-8049-19270d2a1e33/landing-desktop.png" alt="The Get — landing page" width="900" />
</p>

---

## ✦ Why The Get exists

Most fashion houses run sales on a rhythm. Mid‑season edits, private sales, archive markdowns — they repeat, and they're surprisingly readable once you've watched a brand long enough. The problem is that *most shoppers buy the week before the markdown* and never realise it.

The Get is the quiet alternative to discount‑spam newsletters and refresh‑the‑site anxiety. It watches the houses you care about and gives you four readings:

| Signal | What it means |
|---|---|
| 🟢 **Buy now** | Window has opened — depth is meaningful, scarcity is real. |
| 🟡 **Wait for sale** | A markdown is forming. Holding is the smarter move. |
| ⚪ **Hold** | Nothing imminent. No reason to act either way. |
| ◯ **No clear read** | Not enough signal yet. We'll say so plainly. |

It is **not** a coupon site, a marketplace, a wishlist tracker, or a checkout funnel. It tracks **fashion houses**, not individual products — and sends you to the house's own site when you're ready to look.

---

## ✦ Feature tour

- **Signals dashboard** — your personalised feed of houses with today's read, sorted by relevance to your setup (departments, styles, watchlist).
- **House detail pages** — the recommendation, expected window and depth, sale cadence, history timeline, and a short *Editor's note* explaining the reasoning.
- **Watchlist** — quietly bookmark the houses you're following; URL‑backed filters and sort, optimistic add/remove, infinite scroll.
- **Onboarding (`/setup`)** — a five‑step wizard for departments → houses → categories → styles → notifications. Debounced auto‑save, fully resumable.
- **Profile** — display name, avatar (signed URLs), market selection, connected accounts.
- **Admin console (`/admin/sales`)** — houses, sale events, users & roles, app settings, system tools. Role‑gated via Postgres `has_role()`.
- **Auth** — email + password, Google (via Lovable OAuth broker), Apple, password reset, private‑beta gate.
- **Editorial empty / loading / error states** — never the default skeleton, never a toast.

---

## ✦ Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img src="https://id-preview--ba1e041c-74b2-4a5d-a81e-04bf1398a6ce.lovable.app/__l5e/assets-v1/03e737d9-b74a-4943-8049-19270d2a1e33/landing-desktop.png" alt="Landing — desktop" />
      <br /><sub><b>Landing</b> · desktop · <code>/</code></sub>
    </td>
    <td align="center" width="50%">
      <img src="https://id-preview--ba1e041c-74b2-4a5d-a81e-04bf1398a6ce.lovable.app/__l5e/assets-v1/1e2d4e46-abad-422f-9ba2-dc68db193cef/login-desktop.png" alt="Sign in — desktop" />
      <br /><sub><b>Sign in</b> · Google / Apple / email · <code>/login</code></sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="https://id-preview--ba1e041c-74b2-4a5d-a81e-04bf1398a6ce.lovable.app/__l5e/assets-v1/f33e83a7-337a-4ea2-9af4-4531479fbea2/landing-mobile.png" alt="Landing — mobile" width="320" />
      <br /><sub><b>Mobile</b> · the product is mobile‑first; this is the same hero at 390 × 844.</sub>
    </td>
  </tr>
</table>

> Signed‑in surfaces — Signals dashboard, watchlist, house detail, setup wizard, admin — are gated by auth and not pictured here. Sign in to the preview to see them.

---

## ✦ Design system, in one paragraph

Warm off‑white (`background`), deep ink text, hairline borders, tight architectural radius. Display serif (Fraunces / system serif) for editorial moments; clean sans for body. Eyebrow labels in `0.18em` upper‑case tracking. No loud gradients, no coupon colours, no urgency tricks. **Toasts are intentionally disabled** via a `@/lib/toast` no‑op shim — feedback lives inline, in the page chrome.

---

## ✦ Tech stack

| Layer | Choice |
|---|---|
| Framework | [**TanStack Start v1**](https://tanstack.com/start) (React 19, SSR, file‑based routing in `src/routes/`) |
| Build | Vite 7 + `@tailwindcss/vite` |
| Styling | Tailwind CSS v4 (CSS‑first theming via `src/styles.css`) |
| UI primitives | shadcn‑style components on Radix UI |
| Icons | lucide‑react |
| Server logic | `createServerFn` from `@tanstack/react-start` (no Edge Functions) |
| Data fetching | TanStack Query + route loaders (`ensureQueryData` + `useSuspenseQuery`) |
| Backend | **Lovable Cloud** (Supabase: Postgres + Auth + Storage + RLS) |
| Auth | Email/password, Google (Lovable OAuth broker), Apple |
| Runtime | Cloudflare Workers (`nodejs_compat`) via `@cloudflare/vite-plugin` |
| Validation | Zod |
| Tests | Vitest |
| Lint / format | ESLint 9 + Prettier |

---

## ✦ Project structure

```
src/
├── routes/                       # File-based routing (TanStack Router)
│   ├── __root.tsx                # HTML shell, providers, error/notfound
│   ├── index.tsx                 # / — marketing landing
│   ├── login.tsx, signup.tsx, …  # public auth pages
│   ├── brand.$id.tsx             # /brand/:id — hybrid (public + authed)
│   ├── _authenticated.tsx        # auth gate + hydrating shell
│   └── _authenticated/
│       ├── dashboard.tsx         # /dashboard — signals feed
│       ├── watchlist.tsx         # /watchlist
│       ├── setup.tsx             # /setup — onboarding wizard
│       ├── profile.tsx           # /profile
│       └── _admin/admin.sales.tsx# /admin/sales (role-gated)
│
├── components/                   # Reusable UI (BrandCard, SignalBadge, …)
│   ├── marketing/                # Landing-only sections
│   ├── brand/                    # House detail (SignalEditorial, …)
│   ├── dashboard/                # EditorialBand
│   ├── setup/                    # Wizard steps & chips
│   ├── profile/                  # Avatar block, crop modal, accounts
│   ├── admin/                    # Admin tabs & drawers
│   └── RouteErrorCard.tsx        # Shared editorial error boundary
│
├── lib/                          # Server functions (*.functions.ts) + helpers
├── data/                         # Types, fallback brand seed, setup store
├── hooks/                        # use-profile, use-is-admin, use-infinite-count, …
├── integrations/supabase/        # ⚠️ auto-generated client/types — do not edit
└── styles.css                    # Tailwind v4 theme tokens
```

Naming follows **flat dot‑separated** routes (`brand.$id.tsx`, not `brand/$id.tsx`). `src/routeTree.gen.ts` is auto‑generated.

---

## ✦ Architectural notes (for future contributors)

A condensed version of the living [`AI_PROJECT_HANDOFF.md`](./AI_PROJECT_HANDOFF.md):

1. **TanStack `createServerFn` for app logic.** Don't reach for Supabase Edge Functions. Files: `src/lib/*.functions.ts`.
2. **Loader + Suspense for reads.** Pattern is `queryClient.ensureQueryData(opts)` in the route loader, `useSuspenseQuery(opts)` in the component. Never `useEffect` + `fetch`.
3. **Auth‑protected server functions** use `requireSupabaseAuth` middleware; `attachSupabaseAuth` is registered globally in `src/start.ts` so the bearer token is forwarded automatically.
4. **Roles** live in `public.user_roles` and are checked via the `has_role(uid, role)` security‑definer RPC. Never store roles on `profiles`.
5. **Public schema tables** always ship `GRANT` statements alongside `CREATE TABLE` and RLS policies — Supabase's Data API does not grant defaults.
6. **Editorial empty / error states** use the shared `<RouteErrorCard>` inside `<PageLayout>`. Avoid full‑screen error pages on protected routes.
7. **Toasts are off.** `@/lib/toast` is a no‑op shim. Don't reinstate `sonner` or mount `<Toaster />`.
8. **Auto‑generated, never hand‑edited:** `src/routeTree.gen.ts`, `src/integrations/supabase/*`, `supabase/config.toml`, `.env`.

---

## ✦ Voice & copy

Quiet, intelligent, restrained, premium. Direct, elegant, useful.

> *"Most of the games retailers play with you have a tempo. Once you can hear it, the shopping gets quieter."*
> — The Get, Editor's note

**Good:** *Wait for sale · A clearer window is forming · No clear read yet · Watch this house.*
**Bad:** *Huge deals! · Don't miss out! · AI‑powered fashion savings revolution.*

British English. Sentence case. No exclamation marks in the product UI.

---

## ✦ Status & roadmap

- ✅ Auth (email + Google + Apple), private‑beta gate
- ✅ Dashboard, watchlist, setup wizard, profile
- ✅ House detail (hybrid public / authed)
- ✅ Admin: houses, sale events, users, settings
- ⚠️ Sale predictions are currently **admin‑curated**; an automated generator is on the roadmap
- ⏳ Email digests for watchlist signals
- ⏳ Native mobile shell

---

## ✦ License

This is a private prototype. All rights reserved by the project owner. Logos shown in‑app are provided by [Logo.dev](https://logo.dev).

---

<div align="center">
<sub>Built with care on <a href="https://lovable.dev">Lovable</a>. A quieter way to buy.</sub>
</div>
