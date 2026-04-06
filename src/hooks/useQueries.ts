import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  completeTodo,
  uncompleteTodo,
} from "../server/completions";
import { getWeeklyProgress } from "../server/progress";
import { getMemberPoints } from "../server/rewards";
import { useCurrentFamilyId } from "./useFamilyContext";
import type { TodoCompletion } from "../types";
import { queryClient as collectionsQueryClient } from "../collections/queryClient";

// Get client ID from window if available (client-side only)
function getClientId(): string | null {
  if (typeof window !== 'undefined') {
    return (window as { __sseClientId?: string }).__sseClientId || null;
  }
  return null;
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

    onSettled: (_data, _error, variables) => {
      // Invalidate collections to refetch fresh data
      collectionsQueryClient.invalidateQueries({ queryKey: ["completions"] });
      collectionsQueryClient.invalidateQueries({ queryKey: ["memberStats"] });
      collectionsQueryClient.invalidateQueries({ queryKey: ["achievements"] });

      // Invalidate derived queries
      queryClient.invalidateQueries({
        queryKey: ["weeklyProgress", familyId, variables.memberId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["memberPoints", familyId, variables.memberId],
      });
    },
  });
}
