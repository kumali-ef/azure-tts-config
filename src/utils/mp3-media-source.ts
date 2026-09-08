/** Progressive MP3 playback target backed by a MediaSource. */
export interface Mp3Sink {
  /** Queue a chunk. Safe to call before the MediaSource has opened. */
  append(chunk: Uint8Array): void;
  /** Signal that no more chunks are coming. */
  end(): void;
  /** Resolves once every queued chunk has been appended and the stream closed. */
  done: Promise<void>;
}

export function isMediaSourceSupported(): boolean {
  return typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg');
}

/**
 * Wires a MediaSource to `audioElement` and returns a sink for MP3 chunks.
 *
 * `SourceBuffer.appendBuffer` throws if called while `updating` is true, so chunks are
 * queued and drained from the `updateend` event. Chunks that arrive before `sourceopen`
 * fires are held in the same queue.
 */
export function createMp3Sink(audioElement: HTMLAudioElement): Mp3Sink {
  const mediaSource = new MediaSource();
  audioElement.src = URL.createObjectURL(mediaSource);

  const pending: Uint8Array[] = [];
  let sourceBuffer: SourceBuffer | null = null;
  let streamDone = false;
  let settled = false;

  let resolveDone!: () => void;
  let rejectDone!: (reason: unknown) => void;
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  // A caller that aborts mid-stream (say, a network error in its read loop) never reaches
  // `await sink.done`, leaving it unobserved. Mark it observed here so a late appendBuffer
  // failure cannot surface as an unhandled rejection. This does not weaken the contract:
  // `.catch()` derives a new promise, so `await sink.done` still rejects as normal.
  void done.catch(() => {});

  const pump = () => {
    if (!sourceBuffer || settled) return;
    try {
      if (pending.length > 0 && !sourceBuffer.updating) {
        sourceBuffer.appendBuffer(pending.shift()!.buffer as ArrayBuffer);
      } else if (streamDone && pending.length === 0 && !sourceBuffer.updating) {
        if (mediaSource.readyState === 'open') mediaSource.endOfStream();
        settled = true;
        resolveDone();
      }
    } catch (err) {
      settled = true;
      rejectDone(err);
    }
  };

  mediaSource.addEventListener(
    'sourceopen',
    () => {
      try {
        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        sourceBuffer.addEventListener('updateend', pump);
        pump();
      } catch (err) {
        settled = true;
        rejectDone(err);
      }
    },
    { once: true },
  );

  return {
    append(chunk: Uint8Array) {
      pending.push(chunk);
      pump();
    },
    end() {
      streamDone = true;
      pump();
    },
    done,
  };
}
