import { parseAmountInput } from './amount'
import { z } from 'zod'
import type { Account } from '@/api/types'
import { formatMoney } from '@/lib/format'

const recipientFields = z.object({
  name: z.string(),
  accountNumber: z.string(),
  bank: z.string(),
})

const newRecipientSchema = recipientFields.extend({
  name: z
    .string()
    .trim()
    .min(2, 'Enter a name between 2 and 50 characters.')
    .max(50, 'Enter a name between 2 and 50 characters.'),
  accountNumber: z.string().regex(/^\d{8}$/, 'Enter a valid 8-digit account number.'),
  bank: z.string().trim().min(2, 'Choose a bank.').max(30, 'Bank must be 30 characters or fewer.'),
})

export function createTransferSchema(accounts: Account[], remainingDailyLimit: number) {
  return z
    .object({
      recipientMode: z.enum(['saved', 'new']),
      payeeId: z.string(),
      recipient: recipientFields,
      fromAccountId: z.string(),
      amount: z.string(),
      note: z.string().max(50, 'Keep the note to 50 characters or fewer.'),
    })
    .superRefine((values, context) => {
      if (values.recipientMode === 'saved') {
        if (!values.payeeId) {
          context.addIssue({ code: 'custom', path: ['payeeId'], message: 'Choose a recipient.' })
        }
      } else {
        const recipient = newRecipientSchema.safeParse(values.recipient)
        if (!recipient.success) {
          for (const issue of recipient.error.issues) {
            context.addIssue({
              code: 'custom',
              path: ['recipient', ...issue.path],
              message: issue.message,
            })
          }
        }
      }

      const account = accounts.find(
        (item) => item.id === values.fromAccountId && item.type !== 'credit',
      )
      if (!account) {
        context.addIssue({
          code: 'custom',
          path: ['fromAccountId'],
          message: 'Choose a deposit account.',
        })
      }

      const input = values.amount.trim()
      const amount = parseAmountInput(input)
      let amountError: string | undefined
      if (!input) amountError = 'Enter an amount.'
      else if (amount === null) {
        amountError = 'Enter a valid amount with at most 2 decimal places.'
      } else if (amount < 1) amountError = 'Enter an amount of at least SGD 1.00.'
      else if (account && Math.round(amount * 100) > Math.round(account.balance * 100)) {
        amountError = `Amount can't be more than your available balance (${formatMoney(account.balance)}).`
      } else if (Math.round(amount * 100) > Math.round(remainingDailyLimit * 100)) {
        amountError = `This transfer exceeds your remaining daily limit (${formatMoney(remainingDailyLimit)}).`
      }
      if (amountError) context.addIssue({ code: 'custom', path: ['amount'], message: amountError })
    })
}

export type TransferFormValues = z.infer<ReturnType<typeof createTransferSchema>>
