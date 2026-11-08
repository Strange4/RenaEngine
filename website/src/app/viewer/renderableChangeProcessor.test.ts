import { RenderableType, type GameRenderable, type RenderableChange } from "@/shared/renderable";
import { RenderableChangeProcessor } from "./renderableChangeProcessor";
import type { RenderableHandlers } from "./renderableHandler";
import type { RenderableChangeSource } from "./renderableChangeSource";

const baseRenderable: GameRenderable = {
  id: "base",
  position: [0, 0],
  assetPath: "/sprites/base.png",
  size: [1, 1],
  rotation: 0,
  type: RenderableType.OBJECT,
  layer: 0,
};

function change(...renderables: GameRenderable[]): RenderableChange {
  return { index: 1, changes: renderables };
}

function handlers(): RenderableHandlers & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    create: jest.fn(async (renderable) => {
      calls.push(`create:${renderable.id}`);
    }),
    update: jest.fn(async (renderable) => {
      calls.push(`update:${renderable.id}`);
    }),
    remove: jest.fn(async (id) => {
      calls.push(`remove:${id}`);
    }),
  };
}

function sourceStub(): RenderableChangeSource & {
  emit: (change: RenderableChange) => void;
} {
  let listener: ((change: RenderableChange) => void) | undefined;

  return {
    setChangelisteneter: jest.fn((callback) => {
      listener = callback;
    }),
    getAllChanges: jest.fn(() => []),
    close: jest.fn(),
    emit: (change) => listener?.(change),
  };
}

describe("RenderableChangeProcessor", () => {
  it("creates new renderables and keeps them in the current state", async () => {
    const testHandlers = handlers();
    const processor = new RenderableChangeProcessor(testHandlers, sourceStub());
    const first = { ...baseRenderable, id: "first" };
    const second = { ...baseRenderable, id: "second" };

    await processor.process(change(first, second));

    expect(testHandlers.calls).toEqual(["create:first", "create:second"]);
    expect(processor.getCurrentState()).toEqual([first, second]);
  });

  it("updates renderables when their data changes and ignores unchanged ones", async () => {
    const testHandlers = handlers();
    const current: GameRenderable = { ...baseRenderable, id: "existing", position: [1, 1] };
    const processor = new RenderableChangeProcessor(testHandlers, sourceStub());
    processor.process(change(current));
    await processor.process(change(current, { ...current, position: [3, 3] }));

    expect(testHandlers.calls).toEqual(["create:existing", "update:existing"]);
    expect(processor.getCurrentState()).toEqual([
      { ...current, position: [3, 3] },
    ]);
  });

  it("removes renderables when the removed flag is set and ignores missing removals", async () => {
    const testHandlers = handlers();
    const existing = { ...baseRenderable, id: "ship" };
    const processor = new RenderableChangeProcessor(testHandlers, sourceStub());
    await processor.process(change(existing));

    await processor.process(change({ ...existing, removed: true }, { ...baseRenderable, id: "ghost", removed: true }));

    expect(testHandlers.calls).toEqual(["create:ship", "remove:ship"]);
    expect(processor.getCurrentState()).toEqual([]);
  });

  it("calls the change source listener when the source emits a change", async () => {
    const testHandlers = handlers();
    const source = sourceStub();
    const processor = new RenderableChangeProcessor(testHandlers, source);
    const added = { ...baseRenderable, id: "from-source" };

    source.emit(change(added));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(source.setChangelisteneter).toHaveBeenCalledTimes(1);
    expect(testHandlers.calls).toEqual(["create:from-source"]);
    expect(processor.getCurrentState()).toEqual([added]);
  });

  it("keeps queued calls in the same order they were issued", async () => {
    const testHandlers = handlers();
    const processor = new RenderableChangeProcessor(testHandlers, sourceStub());
    const first = { ...baseRenderable, id: "first" };
    const second = { ...baseRenderable, id: "second" };

    const firstCall = processor.process(change(first));
    const secondCall = processor.process(change(second));

    await Promise.all([firstCall, secondCall]);

    expect(testHandlers.calls).toEqual(["create:first", "create:second"]);
    expect(processor.getCurrentState()).toEqual([first, second]);
  });

  it("applies create, update, and remove operations inside a single change payload", async () => {
    const testHandlers = handlers();
    const processor = new RenderableChangeProcessor(testHandlers, sourceStub());
    const existing: GameRenderable = { ...baseRenderable, id: "existing", position: [2, 2] };
    const updated: GameRenderable = { ...existing, position: [4, 4] };
    const created = { ...baseRenderable, id: "created" };
    const removed = { ...baseRenderable, id: "to-remove" };

    await processor.process(change(existing, created, updated, removed));
    await processor.process(change({ ...removed, removed: true }));

    expect(testHandlers.calls).toEqual([
      "create:existing",
      "create:created",
      "update:existing",
      "create:to-remove",
      "remove:to-remove",
    ]);
    expect(processor.getCurrentState()).toEqual([
      { ...updated, position: [4, 4] },
      created,
    ]);
  });

  it("treats a removed id as a fresh renderable when it reappears later", async () => {
    const testHandlers = handlers();
    const processor = new RenderableChangeProcessor(testHandlers, sourceStub());
    const ship = { ...baseRenderable, id: "ship" };

    await processor.process(change(ship));
    await processor.process(change({ ...ship, removed: true }));
    await processor.process(change(ship));

    expect(testHandlers.calls).toEqual(["create:ship", "remove:ship", "create:ship"]);
    expect(processor.getCurrentState()).toEqual([ship]);
  });

  it("disposes without running further handlers and closes the source", async () => {
    const testHandlers = handlers();
    const source = sourceStub();
    const processor = new RenderableChangeProcessor(testHandlers, source);

    processor.dispose();
    await processor.process(change({ ...baseRenderable, id: "after-dispose" }));

    expect(testHandlers.calls).toEqual([]);
    expect(source.close).toHaveBeenCalledTimes(1);
    expect(processor.getCurrentState()).toEqual([]);
  });
});
