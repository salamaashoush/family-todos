import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from './queryClient'
import { completionSchema } from './schemas'
import {
  getTodoCompletions,
  completeTodo,
  uncompleteTodo,
} from '../server/completions'

// Completions are date-scoped — the queryFn fetches today's by default.
// Consumers pass the date via queryKey and filter with useLiveQuery.
export const completionsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['completions'],
    queryFn: () => getTodoCompletions({ data: {} }),
    queryClient,
    getKey: (c) => c.id,
    schema: completionSchema,
    onInsert: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await completeTodo({
          data: {
            todoId: m.modified.todoId,
            timeslotId: m.modified.timeslotId,
            memberId: m.modified.memberId,
            completionDate: m.modified.completionDate,
          },
        })
      }
    },
    onDelete: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        const original = m.original
        if (original) {
          await uncompleteTodo({
            data: {
              todoId: original.todoId,
              timeslotId: original.timeslotId,
              memberId: original.memberId,
              completionDate: original.completionDate,
            },
          })
        }
      }
    },
  }),
)
