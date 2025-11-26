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
    todoId: number;
    timeslotId: number;
  };
};

export type TaskUncompletedEvent = {
  type: "task_uncompleted";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    todoId: number;
    timeslotId: number;
  };
};

export type TimeslotCompletedEvent = {
  type: "timeslot_completed";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    timeslotId: number;
  };
};

export type AchievementUnlockedEvent = {
  type: "achievement_unlocked";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    achievementId: number;
    achievementName: string;
  };
};

export type AchievementRevokedEvent = {
  type: "achievement_revoked";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    achievementId: number;
    achievementName: string;
  };
};

export type LevelUpEvent = {
  type: "level_up";
  sourceClientId?: string;
  memberId: number;
  memberName?: string;
  timestamp: number;
  data: {
    previousLevel: number;
    newLevel: number;
  };
};

export type RealtimeEvent =
  | TaskCompletedEvent
  | TaskUncompletedEvent
  | TimeslotCompletedEvent
  | AchievementUnlockedEvent
  | AchievementRevokedEvent
  | LevelUpEvent;

export type SSEEvent = SSEConnectionEvent | RealtimeEvent;

// Store active SSE connections with their client IDs and family IDs
interface SSEConnection {
  controller: ReadableStreamDefaultController;
  clientId: string;
  familyId: number;
}

// Use globalThis to ensure the connections map is shared across all server contexts
// This is necessary because Nitro/Vite may bundle server code into different chunks
declare global {
  // eslint-disable-next-line no-var
  var __sseConnectionsByFamily: Map<number, Map<string, SSEConnection>> | undefined;
}

if (!globalThis.__sseConnectionsByFamily) {
  globalThis.__sseConnectionsByFamily = new Map<number, Map<string, SSEConnection>>();
}

const connectionsByFamily = globalThis.__sseConnectionsByFamily;
const encoder = new TextEncoder();

/**
 * Add a new SSE connection to the pool for a specific family
 */
export function addSSEConnection(
  controller: ReadableStreamDefaultController,
  clientId: string,
  familyId: number
): void {
  if (!connectionsByFamily.has(familyId)) {
    connectionsByFamily.set(familyId, new Map());
  }
  connectionsByFamily.get(familyId)!.set(clientId, { controller, clientId, familyId });
}

/**
 * Remove an SSE connection from the pool
 */
export function removeSSEConnection(clientId: string, familyId: number): void {
  const familyConnections = connectionsByFamily.get(familyId);
  if (familyConnections) {
    familyConnections.delete(clientId);
    // Clean up empty family maps
    if (familyConnections.size === 0) {
      connectionsByFamily.delete(familyId);
    }
  }
}

/**
 * Get the current number of active connections for a family
 */
export function getConnectionCount(familyId?: number): number {
  if (familyId !== undefined) {
    return connectionsByFamily.get(familyId)?.size || 0;
  }
  // Total across all families
  let total = 0;
  connectionsByFamily.forEach((familyConnections) => {
    total += familyConnections.size;
  });
  return total;
}

/**
 * Broadcast a realtime event to all connected SSE clients in a specific family
 */
export function broadcastToFamily(familyId: number, event: RealtimeEvent): void {
  const familyConnections = connectionsByFamily.get(familyId);
  if (!familyConnections) return;

  const eventWithTimestamp: RealtimeEvent = {
    ...event,
    timestamp: Date.now(),
  };

  const message = `data: ${JSON.stringify(eventWithTimestamp)}\n\n`;
  const encodedMessage = encoder.encode(message);

  const failedClientIds: string[] = [];

  familyConnections.forEach((connection, clientId) => {
    try {
      connection.controller.enqueue(encodedMessage);
    } catch {
      failedClientIds.push(clientId);
    }
  });

  failedClientIds.forEach((clientId) => familyConnections.delete(clientId));
}

/**
 * Broadcast a realtime event to all connected SSE clients (all families)
 * @deprecated Use broadcastToFamily for tenant isolation
 */
export function broadcast(event: RealtimeEvent): void {
  const eventWithTimestamp: RealtimeEvent = {
    ...event,
    timestamp: Date.now(),
  };

  const message = `data: ${JSON.stringify(eventWithTimestamp)}\n\n`;
  const encodedMessage = encoder.encode(message);

  connectionsByFamily.forEach((familyConnections) => {
    const failedClientIds: string[] = [];

    familyConnections.forEach((connection, clientId) => {
      try {
        connection.controller.enqueue(encodedMessage);
      } catch {
        failedClientIds.push(clientId);
      }
    });

    failedClientIds.forEach((clientId) => familyConnections.delete(clientId));
  });
}
