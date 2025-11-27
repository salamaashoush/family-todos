import { createFileRoute } from "@tanstack/react-router";
import { addSSEConnection, removeSSEConnection } from "../../server/realtime";
import { useAppSession } from "../../utils/session";

const KEEP_ALIVE_INTERVAL = 15000; // 15 seconds - shorter for Cloudflare compatibility

/**
 * Generate a unique client ID
 */
function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

interface SSEController extends ReadableStreamDefaultController {
  cleanup?: () => void;
  clientId?: string;
  familyId?: number;
}

/**
 * Create SSE keep-alive interval
 */
function createKeepAlive(
  controller: ReadableStreamDefaultController
): NodeJS.Timeout {
  return setInterval(() => {
    try {
      controller.enqueue(new TextEncoder().encode(": ping\n\n"));
    } catch {
      // Connection is closed, interval will be cleared by cleanup
    }
  }, KEEP_ALIVE_INTERVAL);
}

/**
 * Send initial connection event with client ID
 */
function sendConnectionEvent(
  controller: ReadableStreamDefaultController,
  clientId: string
): void {
  const event = {
    type: "connected",
    clientId,
    timestamp: Date.now(),
  };
  const message = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

/**
 * Server-Sent Events endpoint for realtime updates
 */
export const Route = createFileRoute("/api/sse")({
  component: () => null,
  server: {
    handlers: {
      GET: async () => {
        // Get family ID from session
        const session = await useAppSession();
        const familyId = session.data.currentFamilyId;

        // If no family ID, use a default guest family (ID 0) for non-authenticated users
        // This allows the app to work without authentication during development
        const effectiveFamilyId = familyId ?? 0;

        const clientId = generateClientId();

        let cleanup: (() => void) | null = null;

        const stream = new ReadableStream({
          start(controller: SSEController) {
            controller.clientId = clientId;
            controller.familyId = effectiveFamilyId;

            // Register connection with client ID and family ID
            addSSEConnection(controller, clientId, effectiveFamilyId);

            // Send initial connection event with client ID
            sendConnectionEvent(controller, clientId);

            // Setup keep-alive
            const keepAlive = createKeepAlive(controller);

            // Store cleanup function in outer scope
            cleanup = () => {
              clearInterval(keepAlive);
              removeSSEConnection(clientId, effectiveFamilyId);
            };
          },

          cancel() {
            cleanup?.();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "CF-Cache-Status": "DYNAMIC",
          },
        });
      },
    },
  },
});
