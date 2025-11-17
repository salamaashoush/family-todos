"use server";

export type RealtimeEvent = {
  type:
    | "task_completed"
    | "task_uncompleted"
    | "timeslot_completed"
    | "achievement_unlocked";
  memberId: number;
  memberName?: string;
  data: any;
  timestamp: number;
};

// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();
const encoder = new TextEncoder();

/**
 * Add a new SSE connection to the pool
 */
export function addSSEConnection(controller: ReadableStreamDefaultController): void {
  connections.add(controller);
}

/**
 * Remove an SSE connection from the pool
 */
export function removeSSEConnection(controller: ReadableStreamDefaultController): void {
  connections.delete(controller);
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

  let failedConnections = 0;

  connections.forEach((controller) => {
    try {
      controller.enqueue(encodedMessage);
    } catch (error) {
      failedConnections++;
      connections.delete(controller);
    }
  });

  if (failedConnections > 0 && connections.size === 0) {
    // All connections failed, no one to notify
    return;
  }
}
