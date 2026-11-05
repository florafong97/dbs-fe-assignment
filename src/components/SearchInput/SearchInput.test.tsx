import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SearchInput from './SearchInput'

function ControlledSearch({ onValueChange }: { onValueChange: (value: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <SearchInput
      label="Search transactions"
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange(next)
      }}
    />
  )
}

describe('SearchInput', () => {
  it('exposes its label, reports typed values and clears by keyboard while restoring input focus', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ControlledSearch onValueChange={onValueChange} />)
    const search = screen.getByRole('searchbox', { name: 'Search transactions' })
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
    await user.type(search, 'rent')
    expect(search).toHaveValue('rent')
    expect(onValueChange).toHaveBeenLastCalledWith('rent')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Clear search' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('')
    expect(search).toHaveValue('')
    expect(search).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })

  it('disables both editing and clearing when unavailable', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <SearchInput label="Search payees" value="Jamie" onValueChange={onValueChange} disabled />,
    )
    const search = screen.getByRole('searchbox', { name: 'Search payees' })
    const clear = screen.getByRole('button', { name: 'Clear search' })
    expect(search).toBeDisabled()
    expect(clear).toBeDisabled()
    await user.type(search, 'test')
    await user.click(clear)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(search).toHaveValue('Jamie')
  })
})
