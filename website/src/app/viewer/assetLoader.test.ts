import { Assets } from "pixi.js";
import { AssetLoader, isLocalAssetPath, PLACEHOLDER_TEXTURE } from "./assetLoader";
import { GameRenderable, RenderableType } from "@/shared/renderable";

// jsdom can't run PixiJS, so fake its Assets cache: loading a path stores a
// texture object under that path, and paths listed in brokenPaths fail.
const loaded = new Map<string, { path: string }>();
const brokenPaths = new Set<string>();

jest.mock("pixi.js", () => ({
  Texture: { WHITE: { placeholder: true } },
  Assets: {
    cache: { has: (path: string) => loaded.has(path) },
    get: (path: string) => loaded.get(path),
    load: jest.fn(async (path: string) => {
      if (brokenPaths.has(path)) throw new Error("404");
      loaded.set(path, { path });
      return loaded.get(path);
    }),
  },
}));

const mockLoad = Assets.load as jest.Mock;

const baseRenderable: GameRenderable = {
  id: "base",
  position: [0, 0],
  assetPath: "/sprites/grass.png",
  size: [1, 1],
  rotation: 0,
  type: RenderableType.MAP,
  layer: 0,
};

function renderable(id: string, assetPath: string): GameRenderable {
  return { ...baseRenderable, id, assetPath };
}

let warn: jest.SpyInstance;

beforeEach(() => {
  loaded.clear();
  brokenPaths.clear();
  mockLoad.mockClear();
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe("isLocalAssetPath", () => {
  it.each(["/sprites/ship1.png", "/a.png"])("accepts %p", (path) => {
    expect(isLocalAssetPath(path)).toBe(true);
  });

  it.each(["https://example.com/a.png", "//example.com/a.png", "sprites/a.png", ""])(
    "rejects %p",
    (path) => {
      expect(isLocalAssetPath(path)).toBe(false);
    },
  );
});

describe("AssetLoader", () => {
  it("loads each asset a scene references and returns its texture", async () => {
    const loader = new AssetLoader();
    await loader.loadFor([
      renderable("tile", "/sprites/grass.png"),
      renderable("ship", "/sprites/ship1.png"),
    ]);

    expect(loader.getTexture("/sprites/grass.png")).toEqual({ path: "/sprites/grass.png" });
    expect(loader.getTexture("/sprites/ship1.png")).toEqual({ path: "/sprites/ship1.png" });
  });

  it("fetches an asset shared by many renderables only once", async () => {
    const loader = new AssetLoader();
    await loader.loadFor([
      renderable("tile1", "/sprites/grass.png"),
      renderable("tile2", "/sprites/grass.png"),
      renderable("tile3", "/sprites/grass.png"),
    ]);

    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it("does not fetch already loaded assets again for a later change", async () => {
    const loader = new AssetLoader();
    await loader.loadFor([renderable("tile", "/sprites/grass.png")]);
    await loader.loadFor([
      renderable("tile", "/sprites/grass.png"),
      renderable("ship", "/sprites/ship1.png"),
    ]);

    expect(mockLoad.mock.calls.map(([path]) => path)).toEqual([
      "/sprites/grass.png",
      "/sprites/ship1.png",
    ]);
  });

  it("does nothing for an empty change", async () => {
    await new AssetLoader().loadFor([]);
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it("returns the placeholder for an asset that was never loaded", () => {
    expect(new AssetLoader().getTexture("/sprites/unknown.png")).toBe(PLACEHOLDER_TEXTURE);
  });

  it("uses the placeholder for a failed asset without failing the others", async () => {
    brokenPaths.add("/sprites/missing.png");
    const loader = new AssetLoader();

    await expect(
      loader.loadFor([
        renderable("broken", "/sprites/missing.png"),
        renderable("tile", "/sprites/grass.png"),
      ]),
    ).resolves.toBeUndefined();

    expect(loader.getTexture("/sprites/missing.png")).toBe(PLACEHOLDER_TEXTURE);
    expect(loader.getTexture("/sprites/grass.png")).toEqual({ path: "/sprites/grass.png" });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not retry or re-report a failed asset", async () => {
    brokenPaths.add("/sprites/missing.png");
    const loader = new AssetLoader();

    await loader.loadFor([renderable("broken", "/sprites/missing.png")]);
    await loader.loadFor([renderable("broken", "/sprites/missing.png")]);

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("refuses non-local asset paths without fetching them", async () => {
    const loader = new AssetLoader();
    await loader.loadFor([renderable("remote", "https://example.com/a.png")]);

    expect(mockLoad).not.toHaveBeenCalled();
    expect(loader.getTexture("https://example.com/a.png")).toBe(PLACEHOLDER_TEXTURE);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
