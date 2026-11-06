export async function createReadableStream(
  participantId: number,
  signal: AbortSignal,
): Promise<ReadableStream | null> {
  let baseUrl = process.env.GAME_SERVER_URL;
  if (!baseUrl) return null;
  baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const url = `${baseUrl}render/stream/${participantId}`;
  const response = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
    },
    signal: signal,
  });
  if (!response.ok) {
    console.log(response.statusText);
    return null;
  }
  return response.body;
}

export function createReadableStreamFromSource(
  eventSource: EventSource,
): ReadableStream {
  return new ReadableStream<string>({
    start(controller) {
      eventSource.addEventListener("change", (event: MessageEvent<string>) => {
        controller.enqueue(event.data);
      });
    },
  });
}
