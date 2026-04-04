import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from './queryClient'
import { rewardSchema } from './schemas'
import {
  getRewards,
  createReward,
  updateReward,
  deleteReward,
} from '../server/rewards'

export const rewardsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['rewards'],
    queryFn: () => getRewards(),
    queryClient,
    getKey: (r) => r.id,
    schema: rewardSchema,
    onInsert: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await createReward({
          data: {
            name: m.modified.name,
            description: m.modified.description ?? undefined,
            icon: m.modified.icon ?? undefined,
            pointCost: m.modified.pointCost,
          },
        })
      }
    },
    onUpdate: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await updateReward({
          data: {
            id: m.key as number,
            ...m.changes,
          },
        })
      }
    },
    onDelete: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await deleteReward({ data: { id: m.key as number } })
      }
    },
  }),
)
