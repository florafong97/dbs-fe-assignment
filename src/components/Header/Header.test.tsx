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
