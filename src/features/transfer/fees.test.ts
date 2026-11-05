import { expect, it } from 'vitest'
import { calculateTransferTotal } from './fees'

it('defaults to the configured zero fee', () => {
  expect(calculateTransferTotal(120.3)).toBe(120.3)
})

it.each([
  [120.3, 1.25, 121.55],
  [1.1, 0.2, 1.3],
  [99.95, 0.3, 100.25],
])('adds amount %s and fee %s in cents to produce %s', (amount, fee, expected) => {
  expect(calculateTransferTotal(amount, fee)).toBe(expected)
})
