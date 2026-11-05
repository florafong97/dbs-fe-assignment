import { describe, expect, it } from 'vitest'
import type { Account } from '@/api/types'
import { formatMoney } from '@/lib/format'
import { createTransferSchema } from './schema'
import type { TransferFormValues } from './schema'

const accounts: Account[] = [
  {
    id: 'checking',
    name: 'Checking',
    type: 'checking',
    maskedNumber: '•••• 1234',
    balance: 100.25,
    currency: 'SGD',
  },
  {
    id: 'savings',
    name: 'Savings',
    type: 'savings',
    maskedNumber: '•••• 5678',
    balance: 1000,
    currency: 'SGD',
  },
  {
    id: 'credit',
    name: 'Credit',
    type: 'credit',
    maskedNumber: '•••• 9012',
    balance: -50,
    currency: 'SGD',
  },
]
const values: TransferFormValues = {
  recipientMode: 'saved',
  payeeId: 'payee-1',
  recipient: { name: '', accountNumber: '', bank: '' },
  fromAccountId: 'checking',
  amount: '10.00',
  note: '',
}
const schema = createTransferSchema(accounts, 500)

function issues(input: TransferFormValues, limit = 500) {
  const result = createTransferSchema(accounts, limit).safeParse(input)
  expect(result.success).toBe(false)
  if (result.success) throw new Error('Expected validation to fail')
  return result.error.issues
}

describe('transfer validation', () => {
  it('accepts saved payees without validating inactive new-recipient fields', () => {
    expect(schema.safeParse(values).success).toBe(true)
  })

  it('requires a payee in saved mode even when valid new-recipient details remain', () => {
    const errors = issues({
      ...values,
      payeeId: '',
      recipient: { name: 'Alex Lim', accountNumber: '00123456', bank: 'DBS' },
    })
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['payeeId'] })]))
  })

  it('accepts new recipients without a saved payee and preserves account-number leading zeros', () => {
    const result = schema.parse({
      ...values,
      recipientMode: 'new',
      payeeId: '',
      recipient: { name: 'Alex Lim', accountNumber: '00123456', bank: 'DBS' },
    })
    expect(result.recipient.accountNumber).toBe('00123456')
  })

  it.each(['1234567', '123456789', '1234abcd'])(
    'rejects account number %s with the prescribed field error',
    (accountNumber) => {
      const errors = issues({
        ...values,
        recipientMode: 'new',
        recipient: { name: 'Alex Lim', accountNumber, bank: 'DBS' },
      })
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['recipient', 'accountNumber'],
            message: 'Enter a valid 8-digit account number.',
          }),
        ]),
      )
    },
  )

  it.each([
    ['name', 'A'],
    ['name', 'A'.repeat(51)],
    ['bank', ''],
    ['bank', 'A'],
    ['bank', 'A'.repeat(31)],
  ] as const)('rejects an invalid new-recipient %s', (field, value) => {
    const errors = issues({
      ...values,
      recipientMode: 'new',
      recipient: { name: 'Alex Lim', accountNumber: '12345678', bank: 'DBS', [field]: value },
    })
    expect(errors.some((issue) => issue.path.join('.') === `recipient.${field}`)).toBe(true)
  })

  it('accepts recipient lengths exactly at their bounds', () => {
    for (const name of ['Al', 'A'.repeat(50)]) {
      for (const bank of ['AB', 'B'.repeat(30)]) {
        expect(
          schema.safeParse({
            ...values,
            recipientMode: 'new',
            recipient: { name, bank, accountNumber: '12345678' },
          }).success,
        ).toBe(true)
      }
    }
  })

  it.each(['', '0', '0.99', '-1', '1.001', 'NaN', '1e2'])('rejects invalid amount %j', (amount) => {
    expect(issues({ ...values, amount }).some((issue) => issue.path.join('.') === 'amount')).toBe(
      true,
    )
  })

  it('accepts the minimum and exact balance, but rejects one cent above it', () => {
    expect(schema.safeParse({ ...values, amount: '1.00' }).success).toBe(true)
    expect(schema.safeParse({ ...values, amount: '100.25' }).success).toBe(true)
    expect(issues({ ...values, amount: '100.26' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['amount'],
          message: `Amount can't be more than your available balance (${formatMoney(100.25)}).`,
        }),
      ]),
    )
  })

  it('accepts the remaining limit, rejects one cent above it, and handles an exhausted limit', () => {
    const limited = createTransferSchema(accounts, 20.5)
    expect(limited.safeParse({ ...values, amount: '20.50' }).success).toBe(true)
    expect(issues({ ...values, amount: '20.51' }, 20.5)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['amount'],
          message: `This transfer exceeds your remaining daily limit (${formatMoney(20.5)}).`,
        }),
      ]),
    )
    expect(issues({ ...values, amount: '1.00' }, 0)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['amount'],
          message: `This transfer exceeds your remaining daily limit (${formatMoney(0)}).`,
        }),
      ]),
    )
  })

  it('validates against the selected account instead of always using checking', () => {
    expect(
      schema.safeParse({ ...values, fromAccountId: 'savings', amount: '200.00' }).success,
    ).toBe(true)
    expect(
      schema.safeParse({ ...values, fromAccountId: 'checking', amount: '200.00' }).success,
    ).toBe(false)
  })

  it.each(['', 'unknown', 'credit'])('rejects ineligible source account %j', (fromAccountId) => {
    expect(
      issues({ ...values, fromAccountId }).some(
        (issue) => issue.path.join('.') === 'fromAccountId',
      ),
    ).toBe(true)
  })

  it('accepts a 50-character note and rejects 51 characters', () => {
    expect(schema.safeParse({ ...values, note: 'A'.repeat(50) }).success).toBe(true)
    expect(
      issues({ ...values, note: 'A'.repeat(51) }).some((issue) => issue.path.join('.') === 'note'),
    ).toBe(true)
  })
})
