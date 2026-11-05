import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import TransferStepper from './TransferStepper'

it('announces only the active step and updates when the transfer advances or goes back', () => {
  const steps = [
    { id: 'recipient', label: 'Recipient' },
    { id: 'amount', label: 'Amount' },
    { id: 'review', label: 'Review' },
  ]
  const view = render(<TransferStepper steps={steps} activeStep="recipient" />)
  const progress = within(screen.getByRole('list', { name: 'Transfer progress' }))
  expect(progress.getByRole('listitem', { current: 'step' })).toHaveTextContent('Recipient')

  view.rerender(<TransferStepper steps={steps} activeStep="amount" />)
  expect(progress.getByRole('listitem', { current: 'step' })).toHaveTextContent('Amount')

  view.rerender(<TransferStepper steps={steps} activeStep="recipient" />)
  expect(progress.getByRole('listitem', { current: 'step' })).toHaveTextContent('Recipient')
})
