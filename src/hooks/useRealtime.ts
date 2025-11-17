import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeEvent } from "../server/realtime";

const SSE_ENDPOINT = "/api/sse";
const RECONNECT_DELAY = 3000; // 3 seconds

type EventHandler = (event: RealtimeEvent) => void;

/**
 * Invalidate queries based on event type
 */
function invalidateQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  event: RealtimeEvent,
  selectedDate: string
): void {
  switch (event.type) {
    case "task_completed":
    case "task_uncompleted":
      queryClient.invalidateQueries({
        queryKey: ["completions", selectedDate],
      });
      queryClient.invalidateQueries({ queryKey: ["memberStats"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyProgress"] });
      break;

    case "timeslot_completed":
      queryClient.invalidateQueries({
        queryKey: ["completions", selectedDate],
      });
      queryClient.invalidateQueries({ queryKey: ["memberStats"] });
      break;

    case "achievement_unlocked":
      queryClient.invalidateQueries({ queryKey: ["memberAchievements"] });
      queryClient.invalidateQueries({ queryKey: ["memberStats"] });
      break;
  }
}

/**
 * Hook for realtime updates via Server-Sent Events
 *
 * @param selectedDate - Current selected date for invalidating queries
 * @param onEvent - Optional callback for handling events (e.g., showing toasts)
 */
export function useRealtime(
  selectedDate: string,
  onEvent?: EventHandler
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    function connect(): void {
      if (!isMounted) return;

      eventSource = new EventSource(SSE_ENDPOINT);

      eventSource.onopen = () => {
        // Connection established
      };

      eventSource.onmessage = (e) => {
        try {
          const event: RealtimeEvent = JSON.parse(e.data);

          // Skip connection event
          if (event.type === "connected") {
            return;
          }

          // Invalidate queries
          invalidateQueries(queryClient, event, selectedDate);

          // Call event handler if provided
          onEvent?.(event);
        } catch (error) {
          console.error("[Realtime] Error parsing event:", error);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;

        // Attempt reconnection if still mounted
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, RECONNECT_DELAY);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient, selectedDate, onEvent]);
}
