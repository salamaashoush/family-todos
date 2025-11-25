import { createServerFn } from "@tanstack/react-start";
import { db, type Todo, type TodoTimeslot } from "../db/schema";
import { z } from "zod";

const GetTodosSchema = z.object({
  timeslot_id: z.number().optional(),
});

export const getTodos = createServerFn({ method: "GET" })
  .inputValidator(GetTodosSchema)
  .handler(async ({ data }) => {
    const query = "SELECT * FROM todos ORDER BY position, created_at";

    const todos = db.query<Todo, []>(query).all();

    const todosWithTimeslots = todos.map((todo: Todo) => {
      const timeslots = db.query<TodoTimeslot, [number]>(
        "SELECT * FROM todo_timeslots WHERE todo_id = ?"
      ).all(todo.id);

      return {
        ...todo,
        timeslot_ids: timeslots.map((t: TodoTimeslot) => t.timeslot_id)
      };
    });

    if (data.timeslot_id) {
      return todosWithTimeslots.filter((t: Todo & { timeslot_ids: number[] }) => t.timeslot_ids.includes(data.timeslot_id!));
    }

    return todosWithTimeslots;
  });

const CreateTodoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().optional(),
  symbol: z.string().optional(),
  position: z.number().optional(),
  timeslot_ids: z.array(z.number()).min(1),
});

export const createTodo = createServerFn({ method: "POST" })
  .inputValidator(CreateTodoSchema)
  .handler(async ({ data }) => {
    const result = db.run(
      `INSERT INTO todos
      (title, description, image_url, symbol, position)
      VALUES (?, ?, ?, ?, ?)`,
      [
        data.title,
        data.description || null,
        data.image_url || null,
        data.symbol || null,
        data.position || 0,
      ]
    );

    const todoId = result.lastInsertRowid as number;

    for (const timeslotId of data.timeslot_ids) {
      db.run(
        `INSERT INTO todo_timeslots (todo_id, timeslot_id) VALUES (?, ?)`,
        [todoId, timeslotId]
      );
    }

    const todo = db
      .query<Todo, [number]>("SELECT * FROM todos WHERE id = ?")
      .get(todoId);

    return todo;
  });

const UpdateTodoSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  symbol: z.string().optional(),
  position: z.number().optional(),
  timeslot_ids: z.array(z.number()).optional(),
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

    if (data.timeslot_ids !== undefined) {
      db.run("DELETE FROM todo_timeslots WHERE todo_id = ?", [data.id]);

      for (const timeslotId of data.timeslot_ids) {
        db.run(
          `INSERT INTO todo_timeslots (todo_id, timeslot_id) VALUES (?, ?)`,
          [data.id, timeslotId]
        );
      }
    }

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
