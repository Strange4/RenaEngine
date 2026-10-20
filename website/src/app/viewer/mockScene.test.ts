import fs from "fs";
import path from "path";
import { RenderableType, type GameRenderable } from "@/shared/renderable";

class MockSprite {
  texture: unknown;
  parent: MockContainer | null = null;
  position = {
    x: 0,
    y: 0,
    set: (x: number, y: number) => {
      this.position.x = x;
      this.position.y = y;
    },
  };
  width = 0;
  height = 0;
  zIndex = 0;

  constructor(texture: unknown) {
    this.texture = texture;
  }
}

class MockContainer {
  label = "";
  sortableChildren = false;
  children: MockSprite[] = [];

  addChild(sprite: MockSprite): void {
    sprite.parent = this;
    this.children.push(sprite);
  }
}

jest.doMock("pixi.js", () => ({
  Container: MockContainer,
  Sprite: MockSprite,
  Texture: { WHITE: "placeholder" },
  Assets: {},
}));

const { isLocalAssetPath } = require("./assetLoader") as typeof import("./assetLoader");
const { LiveViewRenderer } = require("./liveViewRenderer") as typeof import("./liveViewRenderer");
const { MOCK_SCENE, MOCK_VIEWER_SETUP, MOCK_GRID_SIZE } = require("./mockScene") as typeof import("./mockScene");
const PUBLIC_DIR = path.join(__dirname, "../../../public");

const byId = (id: string) => {
  const renderable = MOCK_SCENE.find((r) => r.id === id);
  if (!renderable) throw new Error(`Missing renderable ${id}`);
  return renderable;
};

const overlaps = (a: GameRenderable, b: GameRenderable) =>
  a.position[0] < b.position[0] + b.size[0] &&
  b.position[0] < a.position[0] + a.size[0] &&
  a.position[1] < b.position[1] + b.size[1] &&
  b.position[1] < a.position[1] + a.size[1];

async function renderMockScene() {
  const assetLoader = {
    loadFor: jest.fn().mockResolvedValue(undefined),
    getTexture: jest.fn((assetPath: string) => ({ assetPath })),
  };
  const renderer = new LiveViewRenderer(assetLoader as never, MOCK_VIEWER_SETUP);
  await renderer.renderScene(MOCK_SCENE);
  return { renderer, assetLoader };
}

describe("mock scene data", () => {
  it("fills the canvas with a whole number of tiles", () => {
    expect(MOCK_GRID_SIZE).toEqual([20, 15]);
  });

  it("gives every renderable a unique id", () => {
    const ids = MOCK_SCENE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains maps, objects and decorations", () => {
    const types = new Set(MOCK_SCENE.map((r) => r.type));
    expect(types).toEqual(
      new Set([RenderableType.MAP, RenderableType.OBJECT, RenderableType.DECORATION]),
    );
  });

  it("keeps every renderable inside the grid", () => {
    for (const r of MOCK_SCENE) {
      expect(r.position[0]).toBeGreaterThanOrEqual(0);
      expect(r.position[1]).toBeGreaterThanOrEqual(0);
      expect(r.position[0] + r.size[0]).toBeLessThanOrEqual(MOCK_GRID_SIZE[0]);
      expect(r.position[1] + r.size[1]).toBeLessThanOrEqual(MOCK_GRID_SIZE[1]);
    }
  });

  it("covers every tile of the grid with grass", () => {
    const grass = MOCK_SCENE.filter((r) => r.assetPath === "/sprites/grass.png");
    expect(grass).toHaveLength(MOCK_GRID_SIZE[0] * MOCK_GRID_SIZE[1]);
  });

  it.each([...new Set(MOCK_SCENE.map((r) => r.assetPath))])(
    "serves %s from the website's public folder",
    (assetPath) => {
      expect(isLocalAssetPath(assetPath)).toBe(true);
      expect(fs.existsSync(path.join(PUBLIC_DIR, assetPath))).toBe(true);
    },
  );

  it("overlaps renderables so layer ordering is visible", () => {
    expect(overlaps(byId("water-12-3"), byId("grass-12-3"))).toBe(true);
    expect(overlaps(byId("rena-front"), byId("rena-back"))).toBe(true);
    expect(overlaps(byId("cloud"), byId("ship-2"))).toBe(true);
  });
});

describe("rendering the mock scene", () => {
  it("loads every asset of the scene before creating its sprites", async () => {
    const { assetLoader } = await renderMockScene();

    expect(assetLoader.loadFor).toHaveBeenCalledWith(MOCK_SCENE);
    expect(assetLoader.loadFor.mock.invocationCallOrder[0]).toBeLessThan(
      assetLoader.getTexture.mock.invocationCallOrder[0],
    );
  });

  it("creates one sprite per renderable, sized and positioned in pixels", async () => {
    const { renderer } = await renderMockScene();
    const tile = MOCK_VIEWER_SETUP.tileSize;

    for (const r of MOCK_SCENE) {
      const sprite = renderer.getSprite(r.id) as unknown as MockSprite;
      expect(sprite).toBeDefined();
      expect(sprite.texture).toEqual({ assetPath: r.assetPath });
      expect(sprite.position).toMatchObject({ x: r.position[0] * tile, y: r.position[1] * tile });
      expect(sprite.width).toBe(r.size[0] * tile);
      expect(sprite.height).toBe(r.size[1] * tile);
      expect(sprite.zIndex).toBe(r.layer);
      expect(sprite.parent).toBe(renderer.getContainer(r.type));
    }
  });

  it("puts each renderable type in its own container", async () => {
    const { renderer } = await renderMockScene();

    for (const type of Object.values(RenderableType)) {
      expect(renderer.getContainer(type).children).toHaveLength(
        MOCK_SCENE.filter((r) => r.type === type).length,
      );
    }
  });

  it("draws higher layers in front within the same container", async () => {
    const { renderer } = await renderMockScene();

    expect(renderer.getSprite("water-12-3")!.zIndex).toBeGreaterThan(
      renderer.getSprite("grass-12-3")!.zIndex,
    );
    expect(renderer.getSprite("rena-front")!.zIndex).toBeGreaterThan(
      renderer.getSprite("rena-back")!.zIndex,
    );
  });
});
