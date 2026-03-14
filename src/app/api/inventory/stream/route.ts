import { inventoryEmitter } from "@/lib/inventory-events";

const encoder = new TextEncoder();

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: inventory\ndata: updated\n\n"));

      const listener = () => {
        controller.enqueue(encoder.encode("event: inventory\ndata: updated\n\n"));
      };

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15000);

      inventoryEmitter.on("inventory-change", listener);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        inventoryEmitter.off("inventory-change", listener);
        controller.close();
      });
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
