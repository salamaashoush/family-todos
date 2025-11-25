import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getMembers } from "../server/members";
import { getTimeslots } from "../server/timeslots";
import { getTodos } from "../server/todos";
import {
  getTodoCompletions,
  completeTodo,
  uncompleteTodo,
} from "../server/completions";
import {
  getMemberStats,
  getMemberAchievements,
  getAllAchievements,
} from "../server/statistics";
import { getWeeklyProgress } from "../server/progress";
import type { TodoCompletion } from "../types";

// Get client ID from window if available (client-side only)
function getClientId(): string | null {
  if (typeof window !== 'undefined') {
    return (window as { __sseClientId?: string }).__sseClientId || null;
  }
  return null;
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => getMembers(),
  });
}

export function useTimeslots() {
  return useQuery({
    queryKey: ["timeslots"],
    queryFn: () => getTimeslots({ data: {} }),
  });
}

export function useTodos() {
  return useQuery({
    queryKey: ["todos"],
    queryFn: () => getTodos({ data: {} }),
  });
}

export function useCompletions(selectedDate: string) {
  return useQuery({
    queryKey: ["completions", selectedDate],
    queryFn: () => getTodoCompletions({ data: { date: selectedDate } }),
  });
}

export function useMemberStats(memberId: number) {
  return useQuery({
    queryKey: ["memberStats", memberId],
    queryFn: () => getMemberStats({ data: { member_id: memberId } }),
  });
}

export function useMemberAchievements(memberId: number) {
  return useQuery({
    queryKey: ["memberAchievements", memberId],
    queryFn: () => getMemberAchievements({ data: { member_id: memberId } }),
  });
}

export function useAllAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: () => getAllAchievements(),
  });
}

export function useWeeklyProgress(memberId: number, startDate: string) {
  return useQuery({
    queryKey: ["weeklyProgress", memberId, startDate],
    queryFn: () =>
      getWeeklyProgress({
        data: { member_id: memberId, start_date: startDate },
      }),
  });
}

interface ToggleTodoParams {
  todoId: number;
  timeslotId: number;
  memberId: number;
  selectedDate: string;
  isCompleted: boolean;
}

export function useToggleTodoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      todoId,
      timeslotId,
      memberId,
      selectedDate,
      isCompleted,
    }: ToggleTodoParams) => {
      const clientId = getClientId();
      const data: {
        todo_id: number;
        timeslot_id: number;
        member_id: number;
        completion_date: string;
        client_id?: string;
      } = {
        todo_id: todoId,
        timeslot_id: timeslotId,
        member_id: memberId,
        completion_date: selectedDate,
      };

      if (typeof clientId === 'string' && clientId.length > 0) {
        data.client_id = clientId;
      }

      if (isCompleted) {
        return uncompleteTodo({ data });
      } else {
        return completeTodo({ data });
      }
    },

    onMutate: async ({
      todoId,
      timeslotId,
      memberId,
      selectedDate,
      isCompleted,
    }: ToggleTodoParams) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: ["completions", selectedDate],
      });

      // Snapshot the previous value
      const previousCompletions = queryClient.getQueryData<TodoCompletion[]>([
        "completions",
        selectedDate,
      ]);

      // Optimistically update completions
      queryClient.setQueryData<TodoCompletion[]>(
        ["completions", selectedDate],
        (old) => {
          if (!old) return old;

          if (isCompleted) {
            // Remove the completion (uncomplete)
            return old.filter(
              (c) =>
                !(
                  c.todo_id === todoId &&
                  c.timeslot_id === timeslotId &&
                  c.member_id === memberId
                )
            );
          } else {
            // Add the completion (complete)
            const newCompletion: TodoCompletion = {
              id: Date.now(), // Temporary ID
              todo_id: todoId,
              timeslot_id: timeslotId,
              member_id: memberId,
              completion_date: selectedDate,
              completed_at: new Date().toISOString(),
            };
            return [...old, newCompletion];
          }
        }
      );

      return { previousCompletions, memberId, selectedDate };
    },

    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousCompletions) {
        queryClient.setQueryData(
          ["completions", variables.selectedDate],
          context.previousCompletions
        );
      }
    },

    onSettled: (_data, _error, variables) => {
      // Invalidate to refetch fresh data - use specific member ID
      queryClient.invalidateQueries({
        queryKey: ["completions", variables.selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["memberStats", variables.memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["memberAchievements", variables.memberId],
      });
      // Invalidate weekly progress for this specific member
      queryClient.invalidateQueries({
        queryKey: ["weeklyProgress", variables.memberId],
        exact: false,
      });
    },
  });
}
