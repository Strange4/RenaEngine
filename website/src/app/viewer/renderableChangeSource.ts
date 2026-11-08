// This file is temporary and will imitates the game server's renderable change source.
// It provides a mock implementation of the RenderableChangeSource interface,
// returning a predefined set of renderable changes for testing purposes.

import { RenderableType, type RenderableChange } from "@/shared/renderable";

type RenderableChangeCallback = (changes: RenderableChange) => void;

export interface RenderableChangeSource {
  setChangelisteneter(callback: RenderableChangeCallback): void;
  getAllChanges(): RenderableChange[];
  close(): void;
}

export class SSERenderableChangeSource implements RenderableChangeSource {
  private changes: RenderableChange[] = [];
  private sse: EventSource;

  constructor(
    Url: string,
    private callback?: RenderableChangeCallback,
  ) {
    this.sse = new EventSource(Url, {
      withCredentials: true
    });
    this.sse.addEventListener("change", (e) => this.onChange(e));
  }

  setChangelisteneter(callback: RenderableChangeCallback): void {
    this.callback = callback;
  }

  getAllChanges(): RenderableChange[] {
    return this.changes;
  }

  close() {
    this.sse.close();
  }

  private onChange(e: MessageEvent<string>) {
    const change: RenderableChange = JSON.parse(e.data);
    this.changes.push(change);
    this.callback?.call(undefined, change);
  }
}
