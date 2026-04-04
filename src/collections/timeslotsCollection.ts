import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from './queryClient'
import { timeslotSchema } from './schemas'
import {
  getTimeslots,
  createTimeslot,
  updateTimeslot,
  deleteTimeslot,
} from '../server/timeslots'

export const timeslotsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['timeslots'],
    queryFn: () => getTimeslots({ data: {} }),
    queryClient,
    getKey: (ts) => ts.id,
    schema: timeslotSchema,
    onInsert: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await createTimeslot({
          data: {
            name: m.modified.name,
            description: m.modified.description ?? undefined,
            startTime: m.modified.startTime,
            endTime: m.modified.endTime,
            recurrenceType: m.modified.recurrenceType as 'daily' | 'weekly' | 'monthly' | 'none' | undefined,
            recurrenceDays: m.modified.recurrenceDays ?? undefined,
            memberIds: m.modified.memberIds,
          },
        })
      }
    },
    onUpdate: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await updateTimeslot({
          data: {
            id: m.key as number,
            ...m.changes,
          },
        })
      }
    },
    onDelete: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await deleteTimeslot({ data: { id: m.key as number } })
      }
    },
  }),
)
