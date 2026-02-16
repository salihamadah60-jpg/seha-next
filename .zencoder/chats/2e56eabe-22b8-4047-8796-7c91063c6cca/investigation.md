# Investigation Report - CSS Changes Not Reflecting

## Bug Summary
Changes made to `src/app/data-display/page.module.css` do not appear in the user interface.

## Root Cause Analysis
The investigation revealed two primary reasons for this behavior:

1. **Web vs. PDF Confusion**: The application generates PDF reports using Puppeteer and Handlebars. These reports use a specific CSS file located at `lib/templates/table.css`. Changes made to `src/app/data-display/page.module.css` only affect the web view of the data-display page and have **no effect** on the generated PDF.
2. **CSS Modules Scoping**: The file `page.module.css` is a CSS Module. Next.js hashes class names (e.g., `.main` becomes `page_main__abc123`). If you are trying to target these elements from outside or if there's a misunderstanding of which page is being viewed (e.g., Admin Dashboard vs. Data Display), the styles won't apply as expected.
3. **Caching/Turbopack**: The project uses Turbopack (`--turbopack`). In some cases, HMR (Hot Module Replacement) might fail to refresh the styles in the browser, requiring a manual page refresh or a dev server restart.

## Affected Components
- `src/app/data-display/page.tsx`
- `src/app/data-display/page.module.css`
- `lib/templates/table.css` (The actual file used for PDF styling)

## Proposed Solution
If the goal is to change the appearance of the generated PDF report, edits should be made to `lib/templates/table.css` instead of `page.module.css`.
