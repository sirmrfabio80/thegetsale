## Add a review step to `/setup`

Insert a calm, editorial "04 — Review" section between Notifications and the "Start watching" CTA. It mirrors back the user's choices and offers one-click jumps back to each step for edits. No new route, no wizard chrome — keeps the single-page scroll flow.

### Layout

```
01 Houses
02 Categories
03 Notifications
04 Review        <-- new
[ Start watching ]
```

### Section structure

`StepHeader number="04" title="Review"` followed by three review blocks separated by hairline rules:

- **Houses** — count + chip list of selected house names. Right-aligned "Edit" link.
- **Categories** — count + chip list of selected categories. Right-aligned "Edit" link.
- **Notifications** — three lines, each label with its state ("On" / "Off") in muted ink. Right-aligned "Edit" link.

If a block is empty (e.g. no categories yet), show a muted hint like "None selected — pick at least one." instead of empty space.

Empty selections still let the user scroll the review; the bottom CTA remains disabled by the existing `valid` rule (≥3 houses, ≥1 category).

### "Edit" interaction

Each block's Edit control scrolls smoothly to the matching section. Implementation:

- Add stable IDs to existing sections: `id="step-houses"`, `id="step-categories"`, `id="step-notifications"`.
- Edit buttons are plain `<button>`s (not anchors — avoids history entries) that call `document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })`.
- Style: small uppercase tracked label matching the existing eyebrow treatment, with an underline on hover.

### New small component

`src/components/setup/ReviewRow.tsx` — bordered-top row with title, optional count, an Edit button, and children for the value display. Keeps `setup.tsx` readable and consistent with the other small setup components.

### Files

- Add: `src/components/setup/ReviewRow.tsx`
- Edit: `src/routes/setup.tsx`
  - Add `id`s to the three step sections.
  - Insert Step 04 Review section + `SectionRule` above the CTA row.
  - Reuse existing state — no new state, no storage changes.

### Out of scope

- No collapsing/hiding of earlier steps — the page stays one continuous scroll.
- No edit-in-place modals.
- No changes to validation rules or persistence (already handled).
- No changes to dashboard/watchlist/brand detail.