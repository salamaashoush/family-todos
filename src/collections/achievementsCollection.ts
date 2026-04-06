import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from './queryClient'
import { achievementSchema } from './schemas'
import { getAllAchievements } from '../server/statistics'

// Read-only collection — achievements catalog (global + family-specific).
export const achievementsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['achievements'],
    queryFn: () => getAllAchievements(),
    queryClient,
    getKey: (a) => a.id,
    schema: achievementSchema,
  }),
)
