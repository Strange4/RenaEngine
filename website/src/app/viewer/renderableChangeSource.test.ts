import { RenderableChange, RenderableType } from "@/shared/renderable";
import {
  RecordedRenderableChangeSource,
  SSERenderableChangeSource,
} from "./renderableChangeSource";


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


describe("SSERenderableChangeSource", () => {
  it("parses SSE change events and forwards them to the callback", () => {
    const originalEventSource = global.EventSource;
    const addEventListener = jest.fn();
    const close = jest.fn();

    global.EventSource = jest.fn().mockImplementation(() => ({
      addEventListener,
      close,
    })) as any;

    try {
      const callback = jest.fn();
      const source = new SSERenderableChangeSource("/api/test", callback);
      const change = MOCK_RENDERABLE_CHANGES[0];
      const eventListener = addEventListener.mock.calls[0][1];

      eventListener({ data: JSON.stringify(change) });

      expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(change);
      expect(source.getAllChanges()).toEqual([change]);
      source.close();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      global.EventSource = originalEventSource;
    }
  });

  it("close closes the underlying EventSource", () => {
    const originalEventSource = global.EventSource;
    const close = jest.fn();

    global.EventSource = jest.fn().mockImplementation(() => ({
      addEventListener: jest.fn(),
      close,
    })) as any;

    try {
      const source = new SSERenderableChangeSource("/api/test");
      source.close();
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      global.EventSource = originalEventSource;
    }
  });
});

describe("RecordedRenderableChangeSource", () => {
  it("sorts the changes by index", () => {
    const outOfOrder = [MOCK_RENDERABLE_CHANGES[2], MOCK_RENDERABLE_CHANGES[0], MOCK_RENDERABLE_CHANGES[1]];
    const source = new RecordedRenderableChangeSource(outOfOrder);

    expect(source.getAllChanges()).toEqual(MOCK_RENDERABLE_CHANGES);
    expect(outOfOrder[0]).toBe(MOCK_RENDERABLE_CHANGES[2]);
  });

  it("never calls the listener", () => {
    const source = new RecordedRenderableChangeSource(MOCK_RENDERABLE_CHANGES);
    const callback = jest.fn();

    source.setChangeListener(callback);
    source.close();

    expect(callback).not.toHaveBeenCalled();
    expect(source.getAllChanges()).toHaveLength(MOCK_RENDERABLE_CHANGES.length);
  });
});
