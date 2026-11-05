import { queryOptions } from '@tanstack/react-query'
import { getPayees } from '@/api/banking'

export const payeesQueryOptions = queryOptions({
  queryKey: ['payees'],
  queryFn: ({ signal }) => getPayees(signal),
})
