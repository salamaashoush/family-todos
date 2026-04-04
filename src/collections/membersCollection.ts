import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from './queryClient'
import { memberSchema } from './schemas'
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
} from '../server/members'

export const membersCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['members'],
    queryFn: () => getMembers(),
    queryClient,
    getKey: (m) => m.id,
    schema: memberSchema,
    onInsert: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await createMember({
          data: {
            name: m.modified.name,
            avatar: m.modified.avatar ?? undefined,
            isParent: m.modified.isParent,
          },
        })
      }
    },
    onUpdate: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await updateMember({
          data: {
            id: m.key as number,
            ...m.changes,
          },
        })
      }
    },
    onDelete: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await deleteMember({ data: { id: m.key as number } })
      }
    },
  }),
)
