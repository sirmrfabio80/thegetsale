
# Brand logos — revised plan

Adds a logo per house: stored in Supabase, displayed on every brand card surface, manageable from the admin drawer, with a one-off (chunked) backfill from Logo.dev.

## 1. Schema change

Migration on `public.brands`:

```sql
ALTER TABLE public.brands ADD COLUMN logo_url text;
```

Nullable, no default. RLS / GRANTs unchanged.

Code touched (extend, don't break existing selects):
- `src/lib/admin-houses.functions.ts` — add `logoUrl: string | null` to `HouseDTO`, include `logo_url` in `mapRow`, add to `HouseInput` zod (optional/nullable, max 500, must start with the bucket public prefix), pass through in `createHouse`/`updateHouse`.
- `src/lib/brands.functions.ts` — add `logo_url` to `BRAND_COLS`; add `logoUrl: string | null` to `HouseDashboardDTO`, `HouseDetailDTO`, `PublicHouseDTO`; pass through in `toDashboardDTO` and both detail handlers.
- `src/data/types.ts` — add `logoUrl?: string | null` to `Brand`.
- `src/integrations/supabase/types.ts` — auto-regenerates; never hand-edit.

## 2. Storage bucket

New public-read bucket `brand-logos`:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos','brand-logos', true);

CREATE POLICY "Public read brand-logos"
  ON storage.objects FOR SELECT USING (bucket_id = 'brand-logos');

CREATE POLICY "Admins write brand-logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update brand-logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-logos' AND has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete brand-logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-logos' AND has_role(auth.uid(),'admin'));
```

**Object path:** `brand-logos/{brand.id}/{hash}.{ext}` — keyed by brand UUID, not slug (slugs are mutable). `{hash}` is a short content/time hash to bust CDN cache on replace.

`brands.logo_url` stores the full public URL from `supabase.storage.from('brand-logos').getPublicUrl(path)`.

File constraints (client + server):
- MIME: `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`
- Max size: 1 MB
- Max raster dimensions: 1024×1024 (client check via `Image`; SVG skipped). Displayed at 40px.

## 3. Backfill (admin-triggered, chunked, Logo.dev)

New server fn `backfillBrandLogos` in `src/lib/admin-logo-backfill.functions.ts` (`requireSupabaseAuth` + admin guard, uses `supabaseAdmin` for storage + DB writes):

```text
remaining = count(brands WHERE is_active AND logo_url IS NULL AND website_url IS NOT NULL)
batch    = first 25 such brands, ordered by name

for each brand in batch:
  domain = new URL(website_url).hostname.replace(/^www\./,'')
  GET https://img.logo.dev/${domain}?size=256&format=png&token=${LOGO_DEV_TOKEN}
  if 200 and content-type starts with "image/":
    path = `${brand.id}/${shortHash()}.png`
    upload bytes to brand-logos at path
    update brands.logo_url = publicUrl(path)
    updated++
  else:
    skipped.push({ slug, reason: status===404 ? "not_found" : `http_${status}` })

return { processed: batch.length, updated, skipped, errors, remaining: remaining - batch.length }
```

**No background infra.** Admin clicks "Fetch missing logos" in the Houses tab toolbar; toast on completion reads e.g.:

> Updated 22 · skipped 3 · **41 brands remaining** — click again to continue.

Button disables while running. Idempotent: re-runs only touch rows where `logo_url IS NULL`.

404 / unsupported: row stays NULL, card falls back to monogram, admin can upload manually.

**Secret:** `LOGO_DEV_TOKEN` will be added via `add_secret` **before** the backfill server fn is wired up. The Houses tab button stays hidden / disabled until the secret exists (server fn returns an explicit `{ error: "missing_token" }` shape that the UI surfaces as a toast).

## 4. Card UI

New reusable component `src/components/BrandLogo.tsx`:

```text
<BrandLogo name size={40} logoUrl={…} />
```

- 40×40 (configurable) square tile, 1px `border-border`, `bg-muted`, no radius, 4px inner padding.
- If `logoUrl` present: `<img loading="lazy" object-contain alt="{name} logo" onError={…}>`. **`onError` flips local state to render the monogram fallback** — no broken-image icon ever shows.
- Fallback monogram: 2 uppercase letters, serif, `text-foreground/70`, centered. Derivation rule (confirmed): strip non-alphanumerics, then first letter of first 2 whitespace-separated words; single-word → first 2 letters. `The Row → TR`, `ARKET → AR`, `Massimo Dutti → MD`, `& Other Stories → OS`.

**Applied to all three card surfaces, same 40px spec, positioned top-left above the eyebrow line:**
- `src/components/BrandCard.tsx`
- `src/components/RecommendationCard.tsx`
- `src/components/WatchlistCard.tsx`

In every card: signal-accent left border, bookmark button, 3-stat row, serif name, and all existing copy stay exactly as they are. 12px margin-bottom under the tile before the eyebrow. Mobile (<640px): no reflow — tile fits within existing padding.

**Detail page hero is out of scope for this PR.**

## 5. Admin upload — `HouseDrawer.tsx`

New "Logo" field, full-width row above the "Active" switch:

```text
Logo
┌──────┐
│ ▢ 64 │  [Choose file]   Remove
│      │  PNG, JPG, SVG, WEBP · max 1 MB · square recommended
└──────┘
```

**Direct-to-storage upload using the user's JWT** (admin RLS policies above enforce access):

```text
client (HouseDrawer):
  1. validate mime + size + dimensions
  2. path = `${brand.id}/${shortHash()}.${ext}`
  3. supabase.storage.from('brand-logos').upload(path, file, { cacheControl: '3600', upsert: false })
  4. publicUrl = supabase.storage.from('brand-logos').getPublicUrl(path).data.publicUrl
  5. call server fn setBrandLogoUrl({ brandId, logoUrl: publicUrl })
  6. on success: invalidate ["admin","houses"] / ["admin","brands"], update preview
```

Server fn `setBrandLogoUrl` (in `admin-houses.functions.ts`, `requireSupabaseAuth` + `ensureAdmin`):
- Re-validates `logoUrl` starts with the bucket's public prefix (`${SUPABASE_URL}/storage/v1/object/public/brand-logos/`) and parses to a path under `{brandId}/…`.
- **Best-effort deletes the previous object** (reads current `brands.logo_url`, extracts path if it points into our bucket, calls `supabaseAdmin.storage.from('brand-logos').remove([prevPath])` — ignore failures).
- Updates `brands.logo_url`.

Server fn `removeBrandLogo({ brandId })`:
- Reads current `brands.logo_url`, best-effort deletes the storage object, clears `logo_url`.

For brand-new houses (no `id`), the Logo field is disabled with hint "Save the house first, then add a logo." Avoids orphaned uploads.

No base64 over the wire.

## 6. Manual verification

- Card variants: BrandCard, RecommendationCard, WatchlistCard each render tile with image when `logoUrl` set, monogram otherwise. Identical 40px spec across all three.
- `<img onError>` fallback: set `logo_url` to a deliberately broken URL on one brand → card shows monogram, no broken-image glyph.
- Mobile 375px: tile + name + bookmark fit, no wrap regression.
- Admin upload (valid PNG ≤1 MB, ≤1024²): success, preview updates, dashboard reflects after invalidation. URL in DB starts with the bucket public prefix.
- Validation rejects: >1 MB, >1024² raster, `.gif`, non-image mime — client toast, no upload attempted.
- Replace: uploading a new file deletes the previous storage object (verify via Storage tab) before the new URL is written.
- Remove: clears `logo_url` AND removes the storage object; card reverts to monogram.
- RLS: non-admin authenticated user calling `.storage.from('brand-logos').upload(...)` directly → denied.
- Backfill button (admin only): first click processes 25 and toast shows remaining count; re-click resumes; running with `LOGO_DEV_TOKEN` missing surfaces a clear toast and does nothing.
- `AI_PROJECT_HANDOFF.md` updated in the same turn: new `logo_url` column, `brand-logos` bucket + path scheme (`{brand.id}/{hash}.{ext}`), Logo.dev provider + token + 25-per-batch cap, direct-to-storage upload pattern, `BrandLogo` component, three card surfaces updated.

## Pre-build checklist

1. Add `LOGO_DEV_TOKEN` via `add_secret` **before** wiring the backfill server fn — confirmed.
2. Monogram rule confirmed (`The Row → TR`, `& Other Stories → OS`).
3. No new dependencies.
