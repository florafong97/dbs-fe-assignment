import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Account, Payee } from '@/api/types'
import { formatMoney } from '@/lib/format'
import type { TransferFormValues } from '../schema'
import ReviewStep from './ReviewStep'

const account: Account = {
  id: 'checking',
  name: 'Everyday Checking',
  type: 'checking',
  maskedNumber: '•••• 4821',
  balance: 4280.55,
  currency: 'SGD',
}
const payee: Payee = {
  id: 'jamie',
  name: 'Jamie Tan',
  bank: 'DBS',
  accountNumberMasked: '•••• 3391',
  initials: 'JT',
  lastUsedAt: '2026-10-19T09:10:00+08:00',
}
const values: TransferFormValues = {
  recipientMode: 'saved',
  payeeId: 'jamie',
  recipient: { name: '', accountNumber: '', bank: '' },
  fromAccountId: 'checking',
  amount: '120.30',
  note: 'Dinner',
}
const money = (amount: number) => formatMoney(amount).replace(/\u00a0/g, ' ')

function detail(label: string) {
  return screen.getByText(label, { selector: 'dt' }).parentElement!
}

describe('ReviewStep', () => {
  it('shows saved-payee details, selected account, formatted amount, zero fee, total and note', () => {
    render(<ReviewStep values={values} accounts={[account]} payees={[payee]} />)
    expect(detail('From')).toHaveTextContent('Everyday Checking · •••• 4821')
    expect(detail('To')).toHaveTextContent('Jamie Tan')
    expect(detail('To')).toHaveTextContent('DBS · •••• 3391')
    expect(detail('Amount')).toHaveTextContent(money(120.3))
    expect(detail('Fee')).toHaveTextContent(money(0))
    expect(detail('Total')).toHaveTextContent(money(120.3))
    expect(detail('Note')).toHaveTextContent('Dinner')
    expect(screen.getByText('Usually arrives in minutes.')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Transfer details' })).queryByRole('textbox'),
    ).not.toBeInTheDocument()
  })

  it('uses new-recipient details even when an inactive saved selection remains, and masks the full number', () => {
    const draft: TransferFormValues = {
      ...values,
      recipientMode: 'new',
      recipient: { name: 'Alex Lim', bank: 'OCBC', accountNumber: '00123456' },
    }
    const { container } = render(
      <ReviewStep values={draft} accounts={[account]} payees={[payee]} />,
    )
    expect(detail('To')).toHaveTextContent('Alex Lim')
    expect(detail('To')).toHaveTextContent('OCBC · •••• 3456')
    expect(container.textContent).not.toContain('00123456')
    expect(screen.queryByText('Jamie Tan')).not.toBeInTheDocument()
  })

  it('shows a dash when the optional note is empty', () => {
    render(<ReviewStep values={{ ...values, note: '' }} accounts={[account]} payees={[payee]} />)
    expect(detail('Note')).toHaveTextContent('—')
  })
})
