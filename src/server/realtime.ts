"use server";

import { createServerFn } from "@tanstack/react-start";

export type RealtimeEvent = {
  type:
    | "task_completed"
    | "task_uncompleted"
    | "timeslot_completed"
    | "achievement_unlocked";
  memberId: number;
  memberName?: string;
  data: any;
};

// Store event listeners globally
const eventListeners: Set<(event: RealtimeEvent) => void> = new Set();

export function broadcast(event: RealtimeEvent) {
  eventListeners.forEach((listener) => listener(event));
}

// Async generator for streaming events
export const eventStream = createServerFn({ method: "GET" }).handler(
  async function* () {
    const queue: RealtimeEvent[] = [];
    let resolveNext: ((value: RealtimeEvent) => void) | null = null;

    const listener = (event: RealtimeEvent) => {
      if (resolveNext) {
        resolveNext(event);
        resolveNext = null;
      } else {
        queue.push(event);
      }
    };

    eventListeners.add(listener);

    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          // Wait for next event
          const event = await new Promise<RealtimeEvent>((resolve) => {
            resolveNext = resolve;
          });
          yield event;
        }
      }
    } finally {
      eventListeners.delete(listener);
    }
  }
);
