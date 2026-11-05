import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FormField from './FormField'

describe('FormField', () => {
  it('associates its label and error with the input and removes stale error attributes', () => {
    const view = render(
      <FormField id="recipient-name" label="Recipient name" error="Enter at least two characters.">
        {(props) => <input {...props} />}
      </FormField>,
    )
    const input = screen.getByRole('textbox', { name: 'Recipient name' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter at least two characters.')
    input.focus()
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter at least two characters.')).toBeVisible()
    view.rerender(
      <FormField id="recipient-name" label="Recipient name">
        {(props) => <input {...props} />}
      </FormField>,
    )
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByText('Enter at least two characters.')).not.toBeInTheDocument()
  })

  it('supports native selects and textareas without owning their values', () => {
    render(
      <>
        <FormField label="Bank" error="Choose a bank.">
          {(props) => (
            <select {...props} defaultValue="">
              <option value="">Select bank</option>
              <option value="DBS">DBS</option>
            </select>
          )}
        </FormField>
        <FormField label="Note">
          {(props) => <textarea {...props} defaultValue="Dinner" />}
        </FormField>
      </>,
    )
    const bank = screen.getByRole('combobox', { name: 'Bank' })
    const note = screen.getByRole('textbox', { name: 'Note' })
    expect(bank).toHaveAccessibleDescription('Choose a bank.')
    expect(bank).toHaveValue('')
    expect(note).toHaveValue('Dinner')
    expect(bank.id).not.toBe(note.id)
  })
})
