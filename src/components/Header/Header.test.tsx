import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Header from './Header'

describe('Header', () => {
  it('renders controlled preferences and reflects changed props', () => {
    const callbacks = { onToggleTheme: vi.fn(), onSelectSegment: vi.fn() }
    const view = render(<Header theme="light" segment="retail" {...callbacks} />)
    expect(screen.getByRole('link', { name: 'Meridian overview' })).toHaveAttribute(
      'href',
      '#overview',
    )
    expect(screen.getByRole('button', { name: 'Retail' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    view.rerender(<Header theme="dark" segment="premium" {...callbacks} />)
    expect(screen.getByRole('button', { name: 'Premium' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Retail' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // Rendering a controlled header does not mutate app preferences.
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.length).toBe(0)
  })

  it('delegates mouse and keyboard actions to its callbacks', async () => {
    const user = userEvent.setup()
    const onToggleTheme = vi.fn()
    const onSelectSegment = vi.fn()
    render(
      <Header
        theme="light"
        segment="retail"
        onToggleTheme={onToggleTheme}
        onSelectSegment={onSelectSegment}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Premium' }))
    expect(onSelectSegment).toHaveBeenLastCalledWith('premium')
    await user.click(screen.getByRole('button', { name: 'Retail' }))
    expect(onSelectSegment).toHaveBeenLastCalledWith('retail')
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('keeps out-of-scope navigation disabled', () => {
    render(
      <Header theme="light" segment="retail" onToggleTheme={() => {}} onSelectSegment={() => {}} />,
    )
    for (const name of ['Cards', 'Payments', 'Insights']) {
      expect(screen.getByRole('button', { name, hidden: true })).toBeDisabled()
    }
  })
})

describe('Header greeting', () => {
  it('reads the current time and date when the header renders', () => {
    vi.useFakeTimers()
    try {
      const callbacks = { onToggleTheme: () => {}, onSelectSegment: () => {} }
      vi.setSystemTime(new Date(2026, 10, 5, 11))
      const view = render(
        <Header firstName="Morgan" lastName="Lee" theme="light" segment="retail" {...callbacks} />,
      )
      expect(screen.getByRole('heading', { name: 'Good evening, Morgan' })).toBeInTheDocument()
      expect(screen.getByLabelText('Morgan Lee')).toHaveTextContent('ML')
      expect(screen.getByText('Thursday, 5 November')).toHaveAttribute(
        'datetime',
        new Date(2026, 10, 5, 11).toISOString(),
      )
      vi.setSystemTime(new Date(2026, 10, 6, 19))
      view.rerender(<Header firstName="Morgan" theme="dark" segment="retail" {...callbacks} />)
      expect(screen.getByRole('heading', { name: 'Good evening, Morgan' })).toBeInTheDocument()
      expect(screen.getByText('Friday, 6 November')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('handles loading and incomplete names without hardcoded identity or punctuation', () => {
    const callbacks = { onToggleTheme: () => {}, onSelectSegment: () => {} }
    const view = render(<Header theme="light" segment="retail" {...callbacks} />)
    expect(screen.getByRole('heading')).toHaveTextContent(/^Good evening$/)
    expect(screen.getByLabelText('Customer')).toHaveTextContent('-')
    view.rerender(
      <Header firstName="  Morgan  " lastName=" " theme="light" segment="retail" {...callbacks} />,
    )
    expect(screen.getByRole('heading')).toHaveTextContent(/, Morgan$/)
    expect(screen.getByLabelText('Morgan')).toHaveTextContent('M')
  })
})
