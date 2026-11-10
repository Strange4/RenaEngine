import type { GameRenderable, RenderableChange } from "@/shared/renderable";
import type { RenderableHandlers } from "./renderableHandler";
import { RenderableChangeProcessor } from "./renderableChangeProcessor";
import { RecordedRenderableChangeSource } from "./renderableChangeSource";

export enum PlaybackState {
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  ENDED = "ENDED",
}

export interface ReplayStatus {
  state: PlaybackState;
  position: number; // how many changes were applied (0 = initial scene)
  length: number;
  speed: number;
}

export type ReplayStatusListener = (status: ReplayStatus) => void;

// Plays back a recorded game using the RenderableChangeProcessor
export class ReplayController {
  private processor: RenderableChangeProcessor;
  private changes: RenderableChange[];
  private position = 0;
  private playing = false;
  private speed = 1;
  private steps = Promise.resolve();
  private listeners = new Set<ReplayStatusListener>();
  private disposed = false;

  constructor(
    handlers: RenderableHandlers,
    recording: RenderableChange[],
    initialRenderables: GameRenderable[] = [],
  ) {
    const source = new RecordedRenderableChangeSource(recording);
    this.changes = source.getAllChanges();
    this.processor = new RenderableChangeProcessor(handlers, source, initialRenderables);
  }

  getStatus(): ReplayStatus {
    let state = PlaybackState.PAUSED;
    if (this.playing) {
      state = PlaybackState.PLAYING;
    } else if (this.position >= this.changes.length) {
      state = PlaybackState.ENDED;
    }
    return { state, position: this.position, length: this.changes.length, speed: this.speed };
  }

  getCurrentState(): GameRenderable[] {
    return this.processor.getCurrentState();
  }

  // returns a function to unsubscribe
  onStatusChange(listener: ReplayStatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Applies the next change in the recording. Returns false if there's none left
  applyNextChange(): Promise<boolean> {
    return this.enqueueStep(() => this.applyNext());
  }

  // TODO (172)
  async stepForward(): Promise<boolean> {
    throw new Error("Stepping forward is not implemented yet (#172)");
  }

  // TODO (171)
  play(): void {
    throw new Error("Playing is not implemented yet (#171)");
  }

  // TODO (171)
  pause(): void {
    throw new Error("Pausing is not implemented yet (#171)");
  }

  // TODO (173)
  async stepBackward(): Promise<boolean> {
    throw new Error("Stepping backward is not implemented yet (#173)");
  }

  // TODO (174)
  setSpeed(_speed: number): void {
    throw new Error("Changing the playback speed is not implemented yet (#174)");
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.processor.dispose();
  }

  // only one change at a time so the position matches what's on screen
  private enqueueStep(step: () => Promise<boolean>): Promise<boolean> {
    const operation = this.steps.then(() => (this.disposed ? false : step()));
    this.steps = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async applyNext(): Promise<boolean> {
    if (this.position >= this.changes.length) {
      return false;
    }
    await this.processor.process(this.changes[this.position]);
    if (this.disposed) {
      return false;
    }
    this.position++;
    this.notify();
    return true;
  }

  private notify(): void {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      listener(status);
    }
  }
}
