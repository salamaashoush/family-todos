import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and, asc, inArray } from "drizzle-orm";
import { db, schema } from "../db";

// For now, we'll use a default family ID of 1
// This will be replaced with session-based family ID in multi-tenancy phase
const DEFAULT_FAMILY_ID = 1;

const GetTodosSchema = z.object({
  timeslotId: z.number().optional(),
});

export const getTodos = createServerFn({ method: "GET" })
  .inputValidator(GetTodosSchema)
  .handler(async ({ data }) => {
    // Get all todos for the family
    const todos = await db
      .select()
      .from(schema.todos)
      .where(eq(schema.todos.familyId, DEFAULT_FAMILY_ID))
      .orderBy(asc(schema.todos.position), asc(schema.todos.createdAt));

    // Get all timeslot assignments for these todos
    const todoIds = todos.map((t) => t.id);

    let todoTimeslotsMap: Map<number, number[]> = new Map();

    if (todoIds.length > 0) {
      const todoTimeslots = await db
        .select()
        .from(schema.todoTimeslots)
        .where(inArray(schema.todoTimeslots.todoId, todoIds));

      // Group timeslot IDs by todo
      for (const tt of todoTimeslots) {
        const existing = todoTimeslotsMap.get(tt.todoId) || [];
        existing.push(tt.timeslotId);
        todoTimeslotsMap.set(tt.todoId, existing);
      }
    }

    // Combine todos with their timeslot IDs
    const todosWithTimeslots = todos.map((todo) => ({
      ...todo,
      timeslotIds: todoTimeslotsMap.get(todo.id) || [],
    }));

    // Filter by timeslot if specified
    if (data.timeslotId) {
      return todosWithTimeslots.filter((t) =>
        t.timeslotIds.includes(data.timeslotId!)
      );
    }

    return todosWithTimeslots;
  });

const CreateTodoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  symbol: z.string().optional(),
  position: z.number().optional(),
  points: z.number().min(0).optional(),
  timeslotIds: z.array(z.number()).min(1),
});

export const createTodo = createServerFn({ method: "POST" })
  .inputValidator(CreateTodoSchema)
  .handler(async ({ data }) => {
    // Insert the todo
    const [todo] = await db
      .insert(schema.todos)
      .values({
        familyId: DEFAULT_FAMILY_ID,
        title: data.title,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        symbol: data.symbol || null,
        position: data.position || 0,
        points: data.points ?? 5,
      })
      .returning();

    // Insert timeslot assignments
    if (data.timeslotIds.length > 0) {
      await db.insert(schema.todoTimeslots).values(
        data.timeslotIds.map((timeslotId) => ({
          todoId: todo.id,
          timeslotId,
        }))
      );
    }

    return {
      ...todo,
      timeslotIds: data.timeslotIds,
    };
  });

const UpdateTodoSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  symbol: z.string().optional(),
  position: z.number().optional(),
  points: z.number().min(0).optional(),
  timeslotIds: z.array(z.number()).optional(),
});

export const updateTodo = createServerFn({ method: "POST" })
  .inputValidator(UpdateTodoSchema)
  .handler(async ({ data }) => {
    const updateData: Partial<{
      title: string;
      description: string | null;
      imageUrl: string | null;
      symbol: string | null;
      position: number;
      points: number;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.symbol !== undefined) updateData.symbol = data.symbol;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.points !== undefined) updateData.points = data.points;

    const [todo] = await db
      .update(schema.todos)
      .set(updateData)
      .where(
        and(
          eq(schema.todos.id, data.id),
          eq(schema.todos.familyId, DEFAULT_FAMILY_ID)
        )
      )
      .returning();

    // Update timeslot assignments if provided
    if (data.timeslotIds !== undefined) {
      // Delete existing assignments
      await db
        .delete(schema.todoTimeslots)
        .where(eq(schema.todoTimeslots.todoId, data.id));

      // Insert new assignments
      if (data.timeslotIds.length > 0) {
        await db.insert(schema.todoTimeslots).values(
          data.timeslotIds.map((timeslotId) => ({
            todoId: data.id,
            timeslotId,
          }))
        );
      }
    }

    return todo;
  });

const DeleteTodoSchema = z.object({
  id: z.number(),
});

export const deleteTodo = createServerFn({ method: "POST" })
  .inputValidator(DeleteTodoSchema)
  .handler(async ({ data }) => {
    await db
      .delete(schema.todos)
      .where(
        and(
          eq(schema.todos.id, data.id),
          eq(schema.todos.familyId, DEFAULT_FAMILY_ID)
        )
      );

    return { success: true };
  });

// Re-export types for backwards compatibility
export type { Todo, TodoTimeslot } from "../db/schema";
