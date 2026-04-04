import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
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
import { useCurrentFamilyId } from "./useFamilyContext";
import type { TodoCompletion } from "../types";

// Get client ID from window if available (client-side only)
function getClientId(): string | null {
  if (typeof window !== 'undefined') {
    return (window as { __sseClientId?: string }).__sseClientId || null;
  }
  return null;
}

export function useCompletions(selectedDate: string) {
  const familyId = useCurrentFamilyId();
  return useQuery({
    queryKey: ["completions", familyId, selectedDate],
    queryFn: () => getTodoCompletions({ data: { date: selectedDate } }),
    enabled: familyId !== undefined,
  });
}

export function useMemberStats(memberId: number) {
  const familyId = useCurrentFamilyId();
  return useQuery({
    queryKey: ["memberStats", familyId, memberId],
    queryFn: () => getMemberStats({ data: { memberId } }),
    enabled: familyId !== undefined,
  });
}

export function useMemberAchievements(memberId: number) {
  const familyId = useCurrentFamilyId();
  return useQuery({
    queryKey: ["memberAchievements", familyId, memberId],
    queryFn: () => getMemberAchievements({ data: { memberId } }),
    enabled: familyId !== undefined,
  });
}

export function useAllAchievements() {
  const familyId = useCurrentFamilyId();
  return useQuery({
    queryKey: ["achievements", familyId],
    queryFn: () => getAllAchievements(),
    enabled: familyId !== undefined,
  });
}

export function useWeeklyProgress(memberId: number, startDate: string) {
  const familyId = useCurrentFamilyId();
  return useQuery({
    queryKey: ["weeklyProgress", familyId, memberId, startDate],
    queryFn: () =>
      getWeeklyProgress({
        data: { memberId, startDate },
      }),
    enabled: familyId !== undefined,
  });
}

export function useMemberPoints(memberId: number) {
  const familyId = useCurrentFamilyId();
  return useQuery({
    queryKey: ["memberPoints", familyId, memberId],
    queryFn: () => getMemberPoints({ data: { memberId } }),
    enabled: familyId !== undefined,
  });
}

interface ToggleTodoParams {
  todoId: number;
  timeslotId: number;
  memberId: number;
  selectedDate: string;
  isCompleted: boolean;
  familyId?: number;
}

export function useToggleTodoMutation() {
  const queryClient = useQueryClient();
  const familyId = useCurrentFamilyId();

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
        queryKey: ["completions", familyId, selectedDate],
      });

      // Snapshot the previous value
      const previousCompletions = queryClient.getQueryData<TodoCompletion[]>([
        "completions",
        familyId,
        selectedDate,
      ]);

      // Optimistically update completions
      queryClient.setQueryData<TodoCompletion[]>(
        ["completions", familyId, selectedDate],
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

      return { previousCompletions, memberId, selectedDate, familyId };
    },

    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousCompletions) {
        queryClient.setQueryData(
          ["completions", context.familyId, variables.selectedDate],
          context.previousCompletions
        );
      }
    },

    onSettled: (_data, _error, variables, context) => {
      const fId = context?.familyId;
      // Invalidate to refetch fresh data - use specific member ID
      queryClient.invalidateQueries({
        queryKey: ["completions", fId, variables.selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["memberStats", fId, variables.memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["memberAchievements", fId, variables.memberId],
      });
      // Invalidate weekly progress for this specific member
      queryClient.invalidateQueries({
        queryKey: ["weeklyProgress", fId, variables.memberId],
        exact: false,
      });
      // Invalidate member points for rewards
      queryClient.invalidateQueries({
        queryKey: ["memberPoints", fId, variables.memberId],
      });
    },
  });
}
