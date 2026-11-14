# Time Card Calculator

Single-page English time card tool. Vite, TypeScript and native DOM. Domain calculations are pure and shared by the page and all delivery formats.

## Local preview

Use Node 22 LTS. Run `npm ci`, then `npm run dev` and open the URL printed by Vite. To inspect the production output, run `SITE_URL=https://example.test npm run build`, then `npm run preview` and open http://localhost:4173. The example origin is a local validation value.

## Validation

Run `npm run typecheck`, `npm run test:unit`, `SITE_URL=https://example.test npm run build`, `npm run test:seo`, then `npm run test:e2e`. Install browsers with `npx playwright install chromium webkit`. Playwright tests use the built preview and cover both browsers. The mobile performance test uses Chromium CDP throttling.

## Cloudflare Workers

1. Connect this repository to a Cloudflare Workers project.
2. Set the build command to `npm run build` and deploy command to `npx wrangler deploy`.
3. Use Node 22. `wrangler.jsonc` configures `dist` as the static asset directory.
4. The build defaults to `https://hourscalculator.io`, the planned domain. Set the build environment variable `SITE_URL` to override it. Rebuild when the public domain changes so canonical, sitemap and robots use the correct origin.
5. Register the domain and bind it to the Worker in Cloudflare before using that address. Inspect the Workers deployment URL after deployment.

The app uses static files and browser storage. Name and time data enter a URL fragment only when the user creates a share snapshot. Anyone with that snapshot link can read its data. The app has no backend. Production publication and Git commits are outside this execution contract.

## Calculation model

Actual civil dates and integer clock minutes remain authoritative. Workday boundaries classify those records without shifting their actual start dates. Clock arithmetic does not compensate for daylight saving changes. Context dates around partial weeks must be completed or confirmed for a complete estimate. Display rounding preserves minutes and pay. Pay is rounded once to cents after rational minute weighting. This first version covers the approved standard weekly, daily and California rules.

## Workflows and entry pages

The default table editor and timeline update the same records. `/` starts with a biweekly Sunday-based hourly card. `/with-lunch` enables a 30-minute automatic deduction after 360 minutes, `/biweekly` starts biweekly, and `/decimal` puts decimal hours first. Existing drafts take priority on every entry page. Use Advanced settings to preview and confirm a preset change.

Choose hourly, daily (one billable day for positive net work), or fixed-period billing. Custom dates include both endpoints. Dates outside the displayed period remain stored. USD, EUR, GBP, CAD and AUD are pricing units without exchange-rate conversion. Add employees for independently calculated bills and a combined total. Turning multiple-employee display off retains other employees. New fixed-amount employees start with an empty amount.

Templates store rules and display defaults, excluding identity, actual entries, receipts and billing amounts. Read-only snapshots have dedicated CSV/print controls and preserve the local editing draft. Reviewers generate Approved or Changes requested receipt links, which senders import manually. Receipts bind snapshot content, show when the content has changed, and provide no authenticated identity or remote synchronization. Copy links into email manually.

The existing `time-card-v1` storage key is retained. Legacy v1 drafts and editable share links migrate on load to v2 single-employee cards. Failed imports preserve the original draft. Clear and employee deletion require confirmation. Share snapshots carry the complete settings and are readable by anyone holding their links.
