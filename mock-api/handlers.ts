/**
 * MSW handlers for the Meridian mock API.
 *
 * Already wired: `src/mocks/handlers.ts` re-exports these for the browser
 * worker and for tests. Don't copy them. Contract: brief/api-contract.md.
 *
 * The behaviour mirrors mock-api/server.mjs. State is in memory and resets on
 * page reload, or when `resetMockDb()` is called in tests.
 */
import { http, HttpResponse, delay } from 'msw'
import seed from './db.json'

export type Segment = 'retail' | 'premium'
export type AccountType = 'checking' | 'savings' | 'credit'
export type TransactionDirection = 'in' | 'out'
export type TransactionStatus = 'posted' | 'pending'

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  segment: Segment
  dailyTransferLimit: number
  transferredToday: number
}

export interface Account {
  id: string
  name: string
  type: AccountType
  maskedNumber: string
  balance: number
  currency: 'SGD'
}

export interface Transaction {
  id: string
  accountId: string
  date: string
  description: string
  category: string
  direction: TransactionDirection
  amount: number
  status: TransactionStatus
}

export interface Payee {
  id: string
  name: string
  bank: string
  accountNumberMasked: string
  initials: string
  lastUsedAt: string
}

interface PayeeRecord extends Omit<Payee, 'accountNumberMasked'> {
  accountNumber: string
}

interface Db {
  customer: Customer
  accounts: Account[]
  transactions: Transaction[]
  payees: PayeeRecord[]
}

type JsonObject = Record<string, unknown>

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const SEED = seed as unknown as Db

let db: Db = clone(SEED)
let txnCounter = 0

/** Restores seed data. Call in `beforeEach` when reusing handlers in tests. */
export function resetMockDb(): void {
  db = clone(SEED)
  txnCounter = 0
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const mask = (accountNumber: string) => `•••• ${String(accountNumber).slice(-4)}`

const money = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
})
const formatMoney = (n: number) => money.format(n)

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function makeReference() {
  let out = ''
  for (let i = 0; i < 6; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `TRF-${out}`
}

function publicPayee(payee: PayeeRecord): Payee {
  return {
    id: payee.id,
    name: payee.name,
    bank: payee.bank,
    accountNumberMasked: mask(payee.accountNumber),
    initials: payee.initials,
    lastUsedAt: payee.lastUsedAt,
  }
}

interface ErrorExtra {
  fields?: Record<string, string>
  meta?: Record<string, unknown>
}

function jsonError(
  status: number,
  code: string,
  message: string,
  extra: ErrorExtra = {},
) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

async function wait(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get('delay') ?? 500)
  const ms = Number.isFinite(raw)
    ? Math.min(5000, Math.max(0, Math.trunc(raw)))
    : 500
  await delay(ms)
}

function scenario(request: Request) {
  return new URL(request.url).searchParams.get('scenario')
}

export const handlers = [
  http.get('*/api/health', async ({ request }) => {
    await wait(request)
    if (scenario(request) === 'error') {
      return jsonError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
    }
    return HttpResponse.json({ ok: true })
  }),

  http.get('*/api/customer', async ({ request }) => {
    await wait(request)
    if (scenario(request) === 'error') {
      return jsonError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
    }
    return HttpResponse.json({ customer: db.customer })
  }),

  http.get('*/api/accounts', async ({ request }) => {
    await wait(request)
    if (scenario(request) === 'error') {
      return jsonError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
    }
    const accounts = scenario(request) === 'empty' ? [] : db.accounts
    return HttpResponse.json({ accounts })
  }),

  http.get('*/api/transactions', async ({ request }) => {
    await wait(request)
    if (scenario(request) === 'error') {
      return jsonError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
    }
    if (scenario(request) === 'empty') {
      return HttpResponse.json({ transactions: [], total: 0 })
    }

    const url = new URL(request.url)
    const accountId = url.searchParams.get('accountId') ?? 'all'
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const direction = url.searchParams.get('direction')

    let items = db.transactions.filter(
      (txn) => accountId === 'all' || txn.accountId === accountId,
    )
    if (q) {
      items = items.filter(
        (txn) =>
          txn.description.toLowerCase().includes(q) ||
          txn.category.toLowerCase().includes(q),
      )
    }
    if (direction === 'in' || direction === 'out') {
      items = items.filter((txn) => txn.direction === direction)
    }

    items = [...items].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    const requestedLimit = Number(url.searchParams.get('limit') ?? 20)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(50, Math.max(1, Math.trunc(requestedLimit)))
      : 20

    return HttpResponse.json({
      transactions: items.slice(0, limit),
      total: items.length,
    })
  }),

  http.get('*/api/payees', async ({ request }) => {
    await wait(request)
    if (scenario(request) === 'error') {
      return jsonError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
    }
    const payees =
      scenario(request) === 'empty'
        ? []
        : [...db.payees]
            .sort(
              (a, b) =>
                new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
            )
            .map(publicPayee)
    return HttpResponse.json({ payees })
  }),

  http.post('*/api/transfers', async ({ request }) => {
    await wait(request)

    let body: JsonObject | null = null
    try {
      body = (await request.json()) as JsonObject
    } catch {
      return jsonError(400, 'INVALID_JSON', 'Request body must be valid JSON.')
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return jsonError(400, 'INVALID_JSON', 'Request body must be a JSON object.')
    }

    const fields: Record<string, string> = {}
    const fromAccountId =
      typeof body.fromAccountId === 'string' ? body.fromAccountId : ''
    const from = db.accounts.find((account) => account.id === fromAccountId)

    if (!fromAccountId) {
      fields.fromAccountId = 'Choose an account to transfer from.'
    } else if (!from) {
      fields.fromAccountId = 'Account not found.'
    } else if (from.type === 'credit') {
      fields.fromAccountId = 'Transfers can only be made from a deposit account.'
    }

    const rawAmount = body.amount
    const amount = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount

    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      fields.amount = 'Enter an amount.'
    } else if (amount < 1) {
      fields.amount = 'Enter an amount of at least SGD 1.00.'
    } else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
      fields.amount = 'Use at most 2 decimal places.'
    }

    const note =
      body.note === undefined || body.note === null || body.note === ''
        ? null
        : String(body.note)
    if (note !== null && note.length > 50) {
      fields.note = 'Keep the note to 50 characters or fewer.'
    }

    const hasPayee = typeof body.payeeId === 'string' && body.payeeId.length > 0
    const rawRecipient =
      typeof body.recipient === 'object' && body.recipient !== null
        ? (body.recipient as JsonObject)
        : null
    const hasRecipient = rawRecipient !== null

    let recipient: { name: string; bank: string; accountNumber: string } | null = null

    if (hasPayee === hasRecipient) {
      fields.payeeId =
        'Provide either a saved payee or new recipient details, not both.'
    } else if (hasPayee) {
      const payee = db.payees.find((item) => item.id === body.payeeId)
      if (!payee) {
        fields.payeeId = 'Payee not found.'
      } else {
        recipient = {
          name: payee.name,
          bank: payee.bank,
          accountNumber: payee.accountNumber,
        }
      }
    } else if (rawRecipient) {
      const name = typeof rawRecipient.name === 'string' ? rawRecipient.name.trim() : ''
      const accountNumber =
        typeof rawRecipient.accountNumber === 'string'
          ? rawRecipient.accountNumber.trim()
          : ''
      const bank = typeof rawRecipient.bank === 'string' ? rawRecipient.bank.trim() : ''

      if (name.length < 2 || name.length > 50) {
        fields['recipient.name'] = 'Enter a recipient name (2–50 characters).'
      }
      if (!/^\d{8}$/.test(accountNumber)) {
        fields['recipient.accountNumber'] = 'Enter a valid 8-digit account number.'
      }
      if (bank.length < 2 || bank.length > 30) {
        fields['recipient.bank'] = 'Choose a bank.'
      }
      recipient = { name, bank, accountNumber }
    }

    if (Object.keys(fields).length > 0) {
      return jsonError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
        fields,
      })
    }
    if (!from || !recipient || typeof amount !== 'number') {
      return jsonError(500, 'INTERNAL_ERROR', 'Unexpected transfer state.')
    }

    if (amount > from.balance) {
      return jsonError(422, 'INSUFFICIENT_FUNDS', 'Amount exceeds available balance.', {
        fields: {
          amount: `Amount can't be more than your available balance (${formatMoney(from.balance)}).`,
        },
        meta: { available: from.balance },
      })
    }

    const limit = db.customer.dailyTransferLimit
    const remaining = round2(limit - db.customer.transferredToday)
    if (amount > remaining) {
      return jsonError(422, 'DAILY_LIMIT_EXCEEDED', 'Amount exceeds remaining daily limit.', {
        fields: {
          amount: `This transfer exceeds your remaining daily limit (${formatMoney(remaining)}).`,
        },
        meta: { limit, used: db.customer.transferredToday, remaining },
      })
    }

    if (note !== null && note.includes('#fail')) {
      return jsonError(
        500,
        'INTERNAL_ERROR',
        "Something went wrong. Your money hasn't left your account.",
      )
    }

    const transferAmount = round2(amount)
    from.balance = round2(from.balance - transferAmount)
    db.customer.transferredToday = round2(
      db.customer.transferredToday + transferAmount,
    )

    const createdAt = new Date().toISOString()
    const transfer = {
      id: `trf_${Date.now().toString(36)}`,
      reference: makeReference(),
      status: 'completed' as const,
      fromAccountId: from.id,
      recipient: {
        name: recipient.name,
        bank: recipient.bank,
        accountNumberMasked: mask(recipient.accountNumber),
      },
      amount: transferAmount,
      fee: 0,
      currency: 'SGD' as const,
      note,
      createdAt,
    }

    txnCounter += 1
    db.transactions.unshift({
      id: `txn_${Date.now()}_${txnCounter}`,
      accountId: from.id,
      date: createdAt,
      description: `Transfer to ${recipient.name}`,
      category: 'transfer',
      direction: 'out',
      amount: transferAmount,
      status: 'posted',
    })

    return HttpResponse.json(
      {
        transfer,
        account: { id: from.id, balance: from.balance },
        dailyLimit: {
          limit,
          used: db.customer.transferredToday,
          remaining: round2(limit - db.customer.transferredToday),
        },
      },
      { status: 201 },
    )
  }),

  http.post('*/api/__reset', async () => {
    resetMockDb()
    return HttpResponse.json({ ok: true })
  }),
]
