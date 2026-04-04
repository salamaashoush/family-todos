import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from './queryClient'
import { todoSchema } from './schemas'
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from '../server/todos'

export const todosCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['todos'],
    queryFn: () => getTodos({ data: {} }),
    queryClient,
    getKey: (t) => t.id,
    schema: todoSchema,
    onInsert: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await createTodo({
          data: {
            title: m.modified.title,
            description: m.modified.description ?? undefined,
            imageUrl: m.modified.imageUrl ?? undefined,
            symbol: m.modified.symbol ?? undefined,
            position: m.modified.position,
            points: m.modified.points,
            timeslotIds: m.modified.timeslotIds,
          },
        })
      }
    },
    onUpdate: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await updateTodo({
          data: {
            id: m.key as number,
            ...m.changes,
          },
        })
      }
    },
    onDelete: async ({ transaction }) => {
      for (const m of transaction.mutations) {
        await deleteTodo({ data: { id: m.key as number } })
      }
    },
  }),
)
