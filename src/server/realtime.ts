"use server";

export type SSEConnectionEvent = {
  type: "connected";
  clientId: string;
  timestamp: number;
};

export type TaskCompletedEvent = {
  type: "task_completed";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    todo_id: number;
    timeslot_id: number;
  };
};

export type TaskUncompletedEvent = {
  type: "task_uncompleted";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    todo_id: number;
    timeslot_id: number;
  };
};

export type TimeslotCompletedEvent = {
  type: "timeslot_completed";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    timeslot_id: number;
  };
};

export type AchievementUnlockedEvent = {
  type: "achievement_unlocked";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    achievement_id: number;
    achievement_name: string;
  };
};

export type RealtimeEvent =
  | TaskCompletedEvent
  | TaskUncompletedEvent
  | TimeslotCompletedEvent
  | AchievementUnlockedEvent;

export type SSEEvent = SSEConnectionEvent | RealtimeEvent;

// Store active SSE connections with their client IDs
interface SSEConnection {
  controller: ReadableStreamDefaultController;
  clientId: string;
}

const connections = new Map<string, SSEConnection>();
const encoder = new TextEncoder();


/**
 * Add a new SSE connection to the pool
 */
export function addSSEConnection(controller: ReadableStreamDefaultController, clientId: string): void {
  connections.set(clientId, { controller, clientId });
}

/**
 * Remove an SSE connection from the pool
 */
export function removeSSEConnection(clientId: string): void {
  connections.delete(clientId);
}

/**
 * Get the current number of active connections
 */
export function getConnectionCount(): number {
  return connections.size;
}

/**
 * Broadcast a realtime event to all connected SSE clients
 */
export function broadcast(event: RealtimeEvent): void {
  const eventWithTimestamp: RealtimeEvent = {
    ...event,
    timestamp: Date.now(),
  };

  const message = `data: ${JSON.stringify(eventWithTimestamp)}\n\n`;
  const encodedMessage = encoder.encode(message);

  const failedClientIds: string[] = [];

  connections.forEach((connection, clientId) => {
    try {
      connection.controller.enqueue(encodedMessage);
    } catch {
      failedClientIds.push(clientId);
    }
  });

  failedClientIds.forEach((clientId) => connections.delete(clientId));
}
