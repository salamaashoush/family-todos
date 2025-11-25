import { createFileRoute } from "@tanstack/react-router";
import { addSSEConnection, removeSSEConnection } from "../../server/realtime";

const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds

/**
 * Generate a unique client ID
 */
function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

interface SSEController extends ReadableStreamDefaultController {
  cleanup?: () => void;
  clientId?: string;
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
        const clientId = generateClientId();

        const stream = new ReadableStream({
          start(controller: SSEController) {
            controller.clientId = clientId;

            // Register connection with client ID
            addSSEConnection(controller, clientId);

            // Send initial connection event with client ID
            sendConnectionEvent(controller, clientId);

            // Setup keep-alive
            const keepAlive = createKeepAlive(controller);

            // Store cleanup function
            controller.cleanup = () => {
              clearInterval(keepAlive);
              removeSSEConnection(clientId);
            };
          },

          cancel(controller: SSEController) {
            controller.cleanup?.();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no", // Disable buffering in nginx
          },
        });
      },
    },
  },
});
