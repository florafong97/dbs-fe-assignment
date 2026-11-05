import { describe, expect, it } from 'vitest'
import { formatMoney, formatShortDate } from './format'

describe('formatMoney', () => {
  it('uses the SGD code and two decimals', () => {
    expect(formatMoney(4280.55)).toBe('SGD 4,280.55')
    expect(formatMoney(12840)).toBe('SGD 12,840.00')
    expect(formatMoney(-420.3)).toBe('-SGD 420.30')
  })
})

describe('formatShortDate', () => {
  it('formats in Singapore time regardless of the runner timezone', () => {
    // 00:15 UTC on 18 Oct — would read 17 Oct in the Americas.
    expect(formatShortDate('2026-10-18T08:15:00+08:00')).toBe('18 Oct')
  })
})
