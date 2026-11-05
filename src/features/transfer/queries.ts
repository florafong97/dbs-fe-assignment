import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { createTransfer, getPayees } from '@/api/banking'

export const payeesQueryOptions = queryOptions({
  queryKey: ['payees'],
  queryFn: ({ signal }) => getPayees(signal),
})

export function useTransferSubmission() {
  const queryClient = useQueryClient()
  const refresh = useMutation({
    retry: false,
    mutationFn: async () => {
      // Wait for every refresh, including when one fails, before enabling retry.
      const results = await Promise.allSettled(
        ['customer', 'accounts', 'transactions'].map((resource) =>
          queryClient.invalidateQueries({ queryKey: [resource] }, { throwOnError: true }),
        ),
      )
      const failed = results.find((result) => result.status === 'rejected')
      if (failed?.status === 'rejected') throw failed.reason
    },
  })
  const transfer = useMutation({
    mutationFn: createTransfer,
    retry: false,
    // Refresh errors belong to the completed transfer's success screen.
    onSuccess: () => {
      refresh.mutate()
    },
  })
  return { transfer, refresh }
}
