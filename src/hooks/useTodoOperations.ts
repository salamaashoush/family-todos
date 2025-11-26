import { useCallback } from "react";
import { useToggleTodoMutation } from "./useQueries";
import type { TodoCompletion } from "../types";

export function useTodoOperations(selectedDate: string) {
  const toggleMutation = useToggleTodoMutation();

  const handleToggleTodo = useCallback(
    (
      todoId: number,
      timeslotId: number,
      memberId: number,
      isCompleted: boolean
    ) => {
      toggleMutation.mutate({
        todoId,
        timeslotId,
        memberId,
        selectedDate,
        isCompleted,
      });
    },
    [toggleMutation, selectedDate]
  );

  return { handleToggleTodo };
}

export function useIsTodoCompleted(completions: TodoCompletion[]) {
  const isTodoCompleted = useCallback(
    (todoId: number, timeslotId: number, memberId: number) => {
      return (
        completions?.some(
          (c) =>
            c.todoId === todoId &&
            c.timeslotId === timeslotId &&
            c.memberId === memberId
        ) || false
      );
    },
    [completions]
  );

  return { isTodoCompleted };
}
