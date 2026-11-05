import type { FieldPath } from 'react-hook-form'
import type { TransferFormValues } from './schema'

export type TransferStep = 'recipient' | 'amount' | 'review'

export const steps: {
  id: TransferStep
  label: string
  title: string
  fields: FieldPath<TransferFormValues>[]
}[] = [
  {
    id: 'recipient',
    label: 'Recipient',
    title: 'Who are you sending to?',
    fields: [
      'recipientMode',
      'payeeId',
      'recipient.name',
      'recipient.accountNumber',
      'recipient.bank',
    ],
  },
  {
    id: 'amount',
    label: 'Amount',
    title: 'How much?',
    fields: ['fromAccountId', 'amount', 'note'],
  },
  { id: 'review', label: 'Review', title: 'Check the details', fields: [] },
]
