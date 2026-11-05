import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Account, Customer } from '@/api/types'
import { server } from '@/test/setup'
import seed from '../../../mock-api/db.json'
import TransferDialog from './TransferDialog'

// jsdom lacks native modal behaviour. These shims only expose open/close;
// browser focus containment and responsive layout still require browser checks.
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open')
    },
  })
})
afterAll(() => {
  for (const [name, descriptor] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

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
  return render(
    <QueryClientProvider client={client}>
      <TransferDialog
        accounts={seed.accounts as Account[]}
        customer={seed.customer as Customer}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

async function payeesLoaded() {
  await screen.findByRole('radio', { name: /Jamie Tan/ }, { timeout: 3000 })
}

async function enterNewRecipient(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Send to someone new' }))
  await user.type(screen.getByLabelText('Recipient name'), 'Alex Lim')
  await user.type(screen.getByLabelText('Account number (8 digits)'), '00123456')
  await user.type(screen.getByLabelText('Bank'), 'OCBC')
}

describe('transfer recipient step', () => {
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
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('radio', { name: /Marcus Lee/ })).toBeChecked()
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
    await user.type(screen.getByLabelText('Bank'), 'DBS')
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
