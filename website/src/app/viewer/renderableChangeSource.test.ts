import { RenderableChange, RenderableType } from "@/shared/renderable";
import {
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
