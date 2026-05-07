export const STREAMING_HEADERS: Record<string, string> = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

export function chainStreamToResponse(stream: AsyncIterable<string>): Response {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream({
    transform(chunk: string, controller) {
      // new Uint8Array(...) ensures the chunk is in the current realm's Uint8Array class
      controller.enqueue(new Uint8Array(encoder.encode(chunk)));
    },
  });

  (async () => {
    const writer = writable.getWriter();
    try {
      for await (const chunk of stream) {
        await writer.write(chunk);
      }
      await writer.close();
    } catch (error) {
      await writer.abort(error);
    }
  })();

  return new Response(readable, { headers: STREAMING_HEADERS });
}
