# Project context and agent instructions

## Source lookup

- Before implementing a feature, consult the relevant sections of `brief/`: `brief/candidate-brief.md` (the specification) and `brief/api-contract.md`, plus `wireframes/wireframe.md` as needed. Do not reread unrelated files.
- Use `brief/design-tokens.css` for visual tokens and usage notes; it is already imported by `src/index.css`. Consult `DEPLOYMENT.md` for hosting and `mock-api/README.md` only for optional Node-server debugging.
- Preserve exact UI copy and validation messages from the specification §3–4; use source references below for details rather than inventing requirements. Document reasonable decisions about ambiguities in the submission README.

## Before implementation

- Current workflow: do not write new tests or modify existing tests until the user asks to resume test work. Keep existing tests; verify changes with lint, typecheck, build and relevant manual checks. The assignment's test requirements below remain deferred submission obligations.

Before implementing each feature, present a concise proposal covering:

- Implementation plan and approach.
- Proposed state management: server, form and UI state ownership, including derived state.
- Component breakdown and responsibilities.
- Any new libraries to introduce and why; explicitly state if none are needed.
- Ordered, incremental implementation steps, including relevant verification.

## Overview and scope

- Build Meridian Banking's signed-in, single-page experience for Ava Chen: accounts/transactions dashboard, three-step transfer dialog, light/dark themes and Retail (blue)/Premium (crimson) branding.
- Required: all specification §3 features/states, responsive layout, validation, at least three behaviour tests, deployment and submission README. Replace the starter placeholder; use supplied API data, not invented data. No real backend, login or routing.
- Out of scope: Cards/Payments/Insights pages (show disabled header links), charts, notifications, payee management, transaction details, other currencies and translations.
- Optional only: daily-limit progress bar, discard confirmation, debug menu, balance hiding, third segment, `#transfer` deep link, E2E test, CI, date line and another-transfer action. Suggested component names are not prescribed.

## Stack and architecture

- Formatting: use Prettier (`npm run format`; verify with `npm run format:check`). Follow `.prettierrc.json` and `.editorconfig`; respect `.prettierignore` for generated and supplied mock files. ESLint checks code quality, not formatting.
- `@/` is the only alias and maps to `src/`; keep TypeScript, Vite and Vitest aligned. Imports outside `src/` stay relative. Do not relocate files just to change import spelling.

- Starter: Node 22, React 19, strict TypeScript, Vite, TanStack Query, React Hook Form, Zod, MSW and Vitest. No `any`.
- Use TanStack Query or equivalent for server loading/errors/cache/refresh, and React Hook Form + Zod or equivalent for forms. Additional libraries are allowed with an explained rationale in README.
- Keep requests in a typed API layer using `src/api/client.ts` (`apiFetch`/`ApiError`) and `src/api/types.ts`; components must not call `fetch` directly.
- Do not copy API data into component/global state, fetch in effects with custom loading flags, store derivable totals, or duplicate validation rules. Folder/component organization is discretionary and assessed.
- `src/App.tsx` is replaceable placeholder UI. `src/lib/format.ts` supplies required money/date formatters. `src/test/setup.ts` starts MSW and resets data per test.
- Do not edit mock data or handlers in `src/mocks/` or `mock-api/` to make features/tests pass. Override responses within individual tests instead. MSW must work in browser, tests and deployment; the Node server is optional. In-memory data resets on reload, as intended.
- Icons: `lucide-react` or inline SVG. Basic component-library primitives are allowed; ready-made dashboard templates are not.

## Functional requirements

### Dashboard — spec §3.1, API contract

- Fetch customer, accounts and transactions (`limit=8`) concurrently; render stable skeletons. Handle loading, empty and error states with retry.
- Header: Meridian logo, exact `Good evening, Ava`, segment switch, theme toggle and `AC` avatar; no time-dependent greeting.
- Derive total from deposit accounts only (initially SGD 17,120.55); caption `Across 2 deposit accounts`. Show all three account names, masked numbers and balances; credit is negative with `Amount due`.
- Show eight newest transactions, descending by date, with description/category/date/amount and pending chip. Incoming amounts have `+` and positive colour; outgoing amounts use `-` and normal text colour.
- Search description OR category, case-insensitively; display match count and clear action. Local filtering of loaded rows or API `q` is allowed; explain choice. Use exact no-match and dashboard-error copy (§4).
- Display remaining daily limit derived from `dailyTransferLimit - transferredToday`; progress bar is optional.

### Transfer — spec §3.2–3.3, API contract

- `New transfer` opens desktop centred dialog (≥1024px), mobile full-screen sheet, with Recipient → Amount → Review stepper. Move focus inside; Esc/close dismiss; restore trigger focus.
- Recipient: searchable API payees (all four, keyboard operable), or `Send to someone new` disclosure for name/account/bank.
- Amount: checking/savings only, amount input, presets 50/100/250/500, available balance, remaining daily limit, optional note with 50-character counter.
- Review: from-account, recipient name/masked number/bank, amount, zero fee, total and note. Back retains entries. Send only on `Confirm transfer`.
- POST exactly one of `payeeId` or `recipient`, with from-account, amount and optional note. Never reconstruct full saved-payee numbers. Disable duplicate sends and show `Sending…`; requests are not idempotent.
- Success only after API success: amount, recipient, API reference, required arrival copy and dashboard-return action. Refresh customer/accounts/transactions via query invalidation or cache updates, including balance, new transaction and remaining limit, before returning; no page reload. Explain refresh strategy.
- Failure: retain review data, announce error, allow retry; never show success. Map API `fields` errors to inputs and API `message` to alert banner; see copy ambiguity below.
- Define validation once for inline and submit: new name 2–50 chars; account exactly 8 digits; bank required (API additionally requires 2–30 chars); amount required, ≥1.00, ≤2 decimals, ≤available balance and ≤remaining limit; note ≤50 chars. Use actual balance/limit in prescribed messages. Validate on blur and Continue; focus first invalid input.

## Non-functional and visual requirements

- Tokens only for component colours; no hard-coded colours. Use token typography, spacing, shape and effects; system font, 8px spacing scale, cards padded 16–24px. Do not copy token definitions.
- Set `data-theme` and `data-segment` on `<html>`. Restore persisted choices before first paint to avoid theme flash; first-visit theme follows system. Segment defaults from customer and is a local persisted override, with no API mutation; changes branding only. Toggle instantly in all four combinations.
- Label all inputs/toggles (or use `aria-pressed` for toggles); visible focus, WCAG AA text contrast in all themes, field errors linked with `aria-describedby`, send errors `role="alert"`, success `aria-live`. Respect reduced motion; theme colour transitions only on shell (token usage notes).
- Responsive down to 360px; breakpoints 640/1024px. Desktop max width 1200px, 24px gutters, main column plus 300px rail. Mobile one column, 16px gutters, no horizontal page overflow, ≥44px tap targets, fixed bottom transfer CTA above safe area. Account row may scroll horizontally; mobile dialog footer stays at bottom; amount input uses decimal input mode.
- Use `formatMoney` and `formatShortDate` (Singapore time); add incoming `+` explicitly. Use tabular numerals for large amounts/account numbers. Tests compare formatter output because SGD uses a non-breaking space.
- Loading must avoid layout jumps; API normally delays ~500ms. No additional numeric performance targets or security requirements are specified. Preserve masked account presentation and supplied API validation/error handling.

## Validation, evaluation and delivery

- Minimum behaviour tests: over-balance error sends no request; successful transfer shows success and updates dashboard; dashboard request failure shows error and Retry recovers.
- `npm run check` (lint/typecheck/tests) and `npm run build` must pass before submission; no console errors in successful flows. CI is optional. Use `npm test` or `npm run test:watch` during development.
- Error/empty/slow demo hooks and transfer `#fail` are documented in API contract; use only for tests/demos, never normal app logic. No permanent main-UI break button. Explain how deployed loading/empty/error states can be seen.
- Deliver public repository and deployed URL (Netlify/Vercel/Cloudflare Pages), working end to end without local server; reply to invitation email with both URLs. Replace README at submission with required outline: name/deployed/local run, structure, decisions/trade-offs, states, tests, AI use, known issues.
- Disclose AI tools/purposes and 2–3 examples of changes/rejections/fixes to AI output. Evaluation covers deployed flows, structure, deliberate decisions, meaningful tests, README and ability to explain/trace/modify code live without AI (~45-minute follow-up). Prefer an understandable working core; record incomplete work.
- Submission deadline: within two weeks of receiving assignment; expected effort 8–12 hours. If substantially over, submit and list gaps.
