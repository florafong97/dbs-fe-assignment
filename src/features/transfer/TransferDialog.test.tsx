import { setupDialogMock } from '@/test/dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Account, Customer } from '@/api/types'
import { server } from '@/test/setup'
import { formatMoney } from '@/lib/format'
import seed from '../../../mock-api/db.json'
import TransferDialog from './TransferDialog'

setupDialogMock()

const clients: QueryClient[] = []
afterEach(() => {
  clients.forEach((client) => client.clear())
  clients.length = 0
})

function renderTransfer() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  clients.push(client)
  const onClose = vi.fn()
  const view = render(
    <QueryClientProvider client={client}>
      <TransferDialog
        accounts={seed.accounts as Account[]}
        customer={seed.customer as Customer}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return { ...view, client, onClose }
}

async function payeesLoaded() {
  await screen.findByRole('radio', { name: /Jamie Tan/ }, { timeout: 3000 })
}

async function enterNewRecipient(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Send to someone new' }))
  await user.type(screen.getByLabelText('Recipient name'), 'Alex Lim')
  await user.type(screen.getByLabelText('Account number (8 digits)'), '00123456')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Bank' }), 'OCBC')
}

async function reviewSavedTransfer(user: ReturnType<typeof userEvent.setup>) {
  await payeesLoaded()
  await user.click(screen.getByRole('radio', { name: /Jamie Tan/ }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.type(screen.getByRole('textbox', { name: 'Amount' }), '120')
  await user.type(screen.getByRole('textbox', { name: 'Note (optional)' }), 'Dinner')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByRole('heading', { name: 'Check the details' })
}

describe('transfer dialog dismissal', () => {
  it('opts into light dismissal and synchronizes a native close event', async () => {
    const { onClose } = renderTransfer()
    const dialog = screen.getByRole('dialog') as HTMLDialogElement
    expect(dialog).toHaveAttribute('closedby', 'any')
    // jsdom does not implement backdrop clicks or Escape. Both native paths
    // close the dialog and dispatch the same close event, modelled by the shim.
    await act(async () => dialog.close())
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.each(['Close transfer', 'Cancel'])('closes natively through %s', async (name) => {
    const user = userEvent.setup()
    const { onClose } = renderTransfer()
    const dialog = screen.getByRole('dialog') as HTMLDialogElement
    await user.click(screen.getByRole('button', { name }))
    expect(dialog.open).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('transfer recipient step', () => {
  it('scrolls the new-recipient form into view when opened, without scrolling on typing', async () => {
    const user = userEvent.setup()
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockClear()
    renderTransfer()
    const toggle = screen.getByRole('button', { name: 'Send to someone new' })
    await user.click(toggle)
    const name = screen.getByLabelText('Recipient name')
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toContainElement(name)
    expect(scroll).toHaveBeenLastCalledWith({ behavior: 'instant', block: 'start' })
    await user.type(name, 'Alex Lim')
    expect(scroll).toHaveBeenCalledTimes(1)
    await user.click(toggle)
    expect(screen.queryByLabelText('Recipient name')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(screen.getByLabelText('Recipient name')).toHaveValue('Alex Lim')
    expect(scroll).toHaveBeenCalledTimes(2)
  })

  it('loads all four masked payees, supports keyboard selection and advances without sending money', async () => {
    const user = userEvent.setup()
    let posts = 0
    server.use(
      http.post('*/api/transfers', () => {
        posts++
        return HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Unexpected transfer' } },
          { status: 500 },
        )
      }),
    )
    renderTransfer()
    expect(screen.getByRole('status')).toHaveTextContent('Loading recipients…')
    await payeesLoaded()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByRole('radio', { name: /Mum.*POSB.*6620/ })).toBeInTheDocument()
    expect(screen.queryByText(seed.payees[0].accountNumber)).not.toBeInTheDocument()
    screen.getByRole('radio', { name: /Jamie Tan/ }).focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: /Marcus Lee/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: 'How much?' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('radio', { name: /Marcus Lee/ })).toBeChecked()
    expect(posts).toBe(0)
  })

  it('blocks an over-balance amount without sending, revalidates account changes and retains values across steps', async () => {
    const user = userEvent.setup()
    let posts = 0
    server.use(
      http.post('*/api/transfers', () => {
        posts++
        return HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Unexpected transfer' } },
          { status: 500 },
        )
      }),
    )
    renderTransfer()
    await payeesLoaded()
    await user.click(screen.getByRole('radio', { name: /Jamie Tan/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    const amount = screen.getByRole('textbox', { name: 'Amount' })
    await user.type(amount, '5000.00')
    await user.type(screen.getByRole('textbox', { name: 'Note (optional)' }), 'Dinner')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(
      await screen.findByText(
        `Amount can't be more than your available balance (${formatMoney(4280.55).replace(/\u00a0/g, ' ')}).`,
      ),
    ).toBeInTheDocument()
    expect(amount).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Check the details' })).not.toBeInTheDocument()
    expect(posts).toBe(0)
    await user.selectOptions(screen.getByRole('combobox', { name: 'From account' }), 'acc_savings')
    await waitFor(() =>
      expect(
        screen.queryByText(/Amount can't be more than your available balance/),
      ).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: 'Check the details' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Confirm transfer' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('combobox', { name: 'From account' })).toHaveValue('acc_savings')
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('5000.00')
    expect(screen.getByRole('textbox', { name: 'Note (optional)' })).toHaveValue('Dinner')
    await user.selectOptions(screen.getByRole('combobox', { name: 'From account' }), 'acc_checking')
    await screen.findByText(/Amount can't be more than your available balance/)
    await user.clear(screen.getByRole('textbox', { name: 'Amount' }))
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '120')
    await waitFor(() =>
      expect(
        screen.queryByText(/Amount can't be more than your available balance/),
      ).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('radio', { name: /Jamie Tan/ })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /Mum/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('120.00')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Check the details' })
    const review = screen.getByRole('region', { name: 'Transfer details' })
    expect(review).toHaveTextContent('Mum')
    expect(review).toHaveTextContent('POSB · •••• 6620')
    expect(review).toHaveTextContent(formatMoney(120).replace(/\u00a0/g, ' '))
    expect(review).toHaveTextContent('Dinner')
    expect(within(review).queryByText('Jamie Tan')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm transfer' })).toBeEnabled()
    expect(posts).toBe(0)
  })

  it('searches names and banks ignoring case and recovers from no matches', async () => {
    const user = userEvent.setup()
    renderTransfer()
    await payeesLoaded()
    const search = screen.getByRole('searchbox', { name: 'Search payees' })
    await user.type(search, '  jAMie  ')
    expect(screen.getAllByRole('radio')).toHaveLength(1)
    expect(screen.getByRole('radio', { name: /Jamie Tan/ })).toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'ocbc')
    expect(screen.getAllByRole('radio')).toHaveLength(1)
    expect(screen.getByRole('radio', { name: /Marcus Lee/ })).toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'not-a-payee')
    expect(screen.getByText('No recipients match your search.')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    await user.click(
      within(screen.getByText('No recipients match your search.').parentElement!).getByRole(
        'button',
        { name: 'Clear search' },
      ),
    )
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('requires a saved selection and focuses its input on Continue', async () => {
    const user = userEvent.setup()
    renderTransfer()
    await payeesLoaded()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Choose a recipient.')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')[0]).toHaveFocus()
    expect(screen.getAllByRole('radio')[0]).toHaveAccessibleDescription('Choose a recipient.')
    expect(screen.queryByRole('heading', { name: 'How much?' })).not.toBeInTheDocument()
  })

  it('validates new-recipient fields on blur and Continue, then retains valid entries after Back', async () => {
    const user = userEvent.setup()
    renderTransfer()
    await payeesLoaded()
    await user.click(screen.getByRole('button', { name: 'Send to someone new' }))
    await user.type(screen.getByLabelText('Recipient name'), 'Alex Lim')
    const number = screen.getByLabelText('Account number (8 digits)')
    await user.type(number, '123')
    expect(screen.queryByText('Enter a valid 8-digit account number.')).not.toBeInTheDocument()
    await user.tab()
    expect(await screen.findByText('Enter a valid 8-digit account number.')).toBeInTheDocument()
    expect(number).toHaveAccessibleDescription('Enter a valid 8-digit account number.')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bank' }), 'DBS')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(number).toHaveFocus()
    await user.clear(number)
    await user.type(number, '0012345')
    expect(screen.getByText('Enter a valid 8-digit account number.')).toBeInTheDocument()
    await user.type(number, '6')
    await waitFor(() =>
      expect(screen.queryByText('Enter a valid 8-digit account number.')).not.toBeInTheDocument(),
    )
    expect(number).toHaveFocus()
    expect(number).toHaveAttribute('aria-invalid', 'false')
    expect(number).not.toHaveAttribute('aria-describedby')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'How much?' })
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByLabelText('Recipient name')).toHaveValue('Alex Lim')
    expect(screen.getByLabelText('Account number (8 digits)')).toHaveValue('00123456')
    expect(screen.getByLabelText('Bank')).toHaveValue('DBS')
    expect(screen.getByRole('button', { name: 'Send to someone new' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('clears errors raised by Continue while correcting a previously untouched input', async () => {
    const user = userEvent.setup()
    renderTransfer()
    await payeesLoaded()
    await user.click(screen.getByRole('button', { name: 'Send to someone new' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    const name = screen.getByLabelText('Recipient name')
    expect(await screen.findByText('Enter a name between 2 and 50 characters.')).toBeInTheDocument()
    expect(name).toHaveFocus()
    await user.type(name, 'Al')
    await waitFor(() =>
      expect(
        screen.queryByText('Enter a name between 2 and 50 characters.'),
      ).not.toBeInTheDocument(),
    )
    expect(name).toHaveFocus()
    expect(name).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText('Choose a bank.')).toBeInTheDocument()
  })

  it('ignores inactive invalid fields when switching back to a saved payee', async () => {
    const user = userEvent.setup()
    renderTransfer()
    await payeesLoaded()
    await user.click(screen.getByRole('button', { name: 'Send to someone new' }))
    await user.type(screen.getByLabelText('Recipient name'), 'A')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Enter a name between 2 and 50 characters.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Jamie Tan/ }))
    expect(screen.queryByLabelText('Recipient name')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'How much?' })
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Send to someone new' }))
    expect(screen.getByLabelText('Recipient name')).toHaveValue('A')
  })

  it('allows a new recipient when the API returns no saved payees', async () => {
    const user = userEvent.setup()
    server.use(http.get('*/api/payees', () => HttpResponse.json({ payees: [] })))
    renderTransfer()
    await screen.findByText('No saved recipients yet.')
    await enterNewRecipient(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'How much?' })
  })

  it('shows payee errors and reloads the list with Retry', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(
        '*/api/payees',
        () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Down' } },
            { status: 500 },
          ),
        { once: true },
      ),
    )
    renderTransfer()
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your recipients.")
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await payeesLoaded()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })
})

describe('transfer submission', () => {
  it('retains a failed draft and sends only an explicit retry', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    server.use(
      http.post(
        '*/api/transfers',
        () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Temporarily unavailable.' } },
            { status: 500 },
          ),
        { once: true },
      ),
    )
    renderTransfer()
    await reviewSavedTransfer(user)
    await user.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporarily unavailable.')
    expect(screen.queryByRole('heading', { name: 'Transfer sent' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Check the details' })).toBeInTheDocument()
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('120.00')
    expect(screen.getByRole('textbox', { name: 'Note (optional)' })).toHaveValue('Dinner')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    await screen.findByRole('heading', { name: 'Transfer sent' }, { timeout: 3000 })
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2)
  })

  it('maps API field errors to editable inputs without leaving review on failure', async () => {
    const user = userEvent.setup()
    const message = `Amount can't be more than your available balance (${formatMoney(80)}).`
    server.use(
      http.post('*/api/transfers', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INSUFFICIENT_FUNDS',
              message: 'Amount exceeds available balance.',
              fields: { amount: message },
              meta: { available: 80 },
            },
          },
          { status: 422 },
        ),
      ),
    )
    renderTransfer()
    await reviewSavedTransfer(user)
    await user.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Amount exceeds available balance.')
    expect(screen.getByRole('heading', { name: 'Check the details' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    const amount = screen.getByRole('textbox', { name: 'Amount' })
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveAccessibleDescription(new RegExp('Amount can'))
    expect(screen.getByText(message.replace(/\u00a0/g, ' '))).toBeInTheDocument()
  })

  it('revalidates the whole draft if balances change on review and sends no request', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const view = renderTransfer()
    await reviewSavedTransfer(user)
    view.rerender(
      <QueryClientProvider client={view.client}>
        <TransferDialog
          accounts={
            seed.accounts.map((account) =>
              account.id === 'acc_checking' ? { ...account, balance: 100 } : account,
            ) as Account[]
          }
          customer={seed.customer as Customer}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    expect(await screen.findByRole('heading', { name: 'How much?' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveFocus()
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
  })

  it('sends only new-recipient details when an inactive saved selection remains', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderTransfer()
    await payeesLoaded()
    await user.click(screen.getByRole('radio', { name: /Jamie Tan/ }))
    await enterNewRecipient(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.type(screen.getByRole('textbox', { name: 'Amount' }), '25.50')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    await screen.findByRole('heading', { name: 'Transfer sent' }, { timeout: 3000 })
    const posts = fetchSpy.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual({
      fromAccountId: 'acc_checking',
      amount: 25.5,
      recipient: { name: 'Alex Lim', accountNumber: '00123456', bank: 'OCBC' },
    })
    expect(screen.getByRole('region', { name: 'Transfer confirmation' })).toHaveTextContent(
      'Alex Lim',
    )
  })
})
