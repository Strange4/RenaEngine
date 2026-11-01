// This file is temporary and will imitates the game server's renderable change source. 
// It provides a mock implementation of the RenderableChangeSource interface, 
// returning a predefined set of renderable changes for testing purposes.

import { RenderableType, type RenderableChange } from "@/shared/renderable";

export interface RenderableChangeSource {
  getChanges(): Promise<RenderableChange[]>;
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

export const mockRenderableChangeSource: RenderableChangeSource = {
  getChanges: async () => MOCK_RENDERABLE_CHANGES,
};
