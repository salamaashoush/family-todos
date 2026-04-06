import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from './queryClient'
import { memberStatsSchema } from './schemas'
import { getAllMemberStats } from '../server/statistics'

// Read-only collection — stats are updated server-side as a side effect of completions.
// Invalidate via queryClient to refresh.
export const memberStatsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['memberStats'],
    queryFn: () => getAllMemberStats(),
    queryClient,
    getKey: (s) => s.memberId,
    schema: memberStatsSchema,
  }),
)
