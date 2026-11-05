import type { CreateTransferRequest } from '@/api/types'
import type { TransferFormValues } from './schema'

// Call only after the complete draft passes schema validation.
export function toTransferPayload(values: TransferFormValues): CreateTransferRequest {
  const common = {
    fromAccountId: values.fromAccountId,
    amount: Number(values.amount),
    ...(values.note ? { note: values.note } : {}),
  }
  return values.recipientMode === 'saved'
    ? { ...common, payeeId: values.payeeId }
    : {
        ...common,
        recipient: {
          name: values.recipient.name.trim(),
          accountNumber: values.recipient.accountNumber,
          bank: values.recipient.bank.trim(),
        },
      }
}
