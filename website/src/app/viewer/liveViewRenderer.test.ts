import type { Container } from "pixi.js";
import { RenderableType, type GameRenderable, type ViewerSetup } from "@/shared/renderable";

class MockPoint {
  x = 0;
  y = 0;
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class MockSprite {
  texture: unknown;
  parent: MockContainer | null = null;

  position = new MockPoint();

  anchor = new MockPoint();

  width = 0;
  height = 0;
  angle = 0;
  zIndex = 0;
  destroyed = false;

  constructor(texture: unknown) {
    this.texture = texture;
  }

  destroy = jest.fn(() => {
    this.parent?.removeChild(this);
    this.destroyed = true;
  });
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

  removeChild(item: MockContainer | MockSprite): void {
    this.children = this.children.filter((child) => child !== item);
    if (item instanceof MockSprite) {
      item.parent = null;
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

  it("throws for an unknown type without creating a sprite", () => {
    const { renderer, assetLoader } = createRenderer();

    expect(() =>
      renderer.addGameRenderable(renderable({ type: "UNKNOWN" as RenderableType })),
    ).toThrow("Unknown renderable type: UNKNOWN");

    expect(assetLoader.getTexture).not.toHaveBeenCalled();
    expect(renderer.getSprite(baseRenderable.id)).toBeUndefined();
  });

  it("loads the asset of a new renderable before creating its sprite", async () => {
    const { renderer, assetLoader } = createRenderer();
    const created = renderable({
      id: "new-flag",
      assetPath: "/sprites/flag.svg",
      position: [1, 0],
      size: [1, 2],
      rotation: 180,
      type: RenderableType.DECORATION,
      layer: 4,
    });

    assetLoader.loadFor.mockImplementation(async () => {
      expect(assetLoader.getTexture).not.toHaveBeenCalled();
    });

    const sprite = await renderer.createGameRenderable(created);

    expect(assetLoader.loadFor).toHaveBeenCalledWith([created]);
    expect(sprite).toBeDefined();
    expect(renderer.getSprite("new-flag")).toBe(sprite);

    // initialized from the renderable in the change
    expect(sprite!.texture).toEqual({ path: "/sprites/flag.svg" });
    expect(sprite!.position.x).toBe(48);
    expect(sprite!.position.y).toBe(16);
    expect(sprite!.anchor.x).toBe(0.5);
    expect(sprite!.anchor.y).toBe(0.25);
    expect(sprite!.width).toBe(32);
    expect(sprite!.height).toBe(64);
    expect(sprite!.angle).toBe(180);
    expect(sprite!.zIndex).toBe(4);
    expect(renderer.getContainer(RenderableType.DECORATION).children).toEqual([sprite]);
  });

  it("does not create the new sprite if aborted while its asset is loading", async () => {
    const { renderer, assetLoader } = createRenderer();
    const controller = new AbortController();

    assetLoader.loadFor.mockImplementation(async () => {
      controller.abort();
    });

    const sprite = await renderer.createGameRenderable(baseRenderable, controller.signal);

    expect(sprite).toBeUndefined();
    expect(assetLoader.getTexture).not.toHaveBeenCalled();
    expect(renderer.getSprite(baseRenderable.id)).toBeUndefined();
    expect(renderer.getContainer(RenderableType.OBJECT).children).toHaveLength(0);
  });

  it("returns the existing sprite when creating an ID that is already shown", async () => {
    const { renderer } = createRenderer();
    const existing = renderer.addGameRenderable(baseRenderable);

    const created = await renderer.createGameRenderable(baseRenderable);

    expect(created).toBe(existing);
    expect(renderer.getContainer(RenderableType.OBJECT).children).toHaveLength(1);
  });

  it("removes and destroys the sprite of a removed renderable", () => {
    const { renderer } = createRenderer();
    const removed = renderer.addGameRenderable(renderable({ id: "removed" })) as unknown as MockSprite;
    const kept = renderer.addGameRenderable(renderable({ id: "kept" }));

    renderer.removeGameRenderable("removed");

    expect(renderer.getSprite("removed")).toBeUndefined();
    expect(removed.destroyed).toBe(true);
    // called with no options, so the shared texture is not destroyed
    expect(removed.destroy).toHaveBeenCalledWith();

    // the other sprite should still be there
    expect(renderer.getContainer(RenderableType.OBJECT).children).toEqual([kept]);
  });

  it("ignores IDs that don't have a sprite", () => {
    const { renderer } = createRenderer();
    const sprite = renderer.addGameRenderable(baseRenderable) as unknown as MockSprite;

    renderer.removeGameRenderable("unknown");
    expect(renderer.getContainer(RenderableType.OBJECT).children).toHaveLength(1);

    // removing twice should only destroy the sprite once
    renderer.removeGameRenderable(baseRenderable.id);
    renderer.removeGameRenderable(baseRenderable.id);
    expect(sprite.destroy).toHaveBeenCalledTimes(1);
  });

  it("can add a renderable again after it was removed", () => {
    const { renderer } = createRenderer();
    const first = renderer.addGameRenderable(baseRenderable);

    renderer.removeGameRenderable(baseRenderable.id);
    const second = renderer.addGameRenderable(baseRenderable);

    // a new sprite gets created instead of returning the destroyed one
    expect(second).not.toBe(first);
    expect(renderer.getSprite(baseRenderable.id)).toBe(second);
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

  it("doesn't update a renderable that doesn't show", async() => {
    const{renderer} = createRenderer();
    const sprite = await renderer.updateGameRenderable(renderable({id:"somethingId"}));
    //no update
    expect(sprite).toBeUndefined();
    expect(renderer.getSprite("somethingId")).toBeUndefined();
    expect(renderer.getContainer(RenderableType.OBJECT).children).toHaveLength(0);
  });

  it("updates a renderable", async() => {
    const{renderer, assetLoader} = createRenderer();
    //show old/original sprite (gives an illusion of an update when it gets replaced by the new updated one)
    const oldSprite = renderer.addGameRenderable(baseRenderable) as unknown as MockSprite;

    const updated = renderable({
      position: [0,1], //pixels? To be checked
      assetPath: "/sprites/rena.png",
      rotation: 90,
      type: RenderableType.OBJECT,
    });

    const sprite = await renderer.updateGameRenderable(updated);

    //new loaded before building sprite
    expect(assetLoader.loadFor).toHaveBeenCalledWith([updated]);
    expect(oldSprite.destroyed).toBe(true); //should get removed
    expect(sprite).not.toBe(oldSprite);
    expect(renderer.getSprite(baseRenderable.id)).toBe(sprite);


    //updated sprite's properties got updated
    expect(sprite!.texture).toEqual({path:"/sprites/rena.png"});
    //0*32+16=16 in x position and in y we have 1*32+16=48   *if translating pixels with a tile size of 32 (check if logic stays depending if we consider tiles or pixels)
    expect(sprite!.position.x).toBe(16);
    expect(sprite!.position.y).toBe(48);
    expect(sprite!.angle).toBe(90);
  });
});
