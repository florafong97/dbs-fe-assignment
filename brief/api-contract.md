# Mock API contract

The app calls `/api/...`. In the browser, in tests and on your deployed site,
these requests are answered by MSW using the handlers in
`mock-api/handlers.ts`. This is already set up; you don't need to configure
anything.

Use `apiFetch` from `src/api/client.ts` and the types in `src/api/types.ts`.
Keep API calls in a typed layer; components shouldn't call `fetch` directly.

## Conventions

- JSON in and out. Money is a number in SGD with up to 2 decimals.
- Dates are ISO 8601 strings. Show them in Singapore time (`formatShortDate`
  in `src/lib/format.ts` does this).
- Every response takes ~500 ms.
- Errors always have this shape (thrown as `ApiError` by `apiFetch`):

```ts
interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string> // field name -> message for that field
    meta?: Record<string, unknown>  // e.g. available balance, limit
  }
}
```

- The API never returns a full account number. Saved payees only have a
  masked number; to pay one, send its `payeeId`.

## Endpoints

`GET /api/health` returns `{ "ok": true }`. Only the placeholder screen uses it.

### `GET /api/customer`

```json
{
  "customer": {
    "id": "cus_001",
    "firstName": "Ava",
    "lastName": "Chen",
    "email": "ava.chen@example.com",
    "segment": "retail",
    "dailyTransferLimit": 5000,
    "transferredToday": 0
  }
}
```

`segment` is her default. The Retail/Premium switch in the UI can override it
locally; there's no API call for that.

Remaining daily limit = `dailyTransferLimit - transferredToday`.

### `GET /api/accounts`

```json
{
  "accounts": [
    { "id": "acc_checking", "name": "Everyday Checking", "type": "checking", "maskedNumber": "•••• 4821", "balance": 4280.55, "currency": "SGD" },
    { "id": "acc_savings",  "name": "Savings Plus",      "type": "savings",  "maskedNumber": "•••• 9930", "balance": 12840,   "currency": "SGD" },
    { "id": "acc_credit",   "name": "Rewards Card",      "type": "credit",   "maskedNumber": "•••• 7712", "balance": -420.3,  "currency": "SGD" }
  ]
}
```

Total available = accounts where `type !== 'credit'` → `17120.55`.

### `GET /api/transactions`

| Query param | Values | Default | |
| --- | --- | --- | --- |
| `limit` | 1–50 | `20` | The dashboard uses `limit=8` |
| `q` | text | — | Matches description **or** category, ignoring case |
| `accountId` | `all` or an account id | `all` | |
| `direction` | `in` or `out` | — | |

Newest first.

```json
{
  "transactions": [
    {
      "id": "txn_2001",
      "accountId": "acc_checking",
      "date": "2026-10-19T18:42:00+08:00",
      "description": "FairPrice Finest",
      "category": "groceries",
      "direction": "out",
      "amount": 86.4,
      "status": "posted"
    }
  ],
  "total": 15
}
```

`amount` is always positive; `direction` says whether money came in or went
out. `total` is the number of matches before `limit` is applied.

Dashboard search (D6) can filter the 8 loaded rows in the browser or use `q` —
either is fine. Say which you chose and why.

### `GET /api/payees`

```json
{
  "payees": [
    {
      "id": "pay_001",
      "name": "Jamie Tan",
      "bank": "DBS",
      "accountNumberMasked": "•••• 3391",
      "initials": "JT",
      "lastUsedAt": "2026-10-19T09:10:00+08:00"
    }
  ]
}
```

Most recently used first. There are 4 payees.

### `POST /api/transfers`

Send **either** `payeeId` (saved payee) **or** `recipient` (someone new) — not
both.

```json
{ "fromAccountId": "acc_checking", "payeeId": "pay_001", "amount": 120, "note": "Dinner" }
```

```json
{
  "fromAccountId": "acc_checking",
  "amount": 120,
  "note": "Dinner",
  "recipient": { "name": "Alex Lim", "accountNumber": "12345678", "bank": "OCBC" }
}
```

Success — **201**:

```json
{
  "transfer": {
    "id": "trf_01JB2K9Q",
    "reference": "TRF-7QK2M9",
    "status": "completed",
    "fromAccountId": "acc_checking",
    "recipient": { "name": "Jamie Tan", "bank": "DBS", "accountNumberMasked": "•••• 3391" },
    "amount": 120,
    "fee": 0,
    "currency": "SGD",
    "note": "Dinner",
    "createdAt": "2026-10-20T10:15:00.000Z"
  },
  "account": { "id": "acc_checking", "balance": 4160.55 },
  "dailyLimit": { "limit": 5000, "used": 120, "remaining": 4880 }
}
```

What changes on the server: the account balance goes down, a new transaction
is added, and `transferredToday` goes up. Sending the same request twice sends
the money twice, so make sure the button can't be pressed twice.

Afterwards, refresh customer, accounts and transactions — either invalidate
those queries or update the cache from the response. Both are fine; explain
your choice.

## Errors

| When | Status | `code` | `fields` key |
| --- | --- | --- | --- |
| Body isn't valid JSON | 400 | `INVALID_JSON` | — |
| Missing/unknown `fromAccountId`, or it's the credit card | 400 | `VALIDATION_ERROR` | `fromAccountId` |
| Not exactly one of `payeeId` / `recipient`, or unknown payee | 400 | `VALIDATION_ERROR` | `payeeId` |
| `recipient.name` not 2–50 chars | 400 | `VALIDATION_ERROR` | `recipient.name` |
| `recipient.accountNumber` not 8 digits | 400 | `VALIDATION_ERROR` | `recipient.accountNumber` |
| `recipient.bank` not 2–30 chars | 400 | `VALIDATION_ERROR` | `recipient.bank` |
| `amount` below 1.00 or more than 2 decimals | 400 | `VALIDATION_ERROR` | `amount` |
| `note` over 50 chars | 400 | `VALIDATION_ERROR` | `note` |
| `amount` more than the account balance | 422 | `INSUFFICIENT_FUNDS` | `amount` |
| `amount` more than the remaining daily limit | 422 | `DAILY_LIMIT_EXCEEDED` | `amount` |
| Note contains `#fail` (test hook) | 500 | `INTERNAL_ERROR` | — |

Example:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Amount exceeds available balance.",
    "fields": { "amount": "Amount can't be more than your available balance (SGD 4,280.55)." },
    "meta": { "available": 4280.55 }
  }
}
```

Your form should catch these before sending. If the API still rejects a
request, show `fields.amount` (etc.) under the field and `message` in a
`role="alert"` banner.

## Test and demo hooks

Use these to see your error, empty and loading states. Don't use them in
normal app logic.

| Hook | Effect |
| --- | --- |
| `?scenario=error` on any GET | 500 `INTERNAL_ERROR` |
| `?scenario=empty` on a list GET | Empty list |
| `?delay=1500` | Slower response (max 5000 ms) |
| Note contains `#fail` | Transfer fails with 500; no money moves |

To show the dashboard error on your deployed site, add `?scenario=error` to
the requests — for example from an optional debug menu. Don't put a permanent
"break the app" button in the main UI.

## Tests

`src/test/setup.ts` starts the mock API for Vitest and resets the data before
every test, so tests don't affect each other.

To test an edge case, override one response inside the test:

```ts
import { http, HttpResponse } from 'msw'
import { server } from '../test/setup' // adjust the path to your test file

server.use(
  http.get('*/api/accounts', () =>
    HttpResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Down' } },
      { status: 500 },
    ),
  ),
)
```

The override only lasts for that test.

## Optional: Node server

`npm run mock` runs the same API on `http://localhost:4010` for `curl`
debugging. You don't need it. See [`mock-api/README.md`](../mock-api/README.md).
