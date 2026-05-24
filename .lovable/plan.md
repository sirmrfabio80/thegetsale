Wrap the whole WatchlistCard in a Link to the brand detail page, matching the dashboard BrandCard pattern. Remove the now-redundant "View the read" and brand-name inline links. Ensure interactive child elements (checkbox in select mode, Remove button) call `stopPropagation` and `preventDefault` so they still function without triggering navigation.

Files: src/components/WatchlistCard.tsx

1. Replace the outer `<article>` with a `<Link>` (or wrap its content in one) pointing to `/brand/$id` with `params={{ id: brand.id }}`.
2. Remove the two internal `<Link>` elements: the brand name link and the "View the read" link. Keep the text as plain `<h3>` and a plain text CTA.
3. Add `e.stopPropagation(); e.preventDefault()` to the checkbox `onClick` wrapper (when selectable) and to the Remove button `onClick`, so clicks on these controls don't navigate.
4. Preserve all existing styling, hover states, and the orphan/no-brand fallback article.
5. Ensure the card is still keyboard-focusable via the Link and screen-reader friendly.