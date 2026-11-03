# Meridian — Low-fidelity wireframe

Plain layout reference only. **No visual design is prescribed here.** Colour,
type, spacing, and component styling come from `design-tokens.css`.

- Desktop: 1280px+, 12-column grid, content max 1200px, right rail 300px.
- Mobile: 390px, 16px gutters, single column, sticky bottom CTA.
- Transfer: centred dialog on desktop (520px), full-screen sheet on mobile.
- Everything on one page; the transfer is a dialog, not a route.

---

## 1. Desktop dashboard

```
MERIDIAN — DESKTOP DASHBOARD (1280px+)
================================================================================

[ HEADER ]
  M  Meridian    Overview   Cards   Payments   Insights      Retail | Premium   [◐]  [AC]
  (nav items other than Overview are non-functional / out of scope)

[ MAIN — 2 columns: content 1fr / rail 300px ]
  LEFT
    Good evening, Ava
    Tuesday, 20 October            (optional date line)
    ----------------------------------------------------------------------
    TOTAL AVAILABLE                                        [ + New transfer ]
    SGD 17,120.55
    Across 2 deposit accounts
    ----------------------------------------------------------------------
    ACCOUNTS
    [ Checking  •••• 4821   SGD 4,280.55  ]
    [ Savings   •••• 9930   SGD 12,840.00 ]
    [ Credit    •••• 7712   -SGD 420.30   Amount due ]
    ----------------------------------------------------------------------
    RECENT TRANSACTIONS                          [ Search transactions ]
    FairPrice Finest   Groceries · 19 Oct                  -SGD 86.40
    Grab               Transport · 19 Oct                  -SGD 14.20   Pending
    Kopitiam Corner    Dining · 18 Oct                     -SGD 6.80
    Spotify            Subscriptions · 17 Oct              -SGD 10.98
    PayNow from Marcus Lee  Transfer · 16 Oct              +SGD 45.00
    Salary — Northwind Labs  Income · 15 Oct               +SGD 3,200.00
    SP Group           Bills · 14 Oct                      -SGD 92.15
    Uniqlo             Shopping · 13 Oct                   -SGD 59.90
    (8 newest, sorted by date descending)

  RIGHT
    [ DAILY LIMIT ]
      SGD 5,000.00 remaining today
      [ progress bar ]
      Resets daily. Applies to all transfers.
```

Notes:

- Structure matters more than the exact card styling.
- Total = checking + savings only; credit is shown as money owed.
- Search filters description or category.

---

## 2. Mobile dashboard

```
MERIDIAN — MOBILE DASHBOARD (390px)
==================================

[ HEADER ]
  M  Meridian                              [◐]  [AC]

  Good evening, Ava
  Tuesday, 20 October     (optional)
  [ Retail | Premium ]    (place it wherever fits on mobile)

  [ TOTAL AVAILABLE ]
    SGD 17,120.55
    Across 2 deposit accounts

  ACCOUNTS                  (horizontal scroll or stacked)
  [ Checking  •••• 4821 ]  [ Savings  •••• 9930 ]  ...

  RECENT TRANSACTIONS
  [ Search transactions                  ]
  --------------------------------------------------
  FairPrice Finest   Groceries · 19 Oct    -SGD 86.40
  --------------------------------------------------
  Grab               Transport · 19 Oct    -SGD 14.20
  --------------------------------------------------
  Kopitiam Corner    Dining · 18 Oct       -SGD 6.80
  --------------------------------------------------

[ STICKY BOTTOM CTA ]
  [ + New transfer ]
```

Notes:

- No horizontal scroll on the page itself; only the account row may scroll.
- Tap targets at least 44px.
- The CTA stays above the safe area.

---

## 3. Transfer — step 1: recipient

```
TRANSFER DIALOG (desktop, 520px) — STEP 1 OF 3
========================================================
        +----------------------------------------------+
        | New transfer                          [ × ]  |
        | 1 Recipient  ·  2 Amount  ·  3 Review        |
        +----------------------------------------------+
        | Who are you sending to?                      |
        | [ Search payees                            ] |
        |                                              |
        | ( ) JT  Jamie Tan    DBS · •••• 3391     >   |
        | (•) ML  Marcus Lee   OCBC · •••• 2240    >   |
        | ( ) PN  Priya Nair   UOB · •••• 1174     >   |
        |                                              |
        | + Send to someone new                    >   |
        |   expands to:                                |
        |   [ Recipient name                         ] |
        |   [ Account number (8 digits)              ] |
        |   [ Bank (select)                          ] |
        +----------------------------------------------+
        | [ Cancel ]                    [ Continue ]   |
        +----------------------------------------------+
        (dashboard visible behind, dimmed)
```

Notes:

- Payees come from `GET /api/payees`.
- "Send to someone new" is a disclosure, not a new screen.
- Mobile: same content in a full-screen sheet; footer sticks to the bottom.
- The fourth payee (Mum) is cut off here for space; show all of them.

---

## 4. Transfer — step 2: amount

```
STEP 2 OF 3 — AMOUNT
========================================================
        +----------------------------------------------+
        | New transfer                          [ × ]  |
        | 1 Recipient  ·  2 Amount  ·  3 Review        |
        +----------------------------------------------+
        | How much?                                    |
        |                                              |
        | From account                                 |
        | [ Everyday Checking · •••• 4821          ⌄ ] |
        |   Deposit accounts only                      |
        |                                              |
        | Amount                                       |
        | [ SGD   120.00                             ] |
        | [ 50 ]  [ 100 ]  [ 250 ]  [ 500 ]            |
        | Available SGD 4,280.55                       |
        | Remaining daily limit SGD 5,000.00           |
        |                                              |
        | Note (optional)                      6/50    |
        | [ Dinner                                   ] |
        +----------------------------------------------+
        | [ ← Back ]                    [ Continue ]   |
        +----------------------------------------------+
```

Notes:

- Amount: required, ≥ 1.00, max 2 decimals, ≤ balance, ≤ remaining daily limit.
- Show errors under the field; focus the first invalid field on submit.
- Mobile: `inputMode="decimal"`, footer above the safe area.

---

## 5. Transfer — step 3: review

```
STEP 3 OF 3 — REVIEW
========================================================
        +----------------------------------------------+
        | New transfer                          [ × ]  |
        | 1 Recipient  ·  2 Amount  ·  3 Review        |
        +----------------------------------------------+
        | Check the details                            |
        |                                              |
        | From      Everyday Checking · •••• 4821      |
        | To        Jamie Tan · DBS · •••• 3391        |
        | Amount    SGD 120.00                         |
        | Fee       SGD 0.00                           |
        | Note      Dinner                             |
        | -------------------------------------------- |
        | Total     SGD 120.00                         |
        |                                              |
        | i  Usually arrives in minutes.               |
        +----------------------------------------------+
        | [ ← Back ]               [ Confirm transfer ] |
        +----------------------------------------------+
```

Notes:

- Nothing is sent until Confirm.
- Confirm is disabled and reads "Sending…" while the request is in flight.
- On failure, stay here and show the error; keep all data.

---

## 6. Transfer — success

```
AFTER 201 CREATED
========================================================
        +----------------------------------------------+
        |                                              |
        |                    ( ✓ )                     |
        |                Transfer sent                 |
        |                                              |
        |                SGD 120.00                    |
        |        to Jamie Tan · DBS · •••• 3391        |
        |                                              |
        |   Reference   TRF-7QK2M9                     |
        |                                              |
        |   The money should arrive within minutes.    |
        |                                              |
        |   [ Back to dashboard ]                      |
        |   [ Make another transfer ]   (optional)     |
        +----------------------------------------------+
```

Notes:

- Reference comes from the API response.
- Dashboard balances and transactions refresh before returning.

---

## 7. Required states (text only)

Implement these; they are not separate screens.

| Area | States |
| --- | --- |
| Dashboard | loading (skeleton), loaded, request error + Retry |
| Transactions | results, no search matches + Clear search |
| Transfer step 1 | payee list, no payees, new-recipient fields, field errors |
| Transfer step 2 | field errors (amount, note), over balance, over daily limit |
| Transfer step 3 | idle, submitting, API error + retry |
| Success | reference shown, dashboard refreshed |

The requirements themselves are in `brief/candidate-brief.md` §3.
