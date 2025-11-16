import { createServerFn } from "@tanstack/react-start";
import { db, type Todo } from "../db/schema";
import { z } from "zod";

const GetTodosSchema = z.object({
  timeslot_id: z.number().optional(),
});

export const getTodos = createServerFn({ method: "GET" })
  .inputValidator(GetTodosSchema)
  .handler(async ({ data }) => {
    let query = "SELECT * FROM todos";
    const params: number[] = [];

    if (data.timeslot_id) {
      query += " WHERE timeslot_id = ?";
      params.push(data.timeslot_id);
    }

    query += " ORDER BY position, created_at";

    const todos = db.query<Todo, number[]>(query).all(...params);
    return todos;
  });

const CreateTodoSchema = z.object({
  timeslot_id: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().optional(),
  symbol: z.string().optional(),
  position: z.number().optional(),
});

export const createTodo = createServerFn({ method: "POST" })
  .inputValidator(CreateTodoSchema)
  .handler(async ({ data }) => {
    const result = db.run(
      `INSERT INTO todos
      (timeslot_id, title, description, image_url, symbol, position)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.timeslot_id,
        data.title,
        data.description || null,
        data.image_url || null,
        data.symbol || null,
        data.position || 0,
      ]
    );

    const todo = db
      .query<Todo, [number]>("SELECT * FROM todos WHERE id = ?")
      .get(result.lastInsertRowid as number);

    return todo;
  });

const UpdateTodoSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  symbol: z.string().optional(),
  position: z.number().optional(),
});

export const updateTodo = createServerFn({ method: "POST" })
  .inputValidator(UpdateTodoSchema)
  .handler(async ({ data }) => {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description);
    }
    if (data.image_url !== undefined) {
      updates.push("image_url = ?");
      values.push(data.image_url);
    }
    if (data.symbol !== undefined) {
      updates.push("symbol = ?");
      values.push(data.symbol);
    }
    if (data.position !== undefined) {
      updates.push("position = ?");
      values.push(data.position);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(data.id);

    db.run(`UPDATE todos SET ${updates.join(", ")} WHERE id = ?`, values);

    const todo = db
      .query<Todo, [number]>("SELECT * FROM todos WHERE id = ?")
      .get(data.id);

    return todo;
  });

const DeleteTodoSchema = z.object({
  id: z.number(),
});

export const deleteTodo = createServerFn({ method: "POST" })
  .inputValidator(DeleteTodoSchema)
  .handler(async ({ data }) => {
    db.run("DELETE FROM todos WHERE id = ?", [data.id]);
    return { success: true };
  });
