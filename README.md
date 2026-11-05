# Meridian Banking — Flora Fong

- Deployed: https://florafong-dbs-fe.vercel.app
- Run locally: `npm install && npm run dev`

## Project structure

| Path                                          | Responsibility                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                                 | Composes the header, dashboard and transfer dialog; owns dialog visibility, shared customer/account queries and preferences.  |
| `src/api/`                                    | Typed endpoint functions, `apiFetch`, API response types and `ApiError`.                                                      |
| `src/pages/dashboard/`                        | Dashboard layout, balances, accounts, daily limit and independent transaction search.                                         |
| `src/features/transfer/`                      | Dialog, step definitions, form workflow, Zod schema, payload conversion, fee calculations and submission/refresh mutations.   |
| `src/components/`                             | Shared Header, Button, Chip, FormField, SearchInput and Skeleton components with colocated CSS and tests.                     |
| `src/theme/`, `public/scripts/preferences.js` | Preference state/persistence and pre-paint restoration.                                                                       |
| `src/lib/format.ts`                           | Shared SGD and date formatting.                                                                                               |
| `src/test/`                                   | MSW lifecycle/reset setup and the native-dialog shim for jsdom. Tests are otherwise colocated with their features/components. |
| `src/mocks/`, `mock-api/`                     | Supplied mock handlers and seed data. The optional Node server is not required.                                               |
| `brief/`, `wireframes/`, `DEPLOYMENT.md`      | Requirements, API contract, design tokens, layout references and hosting instructions.                                        |

## Decisions and trade-offs

- **State ownership:** TanStack Query owns server data and caching. App fetches
  customer/accounts because the header, dashboard and transfer share them.
  Totals and remaining limits are derived from API data rather than stored.
- **Transaction search:** TransactionList owns its input and calls
  `useTransactionSearch`. The API's `q` parameter searches descriptions or
  categories across the full dataset, with a 300ms debounce and abort signals.
  Only the newest eight matches are displayed, alongside the API's total count.
  Clearing restores recent transactions. The API has no pagination endpoint.
- **Independent failures:** Customer/account failures show the dashboard error.
  Transaction failures stay in their section, leaving balances and New transfer
  usable. This deliberately narrows the brief's page-level error behavior and
  lets accounts render before transactions finish.
- **Forms and validation:** React Hook Form retains values across Back/Continue;
  Zod defines validation once using current balances and the remaining limit.
  Fields validate on blur/Continue and while correcting touched fields. Amounts
  gain two decimal places on blur, and typing beyond two decimals is blocked.
- **Theming:** Supplied CSS tokens cover Retail/Premium and light/dark. Theme
  follows the system initially; localStorage restores saved choices before
  paint. Segment defaults from the customer unless locally overridden, without
  mutating API data. Lucide React supplies icons.

## Loading, empty and error states

| State                    | Behavior / how to see it                                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial loading          | Reload the app. Supplied responses take about 500ms; balances, accounts, daily limit and transactions use skeletons.                                                                                       |
| Search loading           | Type a new transaction search. Loading stays within the transaction section and its input remains usable.                                                                                                  |
| No transaction matches   | Search for `no-such-transaction`; the prescribed message and Clear search action appear.                                                                                                                   |
| No payee matches         | Open New transfer and search for `no-such-payee`; clear the search or choose Send to someone new.                                                                                                          |
| Validation               | Continue without a recipient, enter more than the selected account balance, or select savings and exceed the remaining daily limit. Errors are linked to inputs; Continue focuses the first invalid field. |
| Transfer failure         | Put `#fail` in the optional note and confirm an otherwise valid transfer. The supplied API rejects it without moving money; review data remains available for retry/correction.                            |
| Successful transfer      | Complete a valid transfer. The success panel shows the API reference and the dashboard refreshes before returning.                                                                                         |
| Request/refresh failures | Dashboard, transactions and payees have Retry at their owning scope. A completed transfer has a separate Retry dashboard refresh action if its follow-up GETs fail.                                        |

The supplied GET hooks are `?scenario=error`, `?scenario=empty` on list requests
and `?delay=1500`. They belong on **API request URLs**, not the page URL. See the
[API contract](brief/api-contract.md#test-and-demo-hooks).

**TODO:** Add a reproducible deployed walkthrough for GET loading, empty and
error states. There is no permanent debug control in the main UI.

## Tests

```bash
npm test              # Vitest + React Testing Library + MSW
npm run test:watch    # watch mode
npm run check         # ESLint, TypeScript and tests
npm run build         # production output in dist/
npm run format:check  # Prettier check
```

The latest local `npm run check` passes all **114 tests**. The tests prioritize
user behavior and financial/state boundaries:

- **App:** concurrent requests, shared customer data, independent API failures,
  retry, dialog reopening/focus, duplicate-send protection, successful dashboard
  refresh and refresh recovery without another POST.
- **DashboardPage:** supplied account/customer rendering, deposit-only totals,
  remaining limits and page-level loading/error/transfer interactions.
- **TransactionList:** full-history search, request parameters, match counts,
  no matches, clearing, superseded requests, dates and amount direction.
- **Transfer:** recipient selection/new recipients, retained entries, presets,
  decimal input, insufficient balance, exhausted limits, note length, stale
  balances, API field errors, review details and fee arithmetic.
- **Shared components/themes:** labels and error descriptions, keyboard actions,
  disabled controls, preference persistence and pre-paint restoration.

MSW resets seed data between tests; edge cases override handlers within tests.

## AI use

I used **Codex with GPT-6.1**, using light reasoning for ideation, planning and
light implementation, and medium/high reasoning for heavier implementation.
Codex also assisted with tests, refactoring, code review and documentation.

Examples of changes I directed to the AI-generated implementation:

- **Reusable transfer feature:** I moved the dialog and related logic into
  `src/features/transfer/` so another page could trigger the same transfer flow
  without depending on the dashboard implementation.
- **Shared UI components:** I extracted FormField, SearchInput, Button and Chip
  to reuse their presentation and behavior across the app and keep styling
  consistent as more screens are added.
- **Separate transaction failures:** I kept transaction loading/errors within
  TransactionList, separate from customer/account failures. This separates
  concerns and keeps balances and the transfer action usable when transactions
  cannot load.
- **Amount formatting on blur:** I added automatic decimal formatting when the
  amount field loses focus, such as `5` becoming `5.00` and `5.3` becoming
  `5.30`. This keeps the displayed amount consistent without interrupting typing.

## Not done / known issues

- The supplied API always charges zero fee. Frontend calculations support a
  nonzero fee, but actual charging would require matching backend support.
- Bank options are temporarily hardcoded to DBS, OCBC, UOB and POSB because no bank catalogue endpoint is provided. An authoritative catalogue would replace these options in a production integration.
