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

export function getClientId(): string | null {
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
  event: RealtimeEvent
): void {
  switch (event.type) {
    case "task_completed":
    case "task_uncompleted":
      // Invalidate completions with predicate to match any date/token variations
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "completions",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "public-completions",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "memberStats",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "public-member-stats",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "weeklyProgress",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "memberPoints",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "public-member-points",
      });
      break;

    case "timeslot_completed":
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "completions",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "public-completions",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "memberStats",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "public-member-stats",
      });
      break;

    case "achievement_unlocked":
    case "achievement_revoked":
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "memberAchievements",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "memberStats",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "public-member-stats",
      });
      break;

    case "level_up":
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "memberStats",
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "public-member-stats",
      });
      break;

    case "data_refresh":
      // Invalidate based on entity type
      // Use predicate matching to handle query keys with additional parameters (token, date, etc.)
      switch (event.data.entity) {
        case "members":
          queryClient.invalidateQueries({ queryKey: ["members"] });
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === "public-members",
          });
          break;
        case "todos":
          queryClient.invalidateQueries({ queryKey: ["todos"] });
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === "public-todos",
          });
          break;
        case "timeslots":
          queryClient.invalidateQueries({ queryKey: ["timeslots"] });
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === "public-timeslots",
          });
          break;
        case "rewards":
          queryClient.invalidateQueries({ queryKey: ["rewards"] });
          break;
        case "completions":
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === "completions",
          });
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === "public-completions",
          });
          break;
      }
      break;
  }
}

/**
 * Hook for realtime updates via Server-Sent Events
 * Implements exponential backoff for reconnection attempts
 *
 * @param _selectedDate - Unused, kept for API compatibility
 * @param onEvent - Optional callback for handling events (e.g., showing toasts)
 */
export function useRealtime(
  _selectedDate: string,
  onEvent?: EventHandler
): void {
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const onEventRef = useRef(onEvent);

  // Keep refs updated with latest values without causing reconnection
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

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

          invalidateQueries(queryClient, event);
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
