# Duplicate and Conflicting Selectors in index.css

## Duplicated selectors (same class, multiple rule blocks)

| Selector | Line(s) | Notes |
|----------|---------|--------|
| `.card` | 174, 213 | First block: background, backdrop-filter only. Second: full card styles. **Consolidate:** Single `.card` with all properties. |
| `main` | 153, 854 | First: position, z-index, background, max-width, margin, padding. Second: flex, padding. **Consolidate:** One `main` block. |
| `.activities-list` | 313, 1338 | First: margin, background, padding, border-radius, box-shadow. Second: overflow-x. **Consolidate:** Merge into one. |
| `.calorie-value` | 401, 1342 | First: full base styles. Second: white-space: nowrap. **Consolidate:** Add white-space to first block, remove second. |
| `.activity-details` | 373, 1432 | First: flex, flex-direction column, gap, flex, min-width, overflow. Second: same + align-items flex-start (slightly different). **Consolidate:** One block with full set. |
| `.activity-name` | 382, 1439 | First: full (font-weight, color, transition, overflow, etc.). Second: font-weight, color only. **Consolidate:** Keep first; second is redundant. |
| `.activity-time` | 396, 1444 | First: font-size, color. Second: font-size, color, margin-left: 0. **Consolidate:** One block. |
| `.weekly-chart` | 1111, 1307 | First: background, padding, border-radius, height. Second: position, width, max-height. **Consolidate:** One block. |
| `.edit-button` | 490–500 (group), 517, 1963 | Multiple base/context definitions. **Consolidate:** One base; keep context overrides (.activity-actions, .profile-header). Remove duplicate "Profile page styles" block. |
| `.delete-button` | 490–500, 527 | Base + standalone. **Keep** base group and standalone; no later duplicate. |
| `.submit-button` | 490–500, 537, 643, 1968 | Base, standalone, edit-actions override, Profile page duplicate. **Consolidate:** One base; keep .edit-actions and .profile-actions overrides; remove 1963–1986 duplicate block. |
| `.cancel-button` | 490–500, 547, 653, 1954, 1973 | Same pattern. **Consolidate:** Remove duplicate Profile page block. |
| `.save-button` | 834, 1968 | First: success color, hover. Second: #4CAF50, white (duplicate). **Consolidate:** Keep first; remove second. |
| `.profile-info` | 684, 1885 | Different padding/margin/box-shadow. **Consolidate:** One block; keep cascade (later block overrides for "Profile page styles" – merge into one with consistent vars). |
| `.profile-header` | 692, 1893 | Same structure, second has 20px margin. **Consolidate:** One block. |
| `.profile-content` | 786, 1900 | First: gap 1rem. Second: gap 15px. **Consolidate:** One block (use 1rem). |
| `.profile-field` | 792, 1906 | First: gap 1rem. Second: gap 10px. **Consolidate:** One block. |
| `.field-label` | 799, 1912 | First: min-width, font-weight, color. Second: font-weight 600, min-width. **Consolidate:** One block. |
| `.field-value` | 805, 1917 | First: color, font-weight. Second: color #666. **Consolidate:** Use var(--text-color). |
| `.inline-edit-input` | 810, 1921 | First: full. Second: padding 8px, border, border-radius, font-size 14px. **Consolidate:** One block; keep first, add any missing from second. |
| `.profile-actions` | 826, 1946 | First: gap 1rem, margin-top, padding-top, border-top. Second: gap 10px, margin-top 20px. **Consolidate:** One block. |
| `.net-calories` | 2438, 2556 | First: font-weight bold (summary stats). Second: font-size 2rem, font-weight 700, line-height (header). **Keep both:** Different contexts; use .summary-container .net-calories and .summary-main .net-calories or .header-summary .net-calories for the second. |
| `.development-badge` | 2710, 3226, 3351 | Three conflicting definitions (flex/center, position absolute/top, yellow/red/gold). **Consolidate:** One canonical; prefer the one actually used in app. |
| `.note` | 2881, 3068, 3216 | Two/three definitions. **Consolidate:** One .note block. |
| `.help-page code` | 2868 (in .help-card code), 2930 (`.help-page code`) | **Consolidate:** One rule under .help-page. |
| `.calorie-detail.consumed .detail-value` / `.summary-detail-row.consumed .detail-value` | 2640 vs 2585 | Red: #f44336 vs #dc2626. **Unify:** Use same color (e.g. var(--error-color) or #dc2626). |
| `.calorie-detail.burned .detail-value` / `.summary-detail-row.burned .detail-value` | 2644 vs 2589 | Green: #4CAF50 vs #16a34a. **Unify:** Use #16a34a or var(--success-color). |

## Undefined CSS variables (used in Help section)

- `var(--light-gray)` at 2857, 2955 → replace with `var(--border-color)`.
- `var(--dark-text)` at 2860, 3053, 3120 → replace with `var(--text-color)`.

## Sections to create (labels only; no reorder of cascade within sections)

1. **Reset & base** – *, body  
2. **Landing page** – .hero, .hero-content, .feature-list, .feature-grid, .feature-card, .benefits, .cta-section  
3. **Navbar** – .navbar, .navbar-brand, .navbar-menu, .navbar-end, .navbar-item, .logout-button  
4. **App layout** – main, .app, .container, .card  
5. **Auth** – .auth-container, .auth-cards, .auth-divider, .google-sign-in-button, .form-group, form, .error, .success  
6. **Track / dashboard** – .persistent-header, .header-summary, .summary-*, .activities-list, .activity-*, .calorie-*, .progress-*, .weekly-*, .marker, etc.  
7. **Profile** – .profile-info, .profile-header, .profile-content, .profile-field, .field-label, .field-value, .inline-edit-input, .profile-actions, .save-button  
8. **Chat** – .assistant-section, .chat-section, .chat-container, .chat-messages, .chat-message, .message-content, .chat-form, .chat-input-*, .chat-icon-button, etc.  
9. **Help page** – .help-page, .help-section, .help-card, .tab-*, .steps-list, .logging-method, etc.  
10. **Buttons (shared)** – .button, .actions, .edit-button, .delete-button, .submit-button, .cancel-button (base + context overrides)  
11. **Footer & misc** – .app-footer, .development-badge, .welcome-message, .ollama-toggle, etc.
