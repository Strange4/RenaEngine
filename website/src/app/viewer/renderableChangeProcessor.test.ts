import { RenderableType, type GameRenderable, type RenderableChange } from "@/shared/renderable";
import { RenderableChangeProcessor } from "./renderableChangeProcessor";
import type { RenderableHandlers } from "./renderableHandler";

const baseRenderable: GameRenderable = {
  id: "base",
  position: [0, 0],
  assetPath: "/sprites/base.png",
  size: [1, 1],
  rotation: 0,
  type: RenderableType.OBJECT,
  layer: 0,
};

function change(index: number, ...renderables: GameRenderable[]): RenderableChange {
  return { index, changes: renderables };
}

function handlers(): RenderableHandlers & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    create: jest.fn(async (renderable) => {calls.push(`create:${renderable.id}`);}),
    update: jest.fn(async (renderable) => {calls.push(`update:${renderable.id}`);}),
    remove: jest.fn(async (id) => {calls.push(`remove:${id}`);}),
  };
}

describe("RenderableChangeProcessor", () => {
  it("buffers future indexes and applies them in contiguous order", async () => {
    const testHandlers = handlers();
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([], 0);

    await processor.process(change(2, { ...baseRenderable, id: "second" }));
    expect(testHandlers.calls).toEqual([]);
    expect(processor.getLastProcessedIndex()).toBe(0);

    await processor.process(change(1, { ...baseRenderable, id: "first" }));

    expect(testHandlers.calls).toEqual(["create:first", "create:second"]);
    expect(processor.getLastProcessedIndex()).toBe(2);
    expect(processor.getCurrentState().map(({ id }) => id)).toEqual(["first", "second"]);
  });

  it("routes changes according to the current renderable state", async () => {
    const testHandlers = handlers();
    const initial = { ...baseRenderable, id: "existing" };
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([initial], 0);

    await processor.process(change(1, { ...initial, position: [1, 1] }));
    await processor.process(change(2, { ...initial, removed: true }));
    await processor.process(change(3, { ...baseRenderable, id: "new" }));

    expect(testHandlers.calls).toEqual([
      "update:existing",
      "remove:existing",
      "create:new",
    ]);
    expect(processor.getCurrentState().map(({ id }) => id)).toEqual(["new"]);
  });

  it("ignores duplicate indexes", async () => {
    const testHandlers = handlers();
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([], 0);

    await processor.process(change(1, { ...baseRenderable, id: "first" }));
    await processor.process(change(1, { ...baseRenderable, id: "duplicate" }));

    expect(testHandlers.calls).toEqual(["create:first"]);
    expect(processor.getLastProcessedIndex()).toBe(1);
  });

  it("ignores unchanged renderables in a change", async () => {
    const testHandlers = handlers();
    const existing = { ...baseRenderable, id: "existing" };
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([existing], 0);

    await processor.process(change(1, existing, { ...existing, id: "new" }));

    expect(testHandlers.calls).toEqual(["create:new"]);
    expect(processor.getCurrentState()).toEqual([
      existing,
      { ...existing, id: "new" },
    ]);
  });

  //New tests added for the missing index handling case
  it("fetches the current scene when a missing index blocks later changes", async () => {
    jest.useFakeTimers();
    try {
      // Never resolves, so this test only checks *when* the fetch starts
      const fetchScene = jest.fn(() => new Promise<never>(() => {}));
      const processor = new RenderableChangeProcessor(handlers(), { gapTimeout: 1000, fetchScene });
      processor.initialize([], 0);

      await processor.process(change(2, { ...baseRenderable, id: "second" }));

      jest.advanceTimersByTime(999);
      expect(fetchScene).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(fetchScene).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not fetch the scene once the missing index arrives", async () => {
    jest.useFakeTimers();
    try {
      const fetchScene = jest.fn();
      const processor = new RenderableChangeProcessor(handlers(), { gapTimeout: 1000, fetchScene });
      processor.initialize([], 0);

      await processor.process(change(2, { ...baseRenderable, id: "second" }));
      await processor.process(change(1, { ...baseRenderable, id: "first" }));

      jest.advanceTimersByTime(5000);
      expect(fetchScene).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("resyncs from a fresh scene and applies buffered later changes", async () => {
    const testHandlers = handlers();
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([{ ...baseRenderable, id: "stale" }], 0);

    await processor.process(change(3, { ...baseRenderable, id: "later" }));
    await processor.resync([{ ...baseRenderable, id: "fresh" }], 2);

    expect(testHandlers.calls).toEqual(["remove:stale", "create:fresh", "create:later"]);
    expect(processor.getLastProcessedIndex()).toBe(3);
    processor.dispose();
  });

});
