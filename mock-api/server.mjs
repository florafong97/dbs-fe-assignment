#!/usr/bin/env node
/**
 * Meridian mock API — zero dependencies, Node 18+.
 *
 *   node mock-api/server.mjs
 *   PORT=4011 node mock-api/server.mjs
 *
 * State is in memory and resets on restart. See README.md for hooks.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT || 4010)
const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED = JSON.parse(readFileSync(join(__dirname, 'db.json'), 'utf8'))

const clone = (value) => JSON.parse(JSON.stringify(value))
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
const mask = (accountNumber) => `•••• ${String(accountNumber).slice(-4)}`

const money = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
})
const formatMoney = (n) => money.format(n)

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function makeReference() {
  let out = ''
  for (let i = 0; i < 6; i += 1) {
    out += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)]
  }
  return `TRF-${out}`
}

let db = clone(SEED)
let txnCounter = 0

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

function send(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
    ...CORS,
  })
  res.end(payload)
}

function fail(res, status, code, message, extra = {}) {
  send(res, status, { error: { code, message, ...extra } })
}

function publicPayee(payee) {
  return {
    id: payee.id,
    name: payee.name,
    bank: payee.bank,
    accountNumberMasked: mask(payee.accountNumber),
    initials: payee.initials,
    lastUsedAt: payee.lastUsedAt,
  }
}

async function readJson(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function getDelay(url) {
  const raw = Number(url.searchParams.get('delay') ?? 500)
  if (!Number.isFinite(raw)) return 500
  return Math.min(5000, Math.max(0, Math.trunc(raw)))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const server = createServer(async (req, res) => {
  const started = Date.now()
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const method = req.method ?? 'GET'

  if (method === 'OPTIONS') {
    res.writeHead(204, CORS)
    res.end()
    return
  }

  await sleep(getDelay(url))

  const scenario = url.searchParams.get('scenario')
  if (method === 'GET' && scenario === 'error') {
    return fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
  }

  try {
    if (method === 'GET' && path === '/api/health') {
      return send(res, 200, { ok: true })
    }

    if (method === 'GET' && path === '/api/customer') {
      return send(res, 200, { customer: db.customer })
    }

    if (method === 'GET' && path === '/api/accounts') {
      const accounts = scenario === 'empty' ? [] : db.accounts
      return send(res, 200, { accounts })
    }

    if (method === 'GET' && path === '/api/transactions') {
      if (scenario === 'empty') {
        return send(res, 200, { transactions: [], total: 0 })
      }

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

      items = [...items].sort((a, b) => new Date(b.date) - new Date(a.date))

      const requestedLimit = Number(url.searchParams.get('limit') ?? 20)
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(50, Math.max(1, Math.trunc(requestedLimit)))
        : 20

      return send(res, 200, {
        transactions: items.slice(0, limit),
        total: items.length,
      })
    }

    if (method === 'GET' && path === '/api/payees') {
      const payees =
        scenario === 'empty'
          ? []
          : [...db.payees]
              .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))
              .map(publicPayee)
      return send(res, 200, { payees })
    }

    if (method === 'POST' && path === '/api/transfers') {
      let body
      try {
        body = await readJson(req)
      } catch {
        return fail(res, 400, 'INVALID_JSON', 'Request body must be valid JSON.')
      }
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return fail(res, 400, 'INVALID_JSON', 'Request body must be a JSON object.')
      }

      const fields = {}
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

      const amount =
        typeof body.amount === 'string' ? Number(body.amount) : body.amount
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
      const hasRecipient =
        typeof body.recipient === 'object' && body.recipient !== null

      let recipient = null
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
      } else {
        const input = body.recipient ?? {}
        const name = typeof input.name === 'string' ? input.name.trim() : ''
        const accountNumber =
          typeof input.accountNumber === 'string' ? input.accountNumber.trim() : ''
        const bank = typeof input.bank === 'string' ? input.bank.trim() : ''

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
        return fail(res, 400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', {
          fields,
        })
      }

      if (amount > from.balance) {
        return fail(res, 422, 'INSUFFICIENT_FUNDS', 'Amount exceeds available balance.', {
          fields: {
            amount: `Amount can't be more than your available balance (${formatMoney(from.balance)}).`,
          },
          meta: { available: from.balance },
        })
      }

      const limit = db.customer.dailyTransferLimit
      const remaining = round2(limit - db.customer.transferredToday)
      if (amount > remaining) {
        return fail(
          res,
          422,
          'DAILY_LIMIT_EXCEEDED',
          'Amount exceeds remaining daily limit.',
          {
            fields: {
              amount: `This transfer exceeds your remaining daily limit (${formatMoney(remaining)}).`,
            },
            meta: {
              limit,
              used: db.customer.transferredToday,
              remaining,
            },
          },
        )
      }

      if (note !== null && note.includes('#fail')) {
        return fail(
          res,
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
        status: 'completed',
        fromAccountId: from.id,
        recipient: {
          name: recipient.name,
          bank: recipient.bank,
          accountNumberMasked: mask(recipient.accountNumber),
        },
        amount: transferAmount,
        fee: 0,
        currency: 'SGD',
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

      console.log(
        `[mock-api] transfer ${transfer.reference} ${formatMoney(transferAmount)} -> ${recipient.name}`,
      )

      return send(res, 201, {
        transfer,
        account: { id: from.id, balance: from.balance },
        dailyLimit: {
          limit,
          used: db.customer.transferredToday,
          remaining: round2(limit - db.customer.transferredToday),
        },
      })
    }

    if (method === 'POST' && path === '/api/__reset') {
      db = clone(SEED)
      txnCounter = 0
      console.log('[mock-api] state reset')
      return send(res, 200, { ok: true })
    }

    return fail(res, 404, 'NOT_FOUND', `No route for ${method} ${path}.`)
  } catch (error) {
    console.error('[mock-api] unhandled error', error)
    if (!res.headersSent) {
      return fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.')
    }
  } finally {
    if (process.env.LOG_REQUESTS === '1') {
      console.log(`[mock-api] ${method} ${path} ${res.statusCode} ${Date.now() - started}ms`)
    }
  }
})

server.listen(PORT, () => {
  console.log(`[mock-api] listening on http://localhost:${PORT}`)
  console.log('[mock-api] hooks: ?scenario=error | ?scenario=empty | ?delay=1500 | note "#fail" | POST /api/__reset')
})
