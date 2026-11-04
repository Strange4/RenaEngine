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
// pauses for some time to let the fetch happen
const waiting = (ms = 20): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

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

  it("passes the renderable from the change to the create handler", async () => {
    const testHandlers = handlers();
    const created: GameRenderable = {
      id: "new-ship",
      position: [5, 7],
      assetPath: "/sprites/ship1.png",
      size: [3, 1],
      rotation: 90,
      type: RenderableType.OBJECT,
      layer: 2,
    };
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([], 0);

    await processor.process(change(1, created));

    expect(testHandlers.create).toHaveBeenCalledTimes(1);
    expect(testHandlers.create).toHaveBeenCalledWith(created);
    expect(processor.getCurrentState()).toEqual([created]);
  });

  it("does not track a renderable whose creation failed", async () => {
    const testHandlers = handlers();
    const error = new Error("create failed");
    (testHandlers.create as jest.Mock).mockRejectedValueOnce(error);
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([], 0);

    await expect(processor.process(change(1, { ...baseRenderable, id: "broken" }))).rejects.toBe(error);

    expect(processor.getCurrentState()).toEqual([]);
    expect(processor.getLastProcessedIndex()).toBe(0);
  });

  it("ignores removals for renderables that are not shown", async () => {
    const testHandlers = handlers();
    const alreadyRemoved = { ...baseRenderable, id: "already-removed", removed: true };
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([alreadyRemoved], 0);

    await processor.process(change(1, alreadyRemoved, { ...baseRenderable, id: "unknown", removed: true }));

    expect(testHandlers.calls).toEqual([]);
    expect(processor.getCurrentState()).toEqual([]);
  });

  it("removes a renderable only once even if the removal is sent again", async () => {
    const testHandlers = handlers();
    const ship = { ...baseRenderable, id: "ship" };
    const flag = { ...baseRenderable, id: "flag" };
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([ship, flag], 0);

    await processor.process(change(1, { ...ship, removed: true }, flag));
    await processor.process(change(2, { ...ship, removed: true }));

    //flag wasn't marked as removed so it stays
    expect(testHandlers.calls).toEqual(["remove:ship"]);
    expect(processor.getCurrentState()).toEqual([flag]);
  });

  //if an id comes back after being removed, it's treated as a new renderable
  it("creates the renderable again when a removed id comes back", async () => {
    const testHandlers = handlers();
    const ship = { ...baseRenderable, id: "ship" };
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([ship], 0);

    await processor.process(change(1, { ...ship, removed: true }));
    await processor.process(change(2, ship));

    expect(testHandlers.calls).toEqual(["remove:ship", "create:ship"]);
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

  it("resyncs from a fresh scene and applies late buffered changes", async () => {
    const testHandlers = handlers();
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([{ ...baseRenderable, id: "stale" }], 0);

    await processor.process(change(3, { ...baseRenderable, id: "later" }));
    await processor.resync([{ ...baseRenderable, id: "fresh" }], 2);

    expect(testHandlers.calls).toEqual(["remove:stale", "create:fresh", "create:later"]);
    expect(processor.getLastProcessedIndex()).toBe(3);
    processor.dispose();
  });

  //New case patch to test
    it("keeps retrying when the fetched scene is too old to close the gap", async () => {
    const fetchScene = jest
      .fn()
      .mockResolvedValueOnce({ renderables: [], index: 0 }) // not newer than the current state
      .mockResolvedValue({ renderables: [], index: 1 });
    const processor = new RenderableChangeProcessor(handlers(), { gapTimeout: 1, fetchScene });
    processor.initialize([], 0);

    await processor.process(change(2, { ...baseRenderable, id: "second" }));
    await waiting(50);

    expect(fetchScene).toHaveBeenCalledTimes(2);
    expect(processor.getLastProcessedIndex()).toBe(2);
    processor.dispose();
  });

  //cases where we keep track of what renderables got removed while the gap happened-- keep stuff we did not take into account
  //+updating renderables that got changed during the gap
  it("updates changed renderables and skips unchanged ones when resyncing", async () => {
    const testHandlers = handlers();
    const a = { ...baseRenderable, id: "a" };
    const b = { ...baseRenderable, id: "b" };
    const processor = new RenderableChangeProcessor(testHandlers);
    processor.initialize([a, b], 0);

    await processor.resync([a, { ...b, position: [3, 3] }], 1);

    expect(testHandlers.calls).toEqual(["update:b"]);
    expect(processor.getCurrentState().find(({ id }) => id === "b")?.position).toEqual([3, 3]);
  });

  it("drops buffered changes that the fresh scene already includes", async () => {
    jest.useFakeTimers();
    try {
      const testHandlers = handlers();
      const fetchScene = jest.fn();
      const processor = new RenderableChangeProcessor(testHandlers, { gapTimeout: 1000, fetchScene });
      processor.initialize([], 0);

      // Index 1 is missing-- so 2 and 3 wait
      await processor.process(change(2, { ...baseRenderable, id: "second" }));
      await processor.process(change(3, { ...baseRenderable, id: "third" }));

      // The fresh scene is at index 2-- so it already includes change 2
      await processor.resync([{ ...baseRenderable, id: "second" }], 2);

      expect(testHandlers.calls).toEqual(["create:second", "create:third"]);
      expect(processor.getLastProcessedIndex()).toBe(3);

      // If change 2 were still pending it would look like a new gap and trigger a fetch
      jest.advanceTimersByTime(5000);
      expect(fetchScene).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });


  //Gap recovery
  it("resyncs with the fetched scene when the gap times out", async () => {
    const testHandlers = handlers();
    const fetchScene = jest.fn().mockResolvedValue({
      renderables: [{ ...baseRenderable, id: "fresh" }],
      index: 1,
    });
    const processor = new RenderableChangeProcessor(testHandlers, { gapTimeout: 1, fetchScene });
    processor.initialize([], 0);

    await processor.process(change(2, { ...baseRenderable, id: "second" }));
    await waiting();

    expect(fetchScene).toHaveBeenCalledTimes(1);
    expect(testHandlers.calls).toEqual(["create:fresh", "create:second"]);
    expect(processor.getLastProcessedIndex()).toBe(2);
    processor.dispose();
  });

  //Gap recovery
  it("warns and retries when fetching the scene fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const fetchScene = jest
        .fn()
        .mockRejectedValueOnce(new Error("server down"))
        .mockResolvedValue({ renderables: [], index: 1 });
      const processor = new RenderableChangeProcessor(handlers(), { gapTimeout: 1, fetchScene });
      processor.initialize([], 0);

      await processor.process(change(2, { ...baseRenderable, id: "second" }));
      await waiting(50);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(fetchScene).toHaveBeenCalledTimes(2);
      expect(processor.getLastProcessedIndex()).toBe(2);
      processor.dispose();
    } finally {
      warnSpy.mockRestore();
    }
  });

  //when a process gets disposed, it calls no handlers and it cancels the gap timer/ stops
  it("cancels the gap timer when disposed", async () => {
    jest.useFakeTimers();
    try {
      const fetchScene = jest.fn();
      const processor = new RenderableChangeProcessor(handlers(), { gapTimeout: 1000, fetchScene });
      processor.initialize([], 0);

      await processor.process(change(2, { ...baseRenderable, id: "second" }));
      processor.dispose();

      jest.advanceTimersByTime(5000);
      expect(fetchScene).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
