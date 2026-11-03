# Meridian Banking — Brief

This is the spec. Setup, submission and how we assess are in the
[README](../README.md).

## 1. What you're building

Meridian is a digital bank with two customer segments: **Retail** (blue) and
**Premium** (crimson). Build the signed-in experience for one customer,
**Ava Chen**:

1. A **dashboard** with her total balance, her three accounts and her recent
   transactions.
2. A **New transfer** dialog: choose a recipient → enter an amount → review →
   send. Then the dashboard shows the new balance.
3. **Light/dark mode** and a **Retail/Premium** switch that changes the brand
   colour.

It's one page. There is no login, no routing, and no real backend — the mock API
in the starter handles everything, including in your deployed site.

## 2. Scope

| | |
| --- | --- |
| **Required** | Everything in §3: dashboard, transfer flow, validation, loading/empty/error states, responsive layout, light/dark + Retail/Premium, 3 tests, deployment, README |
| **Optional** | Pick any if you have time; none are needed for a strong result. A daily-limit progress bar · `Discard this transfer?` confirmation when closing a half-filled dialog · a debug menu that triggers the error/empty states · a balance-hide toggle · a third segment · a `#transfer` deep link · one end-to-end test · a CI workflow you set up yourself (e.g. GitHub Actions running `npm run check` and `npm run build`) |
| **Out of scope** | Login, the Cards/Payments/Insights pages, charts, notifications, adding/editing payees, transaction detail, other currencies, translations |

The `Cards`, `Payments` and `Insights` links in the wireframe header are
decoration. Show them disabled; don't build those pages.

## 3. Requirements

The IDs (D1, T3…) are just there so you can refer to them in your README.

### 3.1 Dashboard

- **D1 — Loading.** Fetch the customer, the accounts and the transactions
  (`limit=8`) at the same time. Show skeleton placeholders while loading; the
  layout shouldn't jump when the data arrives.
- **D2 — Header.** Meridian logo, `Good evening, Ava`, Retail/Premium switch,
  light/dark toggle, `AC` avatar. Use the greeting as written; it doesn't
  need to change with the time of day.
- **D3 — Total available.** `SGD 17,120.55` = checking + savings. The credit
  card is **not** included. Caption: `Across 2 deposit accounts`.
- **D4 — Accounts.** Three cards with name, masked number and balance. The
  credit card shows `-SGD 420.30` and an `Amount due` label.
- **D5 — Recent transactions.** The 8 newest, newest first. Each row shows
  description, category, date (`18 Oct`), amount, and a `Pending` chip if
  `status === "pending"`. Money in: `+SGD 45.00` in the positive colour. Money
  out: `-SGD 86.40` in the normal text colour.
- **D6 — Search.** Filter the list by description **or** category,
  ignoring case. Show how many results match and a way to clear the search.
  No matches → `No transactions match your search.` with a `Clear search`
  button.
- **D7 — Error.** If loading the dashboard fails, show
  `We couldn't load your dashboard.` with a `Retry` button that fetches again.
  (To see it: add `?scenario=error` to the requests, or override the
  response in a test — see the [API contract](api-contract.md#test-and-demo-hooks).)
- **D8 — Mobile.** At 390 px wide: one column, 16 px side margins, no
  sideways page scrolling, `New transfer` button fixed at the bottom of the
  screen, tap targets at least 44 px.

### 3.2 Transfer

- **T1 — Dialog.** `New transfer` opens a centred dialog on desktop
  (≥ 1024 px) and a full-screen sheet on mobile. Focus moves into it, `Esc`
  and `✕` close it, and focus goes back to the button that opened it. A
  stepper shows `Recipient → Amount → Review`.
- **T2 — Step 1: Recipient.** `Who are you sending to?` List payees from the
  API with a search box. Either pick one, or choose `Send to someone new` and
  enter a name, an 8-digit account number and a bank.
- **T3 — Step 2: Amount.** `How much?` Choose the from-account (checking or
  savings only — not the credit card), enter an amount (or tap `50`, `100`,
  `250`, `500`), and add an optional note (max 50 characters, show a counter).
  Show the account's available balance and the remaining daily limit.
- **T4 — Step 3: Review.** `Check the details`. Show from-account, recipient
  (name, masked number, bank), amount, fee `SGD 0.00`, total, and note.
  `Back` keeps everything the user entered.
- **T5 — Send.** `Confirm transfer` sends `POST /api/transfers`. While it's
  sending, the button reads `Sending…` and can't be pressed again. On success,
  the dialog shows `Transfer sent`, the amount, the recipient, the reference
  from the API, and a `Back to dashboard` button.
- **T6 — Refresh.** After a successful transfer, the dashboard shows the new
  balance, the new transaction and the new remaining limit without reloading
  the page.
- **T7 — Failure.** If sending fails, stay on the review step with the data
  intact, show the error in an alert, and let the user try again. Never show
  success after a failure.
- **T8 — Accessibility.** Every input has a label. Field errors are linked to
  their input (`aria-describedby`). The send error uses `role="alert"`. The
  success message is announced (`aria-live`). The payee list works with a
  keyboard.

### 3.3 Validation

Define each rule **once** (e.g. one Zod schema) and use it for both
inline errors and submit.

| Field | Rule | Message |
| --- | --- | --- |
| New recipient name | 2–50 characters | your wording |
| Account number | exactly 8 digits | `Enter a valid 8-digit account number.` |
| Bank | required | your wording |
| Amount | required, at least `1.00`, at most 2 decimal places | your wording |
| Amount | not more than the account's balance | `Amount can't be more than your available balance (SGD 4,280.55).` |
| Amount | not more than the remaining daily limit | `This transfer exceeds your remaining daily limit (SGD 5,000.00).` |
| Note | max 50 characters | your wording |

The amounts in the messages are examples — show the real balance or limit. Check
fields when the user leaves them and when they press `Continue`. On
`Continue`, move focus to the first invalid field.

The API checks the same rules. If it rejects something anyway, show its
message (see the [API contract](api-contract.md#errors)).

### 3.4 Themes

- **TH1 — Light/dark.** The toggle switches instantly. On first visit, follow
  the system setting. Remember the choice (`localStorage`) and apply it before
  the page first paints, so there's no flash of the wrong theme on reload.
- **TH2 — Segment.** Retail/Premium changes only the brand colour, in both
  light and dark mode. Remember the choice. Only use the CSS variables from
  `design-tokens.css`; **no hard-coded colours in components**.
- **TH3 — Accessible.** Toggles have labels (or `aria-pressed`), focus is
  always visible, and text contrast meets WCAG AA in all four combinations.

Set both on the `<html>` element, and the tokens do the rest:

```html
<html data-theme="dark" data-segment="premium">
```

### 3.5 Engineering

- **E1 — Types.** TypeScript strict mode, real types for API data, no `any`
  (ESLint enforces this).
- **E2 — Server data.** Use TanStack Query (or an equivalent) for loading,
  errors, caching and refreshing after a transfer. Don't copy API data into
  `useState` or a global store.
- **E3 — Forms.** React Hook Form + Zod (or an equivalent), with each rule
  defined once (§3.3).
- **E4 — Tests.** At least these three, testing behaviour rather than
  implementation details:
  1. an amount over the balance shows the error and sends no request;
  2. a successful transfer shows the success screen and the dashboard updates;
  3. a failed dashboard request shows the error, and `Retry` loads it.
- **E5 — Quality.** `npm run check` and `npm run build` pass. (Running
  them in CI is optional — see §2.)
  No console errors when everything works.
- **E6 — Deployed.** The public URL works end to end with no local server.

**Avoid:** fetching in `useEffect` with your own loading flags, storing totals
you can calculate, hard-coded colours, and the same validation rule written in
two places.

## 4. Copy and formatting

Use this wording exactly; it keeps reviews comparable.

| Where | Text |
| --- | --- |
| Greeting | `Good evening, Ava` |
| Total | `Total available` / `Across 2 deposit accounts` |
| Main button | `New transfer` |
| Transactions | `Recent transactions` / search placeholder `Search transactions` |
| No search results | `No transactions match your search.` / `Clear search` |
| Dashboard error | `We couldn't load your dashboard.` / `Retry` |
| Dialog title | `New transfer` |
| Step titles | `Who are you sending to?` / `How much?` / `Check the details` |
| Buttons | `Continue` / `Back` / `Confirm transfer` / `Sending…` |
| Send error | `Something went wrong. Your money hasn't left your account. Try again.` |
| Success | `Transfer sent` / `The money should arrive within minutes.` / `Back to dashboard` |
| Discard (optional) | `Discard this transfer?` / `Keep editing` / `Discard` |

- **Money:** use `formatMoney` from `src/lib/format.ts` → `SGD 4,280.55`,
  `-SGD 420.30`. Add the `+` for money in yourself.
- **Dates:** use `formatShortDate` → `18 Oct`, always in Singapore time.
- **Numbers** in big amounts use `font-variant-numeric: tabular-nums`.

`Intl` puts a non-breaking space after `SGD`. In tests, compare against
`formatMoney(...)` instead of typing the string.

## 5. Layout and design

- **Desktop:** content max 1200 px wide, 24 px margins, main column + 300 px
  right column (for the daily limit).
- **Mobile:** 16 px margins, one column, `New transfer` fixed at the bottom.
  Put the Retail/Premium switch wherever it fits (e.g. under the greeting).
- **Breakpoints:** 640 px and 1024 px. Must work down to 360 px wide.
- **Spacing:** 8 px scale; cards have 16–24 px padding. System font.
- Everything visual comes from the tokens — see the usage notes at the bottom
  of [`design-tokens.css`](design-tokens.css).

**Suggested component list** (name them however you like):
`Header` · `SegmentSwitch` · `ThemeToggle` · `BalanceHero` · `AccountCard` ·
`TransactionList` · `SearchInput` · `TransferDialog` · `Stepper` ·
`PayeeOption` · `AmountField` · `ReviewSummary` · `SuccessPanel` · `Button` ·
`Skeleton` · `EmptyState` · `InlineError`.

Icons: `lucide-react` or inline SVG. A component library is fine for basic
pieces (dialog, select), but not a ready-made dashboard template.

## 6. The mock API

- It's already running: `npm run dev` and `fetch('/api/...')` works through
  MSW in the browser. The same handlers run in tests and on your deployed
  site.
- Responses take ~500 ms so you can see your loading states.
- Data lives in memory; a page refresh resets it. That's expected.
- **Don't change the mock data or handlers** to make something pass. Override
  a response inside a test instead.

Full details: [`api-contract.md`](api-contract.md).

## 7. FAQ

**How much time should I spend?** About 8–12 hours. If you're well past that,
stop, submit, and list what's missing in your README.

**What if I don't finish?** Submit anyway and say what's missing. A working
core you can explain beats a bigger app with gaps you can't account for.

**Can I use AI?** Yes. See [How we assess](../README.md#4-how-we-assess) — you'll
need to explain and change your code without it in the follow-up call.

**Do I need routing?** No.

**Can I add libraries?** Yes, if you can explain why. Say so in your README.

**Something in the brief is unclear.** Make a reasonable choice and write it
down in your README. That's a good signal, not a penalty. You can also reply to
the invitation email and ask.
