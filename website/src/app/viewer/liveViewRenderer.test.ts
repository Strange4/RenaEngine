import type { Container } from "pixi.js";
import { RenderableType, type GameRenderable, type ViewerSetup } from "@/shared/renderable";

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

  anchor = {
    x: 0,
    y: 0,
    set: (x: number, y: number) => {
      this.anchor.x = x;
      this.anchor.y = y;
    },
  };

  width = 0;
  height = 0;
  angle = 0;
  zIndex = 0;

  constructor(texture: unknown) {
    this.texture = texture;
  }
}

class MockContainer {
  label = "";
  sortableChildren = false;
  children: (MockContainer | MockSprite)[] = [];

  addChild(...items: (MockContainer | MockSprite)[]): void {
    for (const item of items) {
      if (item instanceof MockSprite) {
        item.parent = this;
      }

      this.children.push(item);
    }
  }
}

// Register mocks before loading the modules that use PixiJS.
jest.doMock("pixi.js", () => ({
  Container: MockContainer,
  Sprite: MockSprite,
}));

jest.doMock("./assetLoader", () => ({
  AssetLoader: jest.fn(),
}));

// Load the renderer after registering the mocks.
const { LiveViewRenderer } = require("./liveViewRenderer") as
  typeof import("./liveViewRenderer");

const { AssetLoader } = require("./assetLoader") as
  typeof import("./assetLoader");

const textureFor = (path: string) => ({ path });

const viewerSetup: ViewerSetup = {
  tileSize: 32,
  resolution: [800, 600],
};

const baseRenderable: GameRenderable = {
  id: "renderable-1",
  position: [2, 3],
  assetPath: "/sprites/test.png",
  size: [4, 5],
  rotation: 0,
  type: RenderableType.OBJECT,
  layer: 3,
};

function renderable(
  overrides: Partial<GameRenderable> = {},
): GameRenderable {
  return { ...baseRenderable, ...overrides };
}

function createRenderer() {
  const assetLoader = {
    getTexture: jest.fn((path: string) => textureFor(path)),
    loadFor: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<InstanceType<typeof AssetLoader>>;

  return {
    assetLoader,
    renderer: new LiveViewRenderer(assetLoader, viewerSetup),
  };
}

describe("LiveViewRenderer", () => {
  it.each([
    [RenderableType.MAP, "map"],
    [RenderableType.OBJECT, "objects"],
    [RenderableType.DECORATION, "decorations"],
  ])("uses the %s container for a renderable", (type, label) => {
    const { renderer } = createRenderer();

    expect(
      renderer.getContainer(type as RenderableType).label,
    ).toBe(label);
  });

  it("enables layer sorting for all category containers", () => {
    const { renderer } = createRenderer();

    expect(
      renderer.getContainer(RenderableType.MAP).sortableChildren,
    ).toBe(true);

    expect(
      renderer.getContainer(RenderableType.OBJECT).sortableChildren,
    ).toBe(true);

    expect(
      renderer.getContainer(RenderableType.DECORATION).sortableChildren,
    ).toBe(true);
  });

  it("creates a sprite using the renderable asset, position, size, and layer", () => {
    const { renderer, assetLoader } = createRenderer();

    const sprite = renderer.addGameRenderable(baseRenderable);

    expect(assetLoader.getTexture).toHaveBeenCalledWith(
      "/sprites/test.png",
    );
    expect(sprite.texture).toEqual({ path: "/sprites/test.png" });
    expect(sprite.position.x).toBe(80);
    expect(sprite.position.y).toBe(112);
    expect(sprite.anchor.x).toBe(0.125);
    expect(sprite.anchor.y).toBe(0.1);
    expect(sprite.width).toBe(128);
    expect(sprite.height).toBe(160);
    expect(sprite.angle).toBe(0);
    expect(sprite.zIndex).toBe(3);

    const rotatedSprite = renderer.addGameRenderable(
      renderable({ id: "rotated", rotation: 90 }),
    );
    expect(rotatedSprite.angle).toBe(90);

    expect(
      renderer.getContainer(RenderableType.OBJECT).children,
    ).toContain(sprite);
  });

  it("renders multiple sprites with different IDs", async () => {
    const { renderer } = createRenderer();

    const first = renderable({
      id: "first",
      type: RenderableType.MAP,
    });

    const second = renderable({
      id: "second",
      type: RenderableType.DECORATION,
    });

    await renderer.renderScene([first, second]);

    expect(renderer.getSprite("first")).toBeDefined();
    expect(renderer.getSprite("second")).toBeDefined();

    expect(
      renderer.getContainer(RenderableType.MAP).children,
    ).toHaveLength(1);

    expect(
      renderer.getContainer(RenderableType.DECORATION).children,
    ).toHaveLength(1);
  });

  it("loads scene assets before creating sprites", async () => {
    const { renderer, assetLoader } = createRenderer();

    const scene = [
      renderable({
        id: "map",
        assetPath: "/sprites/grass.png",
      }),
      renderable({
        id: "ship",
        assetPath: "/sprites/ship1.png",
      }),
    ];

    assetLoader.loadFor.mockImplementation(async () => {
      expect(assetLoader.getTexture).not.toHaveBeenCalled();
    });

    await renderer.renderScene(scene);

    expect(assetLoader.loadFor).toHaveBeenCalledWith(scene);
    expect(assetLoader.getTexture).toHaveBeenCalledWith(
      "/sprites/grass.png",
    );
    expect(assetLoader.getTexture).toHaveBeenCalledWith(
      "/sprites/ship1.png",
    );

    expect(renderer.getSprite("map")).toBeDefined();
    expect(renderer.getSprite("ship")).toBeDefined();
  });

  it("does not create sprites if aborted while assets are loading", async () => {
    const { renderer, assetLoader } = createRenderer();
    const controller = new AbortController();

    assetLoader.loadFor.mockImplementation(async () => {
      controller.abort();
    });

    await renderer.renderScene([baseRenderable], controller.signal);

    expect(assetLoader.getTexture).not.toHaveBeenCalled();
    expect(renderer.getSprite(baseRenderable.id)).toBeUndefined();
    expect(renderer.getContainer(RenderableType.OBJECT).children).toHaveLength(0);
  });

  it("returns the existing sprite when the same ID is added again", () => {
    const { renderer } = createRenderer();

    const first = renderer.addGameRenderable(baseRenderable);

    const second = renderer.addGameRenderable(
      renderable({
        position: [100, 100],
        assetPath: "/sprites/other.png",
      }),
    );

    expect(second).toBe(first);

    expect(
      renderer.getContainer(RenderableType.OBJECT).children,
    ).toHaveLength(1);

    expect(second.position.x).toBe(80);
    expect(second.position.y).toBe(112);
  });

  it("adds all category containers to the stage in order", () => {
    const { renderer } = createRenderer();
    const stage = new MockContainer();

    renderer.addContainerToStage(stage as unknown as Container);

    expect(
      stage.children.map((child) => {
        if (!(child instanceof MockContainer)) {
          throw new Error("Expected a container on the stage");
        }

        return child.label;
      }),
    ).toEqual(["map", "objects", "decorations"]);
  });
});
