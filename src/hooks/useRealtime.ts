import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  RealtimeEvent,
  SSEEvent,
  SSEConnectionEvent,
} from "../server/realtime";

const SSE_ENDPOINT = "/api/sse";
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_RETRIES = 10;

// Store client ID on window so it persists and is accessible client-side only
function setClientId(id: string): void {
  if (typeof window !== "undefined") {
    (window as { __sseClientId?: string }).__sseClientId = id;
  }
}

function getClientId(): string | null {
  if (typeof window !== "undefined") {
    return (window as { __sseClientId?: string }).__sseClientId || null;
  }
  return null;
}

type EventHandler = (event: RealtimeEvent) => void;

function isConnectionEvent(event: SSEEvent): event is SSEConnectionEvent {
  return event.type === "connected";
}

function isRealtimeEvent(event: SSEEvent): event is RealtimeEvent {
  return event.type !== "connected";
}

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
      queryClient.invalidateQueries({
        queryKey: ["memberStats", event.memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["weeklyProgress", event.memberId],
        exact: false,
      });
      break;

    case "timeslot_completed":
      queryClient.invalidateQueries({
        queryKey: ["completions", selectedDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["memberStats", event.memberId],
      });
      break;

    case "achievement_unlocked":
      queryClient.invalidateQueries({
        queryKey: ["memberAchievements", event.memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["memberStats", event.memberId],
      });
      break;
  }
}

/**
 * Hook for realtime updates via Server-Sent Events
 * Implements exponential backoff for reconnection attempts
 *
 * @param selectedDate - Current selected date for invalidating queries
 * @param onEvent - Optional callback for handling events (e.g., showing toasts)
 */
export function useRealtime(
  selectedDate: string,
  onEvent?: EventHandler
): void {
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const onEventRef = useRef(onEvent);
  const selectedDateRef = useRef(selectedDate);

  // Keep refs updated with latest values without causing reconnection
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    function resetBackoff(): void {
      retryCountRef.current = 0;
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    }

    function getNextDelay(): number {
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * 2,
        MAX_RECONNECT_DELAY
      );
      return delay;
    }

    function connect(): void {
      if (!isMounted) return;

      if (retryCountRef.current >= MAX_RETRIES) {
        console.warn(
          "[Realtime] Max retries reached, stopping reconnection attempts"
        );
        return;
      }

      eventSource = new EventSource(SSE_ENDPOINT);

      eventSource.onopen = () => {
        resetBackoff();
      };

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as SSEEvent;

          // Store client ID from connection event
          if (isConnectionEvent(event)) {
            setClientId(event.clientId);
            return;
          }

          if (!isRealtimeEvent(event)) {
            return;
          }

          // Skip events from this client (own actions)
          const currentClientId = getClientId();
          if (
            event.sourceClientId &&
            currentClientId &&
            event.sourceClientId === currentClientId
          ) {
            return;
          }

          invalidateQueries(queryClient, event, selectedDateRef.current);
          onEventRef.current?.(event);
        } catch (error) {
          console.error("[Realtime] Error parsing event:", error);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;

        if (isMounted && retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          const delay = getNextDelay();
          console.log(
            `[Realtime] Reconnecting in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`
          );
          reconnectTimeout = setTimeout(connect, delay);
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
  }, [queryClient]);
}
