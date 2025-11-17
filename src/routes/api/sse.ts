import { createFileRoute } from "@tanstack/react-router";
import { addSSEConnection, removeSSEConnection } from "../../server/realtime";

const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds

interface SSEController extends ReadableStreamDefaultController {
  cleanup?: () => void;
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
    } catch (error) {
      // Connection is closed, interval will be cleared by cleanup
    }
  }, KEEP_ALIVE_INTERVAL);
}

/**
 * Send initial connection event
 */
function sendConnectionEvent(
  controller: ReadableStreamDefaultController
): void {
  const event = {
    type: "connected",
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
        const stream = new ReadableStream({
          start(controller: SSEController) {
            // Register connection
            addSSEConnection(controller);

            // Send initial connection event
            sendConnectionEvent(controller);

            // Setup keep-alive
            const keepAlive = createKeepAlive(controller);

            // Store cleanup function
            controller.cleanup = () => {
              clearInterval(keepAlive);
              removeSSEConnection(controller);
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
