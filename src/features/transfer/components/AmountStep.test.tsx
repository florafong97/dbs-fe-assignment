import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Account } from '@/api/types'
import { formatMoney } from '@/lib/format'
import { createTransferSchema } from '../schema'
import type { TransferFormValues } from '../schema'
import AmountStep from './AmountStep'

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
    balance: 500.5,
    currency: 'SGD',
  },
  {
    id: 'credit',
    name: 'Credit',
    type: 'credit',
    maskedNumber: '•••• 9012',
    balance: -20,
    currency: 'SGD',
  },
]

function AmountForm() {
  const form = useForm<TransferFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(createTransferSchema(accounts, 200)),
    defaultValues: {
      recipientMode: 'saved',
      payeeId: 'saved',
      recipient: { name: '', accountNumber: '', bank: '' },
      fromAccountId: 'checking',
      amount: '',
      note: '',
    },
  })
  return (
    <form>
      <AmountStep form={form} accounts={accounts} remainingDailyLimit={200} />
    </form>
  )
}

const money = (value: number) => formatMoney(value).replace(/\u00a0/g, ' ')

describe('AmountStep', () => {
  it('offers only deposit accounts and displays the selected balance and remaining limit', async () => {
    const user = userEvent.setup()
    render(<AmountForm />)
    const account = screen.getByRole('combobox', { name: 'From account' })
    expect(account).toHaveValue('checking')
    expect(screen.queryByRole('option', { name: /Credit/ })).not.toBeInTheDocument()
    expect(screen.getByText(`Available ${money(100.25)}`)).toBeInTheDocument()
    expect(screen.getByText(`Remaining daily limit ${money(200)}`)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveAttribute('inputmode', 'decimal')
    await user.selectOptions(account, 'savings')
    expect(screen.getByText(`Available ${money(500.5)}`)).toBeInTheDocument()
  })

  it('validates presets immediately and clears an over-limit error when a valid preset is chosen', async () => {
    const user = userEvent.setup()
    render(<AmountForm />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'From account' }), 'savings')
    await user.click(screen.getByRole('button', { name: '250' }))
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('250.00')
    expect(
      await screen.findByText(`This transfer exceeds your remaining daily limit (${money(200)}).`),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '50' }))
    await waitFor(() => expect(screen.queryByText(/This transfer exceeds/)).not.toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('50.00')
    expect(screen.getByRole('button', { name: '50' })).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([
    ['5', '5.00'],
    ['5.3', '5.30'],
    ['5.35', '5.35'],
  ])('formats %s as %s on blur without interrupting typing', async (input, formatted) => {
    const user = userEvent.setup()
    render(<AmountForm />)
    const amount = screen.getByRole('textbox', { name: 'Amount' })
    await user.type(amount, input)
    expect(amount).toHaveValue(input)
    expect(amount).toHaveFocus()
    await user.tab()
    expect(amount).toHaveValue(formatted)
    await waitFor(() => expect(amount).toHaveAttribute('aria-invalid', 'false'))
  })

  it('blocks a third decimal digit and still allows deletion and empty-field validation', async () => {
    const user = userEvent.setup()
    render(<AmountForm />)
    const amount = screen.getByRole('textbox', { name: 'Amount' })
    await user.type(amount, '5.333')
    expect(amount).toHaveValue('5.33')
    await user.keyboard('{Backspace}')
    expect(amount).toHaveValue('5.3')
    await user.keyboard('7')
    expect(amount).toHaveValue('5.37')
    await user.clear(amount)
    await user.tab()
    expect(amount).toHaveValue('')
    expect(await screen.findByText('Enter an amount.')).toBeInTheDocument()
  })

  it('rejects over-precision pastes and permits replacing selected decimal digits', async () => {
    const user = userEvent.setup()
    render(<AmountForm />)
    const amount = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement
    await user.type(amount, '5.33')
    amount.setSelectionRange(2, 4)
    await user.keyboard('98')
    expect(amount).toHaveValue('5.98')
    amount.select()
    await user.paste('9.876')
    expect(amount).toHaveValue('5.98')
    amount.select()
    await user.paste('9.8')
    expect(amount).toHaveValue('9.8')
    await user.tab()
    expect(amount).toHaveValue('9.80')
  })

  it('counts note characters, validates on blur and clears an error during correction', async () => {
    const user = userEvent.setup()
    render(<AmountForm />)
    const note = screen.getByRole('textbox', { name: 'Note (optional)' })
    expect(screen.getByText('0/50')).toBeInTheDocument()
    await user.type(note, 'A'.repeat(51))
    expect(screen.getByText('51/50')).toBeInTheDocument()
    expect(screen.queryByText('Keep the note to 50 characters or fewer.')).not.toBeInTheDocument()
    await user.tab()
    expect(await screen.findByText('Keep the note to 50 characters or fewer.')).toBeInTheDocument()
    expect(note).toHaveAccessibleDescription(/Keep the note to 50 characters or fewer/)
    await user.click(note)
    await user.keyboard('{End}{Backspace}')
    await waitFor(() =>
      expect(
        screen.queryByText('Keep the note to 50 characters or fewer.'),
      ).not.toBeInTheDocument(),
    )
    expect(note).toHaveFocus()
    expect(screen.getByText('50/50')).toBeInTheDocument()
  })
})
