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
import { getMemberPoints } from "../server/rewards";
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

export function useTimeslots(date?: string) {
  return useQuery({
    queryKey: ["timeslots", date],
    queryFn: () => getTimeslots({ data: { date } }),
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
    queryFn: () => getMemberStats({ data: { memberId } }),
  });
}

export function useMemberAchievements(memberId: number) {
  return useQuery({
    queryKey: ["memberAchievements", memberId],
    queryFn: () => getMemberAchievements({ data: { memberId } }),
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
        data: { memberId, startDate },
      }),
  });
}

export function useMemberPoints(memberId: number) {
  return useQuery({
    queryKey: ["memberPoints", memberId],
    queryFn: () => getMemberPoints({ data: { memberId } }),
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
        todoId: number;
        timeslotId: number;
        memberId: number;
        completionDate: string;
        clientId?: string;
      } = {
        todoId: todoId,
        timeslotId: timeslotId,
        memberId: memberId,
        completionDate: selectedDate,
      };

      if (typeof clientId === 'string' && clientId.length > 0) {
        data.clientId = clientId;
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
                  c.todoId === todoId &&
                  c.timeslotId === timeslotId &&
                  c.memberId === memberId
                )
            );
          } else {
            // Add the completion (complete)
            const newCompletion: TodoCompletion = {
              id: Date.now(), // Temporary ID
              todoId: todoId,
              timeslotId: timeslotId,
              memberId: memberId,
              completionDate: selectedDate,
              completedAt: new Date(),
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
      // Invalidate member points for rewards
      queryClient.invalidateQueries({
        queryKey: ["memberPoints", variables.memberId],
      });
    },
  });
}
