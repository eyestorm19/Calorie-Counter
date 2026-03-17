# CSS Refactor Summary

## 1. Duplicated selectors found

See **CSS_REFACTOR_DUPLICATES.md** for the full list. Summary:

- **.card** — Two blocks (one partial, one full). Merged into one with `backdrop-filter` kept.
- **main** — Two blocks. Merged into one (flex, padding moved into first block; second removed).
- **.activities-list** — Two blocks. Added `overflow-x: hidden` to first; removed second.
- **.calorie-value** — Base block already had `white-space: nowrap`; removed redundant second block.
- **.activity-details**, **.activity-name**, **.activity-time** — Duplicate block in “Progress Bar Responsive” removed; first block kept and `align-items: flex-start` / `margin-left: 0` kept in canonical rules.
- **.weekly-chart** — Two blocks. Merged (position, width, max-height added to first); second block removed.
- **.edit-button**, **.submit-button**, **.cancel-button**, **.save-button** — Duplicate “Profile page styles” block (~100 lines) removed. Base and context overrides (e.g. `.profile-header .edit-button`, `.activity-actions .edit-button`) kept; profile-specific `.inline-edit-input` rules (type="number", type="select", select) moved into the main Profile section.
- **.profile-info**, **.profile-header**, **.profile-content**, **.profile-field**, **.field-label**, **.field-value**, **.inline-edit-input**, **.profile-actions** — Same duplicate “Profile page styles” block removed; one canonical set kept.
- **.net-calories** — Left as two usages (summary stats vs header) with different font-size/weight; no structural duplicate.
- **.development-badge** — Three conflicting blocks. Kept first (flex, center, amber/yellow); removed second (position absolute, red) and third (gold, “Development Mode Badge”).
- **.note** — Two blocks. Merged into one (vars for color/border); second removed.
- **.calorie-detail.consumed/burned .detail-value** — Colors aligned with summary row: `#dc2626` and `#16a34a`.

## 2. Other changes

- **Undefined variables** — Replaced `var(--light-gray)` with `var(--border-color)` and `var(--dark-text)` with `var(--text-color)` in Help section (no new variables added).
- **Section labels** — Added `/* ========== Section Name ========== */` for: Reset & Base, Navbar, Landing Page, App Layout, Auth, Track/Dashboard, Profile, Chat, Help Page, Buttons (shared), Footer & Misc.

## 3. What was removed or consolidated

- **Removed:** One partial `.card` block; one `main` block; one `.activities-list` block; one `.calorie-value` block; one `.weekly-chart` block; duplicate `.activity-details` / `.activity-name` / `.activity-time` block; entire “Profile page styles” block (~100 lines) with duplicate profile and button rules; two `.development-badge` blocks; one `.note` block.
- **Consolidated:** All duplicate selector definitions above merged into a single canonical rule per selector (or per context, e.g. base + `.activity-actions` overrides). Consumed/burned colors unified to `#dc2626` / `#16a34a` where applicable.
- **Preserved:** Visual appearance and behavior; no new colors, shadows, radii, or spacing beyond existing vars. Only one pre-existing lint remains (background-clip at line 66).

No UI redesign; cleanup only.
