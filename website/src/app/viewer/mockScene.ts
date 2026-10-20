import { RenderableType, type GameRenderable, type ViewerSetup } from "@/shared/renderable";
import type { SceneSource } from "./sceneSource";

export const MOCK_VIEWER_SETUP: ViewerSetup = {
  // 20 x 15 tiles of 40px fills the 800 x 600 canvas exactly
  tileSize: 40,
  resolution: [800, 600],
};

export const MOCK_GRID_SIZE: [number, number] = [
  MOCK_VIEWER_SETUP.resolution[0] / MOCK_VIEWER_SETUP.tileSize,
  MOCK_VIEWER_SETUP.resolution[1] / MOCK_VIEWER_SETUP.tileSize,
];

function tiles(
  prefix: string,
  assetPath: string,
  layer: number,
  [startX, startY]: [number, number],
  [width, height]: [number, number],
): GameRenderable[] {
  const result: GameRenderable[] = [];
  for (let y = startY; y < startY + height; y++) {
    for (let x = startX; x < startX + width; x++) {
      result.push({
        id: `${prefix}-${x}-${y}`,
        position: [x, y],
        assetPath,
        size: [1, 1],
        type: RenderableType.MAP,
        layer,
      });
    }
  }
  return result;
}

const MAP: GameRenderable[] = [
  ...tiles("grass", "/sprites/grass.png", 0, [0, 0], MOCK_GRID_SIZE),
  ...tiles("water", "/sprites/water.svg", 1, [11, 2], [8, 6]),
];

const OBJECTS: GameRenderable[] = [
  { id: "ship-1", position: [12, 3], assetPath: "/sprites/ship1.png", size: [4, 1], type: RenderableType.OBJECT, layer: 1 },
  { id: "ship-2", position: [13, 6], assetPath: "/sprites/ship1.png", size: [4, 1], type: RenderableType.OBJECT, layer: 1 },
  { id: "rena-front", position: [4, 8], assetPath: "/sprites/rena.png", size: [2, 2], type: RenderableType.OBJECT, layer: 2 },
  { id: "rena-back", position: [5, 9], assetPath: "/sprites/rena.png", size: [2, 2], type: RenderableType.OBJECT, layer: 1 },
];

const DECORATIONS: GameRenderable[] = [
  { id: "flag-1", position: [2, 2], assetPath: "/sprites/flag.svg", size: [1, 1], type: RenderableType.DECORATION, layer: 0 },
  { id: "flag-2", position: [17, 11], assetPath: "/sprites/flag.svg", size: [1, 1], type: RenderableType.DECORATION, layer: 0 },
  { id: "cloud", position: [12, 5], assetPath: "/sprites/cloud.svg", size: [3, 3], type: RenderableType.DECORATION, layer: 0 },
];

export const MOCK_SCENE: GameRenderable[] = [...MAP, ...OBJECTS, ...DECORATIONS];

export const mockSceneSource: SceneSource = {
  getInitialScene: async () => ({ setup: MOCK_VIEWER_SETUP, renderables: MOCK_SCENE }),
};