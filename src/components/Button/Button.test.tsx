import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import Button from './Button'

it('defaults to a non-submit button and supports explicit submission and native refs', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  const ref = createRef<HTMLButtonElement>()
  render(
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <Button ref={ref} variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">Continue</Button>
    </form>,
  )
  expect(ref.current).toBe(screen.getByRole('button', { name: 'Cancel' }))
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onSubmit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  expect(onSubmit).toHaveBeenCalledTimes(1)
})

it('blocks disabled actions and supports keyboard activation when enabled', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  const view = render(
    <Button disabled onClick={onClick}>
      Retry
    </Button>,
  )
  const button = screen.getByRole('button', { name: 'Retry' })
  await user.click(button)
  await user.tab()
  expect(button).not.toHaveFocus()
  expect(onClick).not.toHaveBeenCalled()
  view.rerender(<Button onClick={onClick}>Retry</Button>)
  await user.tab()
  expect(button).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(onClick).toHaveBeenCalledTimes(1)
})
