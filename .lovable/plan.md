## Scope check

The `/setup` onboarding form is already built (`src/routes/_authenticated/setup.tsx`): houses, categories, notifications, review, then `→ /dashboard`. It runs on first sign-in via the `/auth/callback` redirect (no `completedAt` ⇒ `/setup`). No changes needed there.

This plan covers the new work: a minimal `/profile` page with a private, user-scoped avatar.

## 1. Database

Migration adds a thin profiles table tied to `auth.users`:

- `public.profiles`
  - `id uuid PK = auth.users.id` (no FK to `auth.users` — we'll populate via trigger)
  - `display_name text null`
  - `avatar_path text null` (storage object path, not a URL)
  - `created_at`, `updated_at` timestamps
- RLS on, policies:
  - Select: `auth.uid() = id`
  - Insert: `auth.uid() = id`
  - Update: `auth.uid() = id`
- Trigger on `auth.users` after insert → `public.handle_new_user()` inserts a profile row with `id = new.id` and `display_name = new.raw_user_meta_data->>'full_name'`. `SECURITY DEFINER`, `SET search_path = public`.
- `update_updated_at_column()` trigger on profiles.

## 2. Storage

Migration creates a **private** bucket `avatars` and policies on `storage.objects`:

- Bucket: `id='avatars'`, `public=false`, `file_size_limit=5242880`, `allowed_mime_types={image/png,image/jpeg,image/webp}`.
- Policies (only for `bucket_id = 'avatars'`):
  - Select / Insert / Update / Delete: `auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text`

Object path convention: `{user_id}/profile.{ext}`. Because the bucket is private, the UI reads via short-lived signed URLs.

## 3. Server functions (`src/lib/profile.functions.ts`)

All gated by `requireSupabaseAuth` so RLS applies as the user:

- `getMyProfile()` → `{ id, displayName, email, avatarPath, avatarUrl }`. If `avatarPath` set, creates a 60-min signed URL via the auth-scoped client.
- `setAvatarPath({ path })` → upserts `profiles.avatar_path`. Returns refreshed signed URL.
- `removeAvatar()` → deletes object from `avatars` bucket and clears `avatar_path`.

Upload itself happens directly from the browser using `supabase.storage.from('avatars').upload(...)` so progress/size stays client-side; storage RLS enforces the per-user folder. After a successful upload the client calls `setAvatarPath`.

## 4. Route: `/profile` (`src/routes/_authenticated/profile.tsx`)

- `beforeLoad` gates on `supabase.auth.getUser()` (per TanStack/Supabase guidance) so the bearer token is hydrated before the loader.
- `loader` calls `getMyProfile`.
- Renders inside `PageLayout`. Minimal porcelain card:
  - Eyebrow "Account", serif heading "Your profile".
  - Avatar block (left): 96px square, ink border, signed-URL image or initials fallback (`displayName`/`email` first letter, serif, ink on porcelain).
  - Right column: name + email (read-only for now), and actions:
    - `Upload photo` (or `Replace photo` when avatar exists) — opens hidden `<input type=file accept="image/png,image/jpeg,image/webp">`.
    - `Remove photo` (only when avatar exists), quiet underline button.
  - Status row under actions: uploading spinner + filename, success toast via existing `sonner`, calm inline error copy on failure.
- Client-side validation before upload:
  - MIME in allow-list.
  - Size ≤ 5 MB.
  - On reject, inline message ("Use a JPG, PNG, or WebP under 5 MB.").

Visual rules: reuse `bg-background` (porcelain), `text-foreground` (ink), `border-border`, no shadows, no gradients, `font-serif` for headings, `eyebrow` class for labels. No avatar inside a colored badge — keep it like an editorial portrait frame.

## 5. Authenticated chrome touch-ups

- `PageLayout` dropdown trigger: when `getMyProfile` returns an avatar URL, swap the initial-letter circle for the actual image; keep initials as fallback. Pull this through a lightweight `useProfile` query (TanStack Query) keyed `['me','profile']` and `router.invalidate()` won't be needed — invalidate the query after upload/remove.
- Add `Profile` item in the dropdown above `Sign out`, linking to `/profile`.

## 6. Out of scope (explicit)

- Editing display name / email / notifications.
- Public avatar URLs or sharing.
- Server-side image processing / cropping.
- Migrating the existing localStorage setup state into the profile row.

## Files

New
- `src/routes/_authenticated/profile.tsx`
- `src/lib/profile.functions.ts`
- `src/components/profile/AvatarBlock.tsx` (avatar + initials fallback)
- `src/hooks/use-profile.ts` (TanStack Query wrapper for header use)

Edited
- `src/components/PageLayout.tsx` (avatar in trigger, Profile link)

Migrations
- `profiles` table + RLS + new-user trigger + `updated_at` trigger
- `avatars` storage bucket + RLS policies

## Verification

- Sign in → `/profile`: shows initials, no avatar.
- Upload a 200KB JPG → preview updates, signed URL renders, header avatar updates.
- Refresh `/profile`: avatar persists.
- Upload 10 MB file → blocked client-side with inline message; no network call.
- Upload a `.txt` renamed `.jpg` → MIME-checked client-side; storage MIME allow-list backstop.
- In a second browser as user B, attempting to PUT to `avatars/{userA}/profile.jpg` fails with 403 (RLS).
- `Remove photo` → object deleted, `avatar_path` cleared, fallback returns.
