import { inventoryEmitter } from "@/lib/inventory-events";

const encoder = new TextEncoder();

const MAX_CONNECTIONS = 100;

// Survives HMR module reloads in dev, same trick as inventoryEmitter.
const globalForStream = globalThis as unknown as { sseConnectionCount?: number };
globalForStream.sseConnectionCount ??= 0;

inventoryEmitter.setMaxListeners(MAX_CONNECTIONS + 10);

export async function GET(request: Request) {
  if (globalForStream.sseConnectionCount! >= MAX_CONNECTIONS) {
    return new Response("Too many open streams.", {
      status: 503,
      headers: { "Retry-After": "10" },
    });
  }

  globalForStream.sseConnectionCount!++;

  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      cleanup = () => {
        if (closed) {
          return;
        }
        closed = true;
        clearInterval(keepAlive);
        inventoryEmitter.off("inventory-change", listener);
        globalForStream.sseConnectionCount!--;
        try {
          controller.close();
        } catch {
          // already closed/errored
        }
      };

      // enqueue throws once the client is gone — treat it as a disconnect signal.
      const send = (payload: string) => {
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          cleanup();
        }
      };

      const listener = () => send("event: inventory\ndata: updated\n\n");

      // keepalive doubles as a dead-connection probe for abnormal disconnects.
      const keepAlive = setInterval(() => send(": keepalive\n\n"), 15000);

      inventoryEmitter.on("inventory-change", listener);
      request.signal.addEventListener("abort", cleanup);

      send("event: inventory\ndata: updated\n\n");
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
