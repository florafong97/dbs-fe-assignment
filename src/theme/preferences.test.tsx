import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Header from '../pages/dashboard/components/Header'

const bootstrapSource = readFileSync('public/scripts/preferences.js', 'utf8')

function bootstrap(prefersDark = false) {
  runInNewContext(bootstrapSource, {
    document,
    localStorage,
    window: { matchMedia: () => ({ matches: prefersDark }) },
  })
}

describe('pre-paint preferences', () => {
  it.each([false, true])('uses the system theme without a saved choice (dark: %s)', (dark) => {
    bootstrap(dark)
    expect(document.documentElement.dataset.theme).toBe(dark ? 'dark' : 'light')
    expect(document.documentElement.dataset.segment).toBe('retail')
    expect(localStorage.getItem('meridian.theme.v1')).toBeNull()
  })

  it.each(['light', 'dark'])('saved %s theme overrides the opposite system preference', (theme) => {
    localStorage.setItem('meridian.theme.v1', theme)
    localStorage.setItem('meridian.segment.v1', 'premium')
    bootstrap(theme === 'light')
    expect(document.documentElement.dataset.theme).toBe(theme)
    expect(document.documentElement.dataset.segment).toBe('premium')
  })

  it('ignores invalid stored values', () => {
    localStorage.setItem('meridian.theme.v1', 'invalid')
    localStorage.setItem('meridian.segment.v1', 'invalid')
    bootstrap(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.segment).toBe('retail')
  })

  it('falls back to the system theme when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    expect(() => bootstrap(true)).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.segment).toBe('retail')
  })
})

describe('header preference controls', () => {
  it('supports all four combinations and restores explicit choices after remount', async () => {
    const user = userEvent.setup()
    bootstrap()
    const view = render(<Header />)
    const root = document.documentElement
    expect(screen.getByRole('button', { name: 'Retail' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Premium' }))
    expect(root.dataset.segment).toBe('premium')
    expect(root.dataset.theme).toBe('light')
    await user.click(screen.getByRole('button', { name: 'Dark mode' }))
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.segment).toBe('premium')
    await user.click(screen.getByRole('button', { name: 'Retail' }))
    expect(root.dataset.segment).toBe('retail')
    expect(root.dataset.theme).toBe('dark')
    expect(localStorage.getItem('meridian.theme.v1')).toBe('dark')
    expect(localStorage.getItem('meridian.segment.v1')).toBe('retail')
    view.unmount()
    root.dataset.theme = 'light'
    root.dataset.segment = 'premium'
    bootstrap()
    render(<Header defaultSegment="premium" />)
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.segment).toBe('retail')
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Retail' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('uses a customer default arriving later unless the user has already selected a segment', async () => {
    const user = userEvent.setup()
    const view = render(<Header />)
    view.rerender(<Header defaultSegment="premium" />)
    expect(screen.getByRole('button', { name: 'Premium' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('meridian.segment.v1')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Retail' }))
    view.rerender(<Header defaultSegment="retail" />)
    view.rerender(<Header defaultSegment="premium" />)
    expect(screen.getByRole('button', { name: 'Retail' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.segment).toBe('retail')
  })

  it('ignores an invalid saved segment in favour of the customer default', () => {
    localStorage.setItem('meridian.segment.v1', 'unknown')
    render(<Header defaultSegment="premium" />)
    expect(screen.getByRole('button', { name: 'Premium' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.segment).toBe('premium')
  })

  it('keeps controls usable when storage reads and writes fail', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota') })
    const user = userEvent.setup()
    render(<Header />)
    await user.click(screen.getByRole('button', { name: 'Dark mode' }))
    await user.click(screen.getByRole('button', { name: 'Premium' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.segment).toBe('premium')
  })

  it('allows keyboard operation and leaves out-of-scope navigation disabled', async () => {
    const user = userEvent.setup()
    render(<Header />)
    const premium = screen.getByRole('button', { name: 'Premium' })
    premium.focus()
    await user.keyboard(' ')
    expect(premium).toHaveAttribute('aria-pressed', 'true')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(document.documentElement.dataset.theme).toBe('dark')
    for (const name of ['Cards', 'Payments', 'Insights']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
  })
})
