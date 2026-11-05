import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Customer } from '@/api/types'
import { formatMoney } from '@/lib/format'
import DailyLimitCard from './DailyLimitCard'

const customer: Customer = {
  id: 'customer',
  firstName: 'Ava',
  lastName: 'Chen',
  email: 'ava@example.com',
  segment: 'retail',
  dailyTransferLimit: 5000,
  transferredToday: 1250,
}

describe('DailyLimitCard', () => {
  it('starts full and decreases with the remaining proportion and describes the actual currency values', () => {
    const view = render(<DailyLimitCard customer={{ ...customer, transferredToday: 0 }} />)
    const bar = screen.getByRole('progressbar', { name: 'Daily transfer limit remaining' })
    expect(bar).toHaveAttribute('value', '100')
    view.rerender(<DailyLimitCard customer={customer} />)
    expect(bar).toHaveAttribute('value', '75')
    expect(bar).toHaveAttribute('max', '100')
    expect(bar).toHaveAttribute(
      'aria-valuetext',
      `${formatMoney(3750)} of ${formatMoney(5000)} remaining`,
    )
    view.rerender(<DailyLimitCard customer={{ ...customer, transferredToday: 5000 }} />)
    expect(bar).toHaveAttribute('value', '0')
  })

  it('handles a zero limit without division by zero', () => {
    render(
      <DailyLimitCard customer={{ ...customer, dailyTransferLimit: 0, transferredToday: 0 }} />,
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
  })

  it('does not announce fabricated progress while customer data is loading', () => {
    render(<DailyLimitCard />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
