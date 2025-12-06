import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Toast, showToast } from "../../../components/Toast";
import { FloatingMenu } from "../../../components/FloatingMenu";
import { LayoutSwitcher } from "../../../components/LayoutSwitcher";
import { MemberFocusLayout } from "../../../components/layouts/MemberFocusLayout";
import { TimeslotFocusLayout } from "../../../components/layouts/TimeslotFocusLayout";
import { QuickCheckLayout } from "../../../components/layouts/QuickCheckLayout";
import { FamilyDashboardLayout } from "../../../components/layouts/FamilyDashboardLayout";
import { AchievementUnlockModal } from "../../../components/AchievementUnlockModal";
import { filterTimeslotsByDateString } from "../../../utils/timeslots";
import { DatePicker } from "../../../components/DatePicker";
import { ThemeSwitcher } from "../../../components/ThemeSwitcher";
import { useLayout, useCurrentTimeslot } from "../../../contexts/LayoutContext";
import { useCompletionCelebration } from "../../../hooks/useCompletionCelebration";
import { useAchievementCelebration } from "../../../hooks/useAchievementCelebration";
import { useRealtime, getClientId } from "../../../hooks/useRealtime";
import type { RealtimeEvent } from "../../../server/realtime";
import {
  getFamilyByShareToken,
  getPublicMembers,
  getPublicTimeslots,
  getPublicTodos,
  getPublicCompletions,
  getPublicMemberStats,
  getPublicMemberPoints,
  togglePublicTodo,
} from "../../../server/publicBoard";
import { getPublicPrayerSettings, getPublicAdhanSettings } from "../../../server/prayer";
import { usePrayerTimesInit } from "../../../stores/usePrayerTimesInit";
import { usePrayerTimesStore, selectActiveReminder, selectDismissReminder } from "../../../stores/prayerTimesStore";
import {
  PrayerTimesPanel,
  AdhanFullscreenView,
  PrayerReminderToast,
} from "../../../components/prayer";

// Helper to get date string in local timezone
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const Route = createFileRoute("/family/$token/")({
  loader: async ({ params: { token }, context: { queryClient } }) => {
    const today = getLocalDateString(new Date());

    // Validate token format before making API calls
    // Share tokens are 64 character hex strings
    if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
      throw new Error("Invalid board link");
    }

    try {
      // Preload family data first (required for other queries)
      const family = await queryClient.ensureQueryData({
        queryKey: ["public-family", token],
        queryFn: () => getFamilyByShareToken({ data: { token } }),
      });

      // If family exists, preload all other data in parallel (including prayer times)
      if (family) {
        await Promise.all([
          queryClient.ensureQueryData({
            queryKey: ["public-members", token],
            queryFn: () => getPublicMembers({ data: { token } }),
          }),
          queryClient.ensureQueryData({
            queryKey: ["public-timeslots", token, today],
            queryFn: () => getPublicTimeslots({ data: { token, date: today } }),
          }),
          queryClient.ensureQueryData({
            queryKey: ["public-todos", token],
            queryFn: () => getPublicTodos({ data: { token } }),
          }),
          queryClient.ensureQueryData({
            queryKey: ["public-completions", token, today],
            queryFn: () => getPublicCompletions({ data: { token, date: today } }),
          }),
          queryClient.ensureQueryData({
            queryKey: ["public-member-stats", token],
            queryFn: () => getPublicMemberStats({ data: { token } }),
          }),
          queryClient.ensureQueryData({
            queryKey: ["public-member-points", token],
            queryFn: () => getPublicMemberPoints({ data: { token } }),
          }),
          // Prayer times prefetching
          queryClient.ensureQueryData({
            queryKey: ["public-prayer-settings", token],
            queryFn: () => getPublicPrayerSettings({ data: { token } }),
          }),
          queryClient.ensureQueryData({
            queryKey: ["public-adhan-settings", token],
            queryFn: () => getPublicAdhanSettings({ data: { token } }),
          }),
        ]);
      }

      return { initialDate: today };
    } catch (error) {
      // Re-throw with a user-friendly message
      throw new Error("Invalid board link");
    }
  },
  component: PublicFamilyBoard,
  errorComponent: FamilyBoardError,
});

function FamilyBoardError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Invalid Board Link
        </h1>
        <p className="text-gray-600 mb-6">
          This family board link is invalid or has expired. Please ask your family admin for a new link.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-theme-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}

function PublicFamilyBoard() {
  const { token } = Route.useParams();
  const { initialDate } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Initialize prayer times with Zustand store (handles data fetching and sync)
  usePrayerTimesInit({ publicToken: token });

  // Prayer reminder state from Zustand store
  const activeReminder = usePrayerTimesStore(selectActiveReminder);
  const dismissReminder = usePrayerTimesStore(selectDismissReminder);

  // Layout context for multiple layouts and settings
  const { layout, settings, currentTimeslotId, isHydrated } = useLayout();

  // Achievement celebration hook
  const {
    currentAchievement,
    handleAchievementEvent,
    dismissCurrent: dismissAchievement,
  } = useAchievementCelebration();

  // Handle real-time events with toast notifications
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    // Handle achievement celebration modal
    if (event.type === "achievement_unlocked") {
      handleAchievementEvent(event);
      return; // Don't show toast, the modal handles it
    }

    switch (event.type) {
      case "task_completed":
        if (event.memberName) {
          showToast(`${event.memberName} completed a task!`, "success");
        }
        break;
      case "task_uncompleted":
        // No toast needed for uncomplete
        break;
      case "timeslot_completed":
        if (event.memberName) {
          showToast(`${event.memberName} completed all tasks in a time slot!`, "success");
        }
        break;
      case "achievement_revoked":
        // No toast needed
        break;
      case "level_up":
        if (event.memberName) {
          showToast(`${event.memberName} reached Level ${event.data.newLevel}!`, "success");
        }
        break;
      case "data_refresh":
        // No toast needed - data will be auto-refreshed by useRealtime hook
        break;
    }
  }, [handleAchievementEvent]);

  // Connect to real-time updates
  useRealtime(selectedDate, handleRealtimeEvent);

  // Fetch family info
  const {
    data: family,
    isLoading: familyLoading,
    error: familyError,
  } = useQuery({
    queryKey: ["public-family", token],
    queryFn: () => getFamilyByShareToken({ data: { token } }),
  });

  // Fetch members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["public-members", token],
    queryFn: () => getPublicMembers({ data: { token } }),
    enabled: !!family,
  });

  // Fetch timeslots
  const { data: timeslots } = useQuery({
    queryKey: ["public-timeslots", token, selectedDate],
    queryFn: () => getPublicTimeslots({ data: { token, date: selectedDate } }),
    enabled: !!family,
  });

  // Fetch todos
  const { data: todos } = useQuery({
    queryKey: ["public-todos", token],
    queryFn: () => getPublicTodos({ data: { token } }),
    enabled: !!family,
  });

  // Fetch completions
  const { data: completions } = useQuery({
    queryKey: ["public-completions", token, selectedDate],
    queryFn: () =>
      getPublicCompletions({ data: { token, date: selectedDate } }),
    enabled: !!family,
  });

  // Fetch member stats for gamification display
  const { data: memberStats } = useQuery({
    queryKey: ["public-member-stats", token],
    queryFn: () => getPublicMemberStats({ data: { token } }),
    enabled: !!family,
  });

  // Fetch member points for gamification display
  const { data: memberPoints } = useQuery({
    queryKey: ["public-member-points", token],
    queryFn: () => getPublicMemberPoints({ data: { token } }),
    enabled: !!family,
  });

  // Toggle mutation with optimistic updates
  const toggleMutation = useMutation({
    mutationFn: togglePublicTodo,
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: ["public-completions", token, selectedDate],
      });

      const previousCompletions = queryClient.getQueryData([
        "public-completions",
        token,
        selectedDate,
      ]);

      queryClient.setQueryData(
        ["public-completions", token, selectedDate],
        (old: typeof completions) => {
          if (!old) return old;
          if (variables.data.completed) {
            return [
              ...old,
              {
                id: Date.now(),
                todoId: variables.data.todoId,
                timeslotId: variables.data.timeslotId,
                memberId: variables.data.memberId,
                completionDate: variables.data.date,
                completedAt: new Date().toISOString(),
              },
            ];
          } else {
            return old.filter(
              (c) =>
                !(
                  c.todoId === variables.data.todoId &&
                  c.timeslotId === variables.data.timeslotId &&
                  c.memberId === variables.data.memberId
                )
            );
          }
        }
      );

      return { previousCompletions };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(
        ["public-completions", token, selectedDate],
        context?.previousCompletions
      );
      showToast("Failed to update task", "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-completions", token, selectedDate],
      });
      // Also invalidate stats and points since completing a task awards stars/points
      queryClient.invalidateQueries({
        queryKey: ["public-member-stats", token],
      });
      queryClient.invalidateQueries({
        queryKey: ["public-member-points", token],
      });
    },
  });

  // Filter timeslots by date (recurrence)
  const filteredTimeslots = useMemo(() => {
    if (!timeslots) return [];
    return filterTimeslotsByDateString(timeslots, selectedDate);
  }, [timeslots, selectedDate]);

  // Completion check function
  const isTodoCompleted = useCallback(
    (todoId: number, timeslotId: number, memberId: number) => {
      if (!completions) return false;
      return completions.some(
        (c) =>
          c.todoId === todoId &&
          c.timeslotId === timeslotId &&
          c.memberId === memberId
      );
    },
    [completions]
  );

  // Completion celebration hook
  const { checkAndCelebrate } = useCompletionCelebration({
    timeslots: filteredTimeslots,
    todos: todos || [],
    isTodoCompleted,
  });

  // Handle toggle with celebration
  const handleToggleTodo = useCallback(
    (todoId: number, timeslotId: number, memberId: number, isCompleted: boolean) => {
      // Check for celebration before toggling (if completing)
      if (!isCompleted) {
        checkAndCelebrate(todoId, timeslotId, memberId, true);
      }
      toggleMutation.mutate({
        data: {
          token,
          todoId,
          timeslotId,
          memberId,
          date: selectedDate,
          completed: !isCompleted,
          clientId: getClientId(),
        },
      });
    },
    [token, selectedDate, toggleMutation, checkAndCelebrate]
  );

  // Only highlight current timeslot when viewing today
  useCurrentTimeslot(filteredTimeslots, selectedDate);

  // Filter out parents from view (unless showParentsInLayout is enabled)
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (settings.showParentsInLayout) return members;
    return members.filter((m) => !m.isParent);
  }, [members, settings.showParentsInLayout]);

  // Check if selected date is editable (today or yesterday only)
  const dateEditableInfo = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Calculate yesterday in local timezone
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    // Simple string comparison - today and yesterday are allowed
    if (selectedDate === todayStr || selectedDate === yesterdayStr) {
      return { isEditable: true, reason: undefined };
    }

    // Check if it's a future date or too far in the past
    const [year, month, day] = selectedDate.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day);
    targetDate.setHours(0, 0, 0, 0);

    const todayDate = new Date(now);
    todayDate.setHours(0, 0, 0, 0);

    if (targetDate > todayDate) {
      return { isEditable: false, reason: "Cannot complete tasks for future dates" };
    }

    return { isEditable: false, reason: "Cannot modify tasks more than 1 day in the past" };
  }, [selectedDate]);

  // Invalid token
  if (familyError || (!familyLoading && !family)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Board Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            This family board link is invalid or has been revoked. Please ask
            your family admin for a new link.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-theme-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (familyLoading || membersLoading || !isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
        <div className="max-w-[1920px] mx-auto p-4">
          <div className="flex gap-4 sm:gap-5 lg:gap-6 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-80 sm:w-96 bg-white rounded-2xl shadow-xl overflow-hidden animate-pulse snap-start"
              >
                <div className="h-32 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const layoutProps = {
    members: filteredMembers,
    timeslots: filteredTimeslots,
    todos: todos || [],
    completions: completions || [],
    memberStats: memberStats || [],
    memberPoints: memberPoints || [],
    isTodoCompleted,
    onToggleTodo: handleToggleTodo,
    currentTimeslotId,
    isDateEditable: dateEditableInfo.isEditable,
    dateDisabledReason: dateEditableInfo.reason,
  };

  const renderLayout = () => {
    switch (layout) {
      case "member-focus":
        return <MemberFocusLayout {...layoutProps} />;
      case "timeslot-focus":
        return <TimeslotFocusLayout {...layoutProps} />;
      case "quick-check":
        return <QuickCheckLayout {...layoutProps} />;
      case "family-dashboard":
        return <FamilyDashboardLayout {...layoutProps} />;
      default:
        return <MemberFocusLayout {...layoutProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg-from via-theme-bg-via to-theme-bg-to">
      <Toast />
      <AchievementUnlockModal
        achievement={currentAchievement}
        onClose={dismissAchievement}
      />

      {/* Prayer Times Components */}
      <AdhanFullscreenView />
      <PrayerTimesPanel />

      {/* Prayer Reminder Toast */}
      {activeReminder && (
        <PrayerReminderToast
          prayer={activeReminder}
          minutesBefore={15}
          onDismiss={dismissReminder}
        />
      )}

        {/* Header for public view */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-40 border-b-2 border-theme-primary/20">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 sm:h-6 sm:w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h1 className="hidden sm:block text-lg lg:text-xl font-bold text-gray-800 truncate">
                {family?.name || "Family"} Tasks
              </h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <LayoutSwitcher />
              <DatePicker
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto p-2 sm:p-4 lg:p-6 pb-20">
        {filteredMembers.length > 0 ? (
          renderLayout()
        ) : members && members.length > 0 ? (
          <div className="text-center py-12 sm:py-16">
            <p className="text-xl sm:text-2xl text-gray-600 mb-4">
              All members are parents and hidden from view.
            </p>
            <p className="text-gray-500">
              Ask a parent to adjust the display settings.
            </p>
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <p className="text-xl sm:text-2xl text-gray-600 mb-4">
              No tasks set up yet!
            </p>
            <p className="text-gray-500">
              Ask your family admin to add some tasks.
            </p>
          </div>
        )}
      </div>

      <FloatingMenu token={token} />
    </div>
  );
}
