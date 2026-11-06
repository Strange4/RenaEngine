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

export const MOCK_RENDERABLE_CHANGES: RenderableChange[] = [
  {
    index: 1,
    changes: [
      {
        id: "ship-1",
        position: [13, 3],
        assetPath: "/sprites/ship1.png",
        size: [4, 1],
        type: RenderableType.OBJECT,
        layer: 1,
      },
    ],
  },
  {
    index: 2,
    changes: [
      {
        id: "flag-3",
        position: [10, 10],
        assetPath: "/sprites/flag.svg",
        size: [1, 1],
        type: RenderableType.DECORATION,
        layer: 0,
      },
    ],
  },
  {
    index: 3,
    changes: [
      {
        id: "ship-2",
        position: [13, 6],
        assetPath: "/sprites/ship1.png",
        size: [4, 1],
        type: RenderableType.OBJECT,
        layer: 1,
        removed: true,
      },
    ],
  },
];

export class MockRenderablChangeSource implements RenderableChangeSource {
  private timeout: NodeJS.Timeout | null = null;
  private currentIndex: number = 0;

  constructor(
    private allChanges: RenderableChange[] = [],
    private callBack?: RenderableChangeCallback,
  ) {}

  getAllChanges() {
    return this.allChanges;
  }

  setChangelisteneter(callback: RenderableChangeCallback) {
    this.callBack = callback;
  }

  advance() {
    this.callBack?.call(undefined, this.allChanges[this.currentIndex]);
    this.currentIndex++;
  }

  start() {
    this.timeout = setInterval(() => {
      this.callBack?.call(undefined, this.allChanges[this.currentIndex]);
      this.currentIndex++;
      if (this.currentIndex == this.allChanges.length) {
        this.stop();
      }
    });
  }

  stop() {
    if (this.timeout) {
      clearInterval(this.timeout);
    }
  }

  close() {}
}

export class SSERenderableChangeSource implements RenderableChangeSource {
  private changes: RenderableChange[] = [];
  private sse: EventSource;

  constructor(
    Url: string,
    private callback?: RenderableChangeCallback,
  ) {
    this.sse = new EventSource(Url);
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

export const mockRenderableChangeSource = new MockRenderablChangeSource(
  MOCK_RENDERABLE_CHANGES,
);
