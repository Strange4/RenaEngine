import { type RenderableChange } from "@/shared/renderable";

type RenderableChangeCallback = (changes: RenderableChange) => void;

export interface RenderableChangeSource {
  setChangeListener(callback: RenderableChangeCallback): void;
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

  setChangeListener(callback: RenderableChangeCallback): void {
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

export class RecordedRenderableChangeSource implements RenderableChangeSource {
  private changes: RenderableChange[];

  constructor(changes: RenderableChange[]) {
    this.changes = [...changes].sort((first, second) => first.index - second.index);
  }

  setChangeListener(_callback: RenderableChangeCallback): void { }

  getAllChanges(): RenderableChange[] {
    return this.changes;
  }

  close(): void { }
}
