# Mock API

**You don't need to touch this folder.** The app, the tests and your deployed
site already use these handlers through MSW. The full contract is in
[`../brief/api-contract.md`](../brief/api-contract.md).

| File | What it is |
| --- | --- |
| `handlers.ts` | MSW handlers (used in the browser and in Vitest) |
| `db.json` | Seed data |
| `server.mjs` | Optional Node server with the same behaviour, for `curl` debugging |

Don't edit these to make your UI or tests pass. Override a response inside a
test instead (see the contract).

## Seed data

- Customer: Ava Chen, Retail, daily limit SGD 5,000, nothing used yet.
- Accounts: Everyday Checking `4,280.55`, Savings Plus `12,840.00`,
  Rewards Card `-420.30`. Total available: **SGD 17,120.55**.
- 15 transactions (the dashboard shows the newest 8).
- 4 payees: Jamie Tan, Marcus Lee, Priya Nair, Mum.

## Optional: Node server

```bash
npm run mock                         # http://localhost:4010
PORT=4011 node mock-api/server.mjs   # another port

curl http://localhost:4010/api/accounts
curl "http://localhost:4010/api/transactions?limit=2&q=grab"
curl "http://localhost:4010/api/accounts?scenario=error"
curl -X POST http://localhost:4010/api/transfers \
  -H 'content-type: application/json' \
  -d '{"fromAccountId":"acc_checking","payeeId":"pay_001","amount":120,"note":"Dinner"}'
curl -X POST http://localhost:4010/api/__reset   # restore the seed data
```

To point the app at it instead of MSW, add this to `vite.config.ts`:

```ts
server: { proxy: { '/api': 'http://localhost:4010' } }
```

This only works in `npm run dev`. Your deployed site must use MSW.
