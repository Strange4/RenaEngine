import { Assets, Texture } from "pixi.js";
import type { GameRenderable } from "@/shared/renderable";

// Shown in place of an asset that is missing or failed to load, so one bad
// path still leaves a visible sprite instead of breaking the whole scene.
export const PLACEHOLDER_TEXTURE = Texture.WHITE;

// Assets must be served by the website itself (e.g. /sprites/ship.png), so
// scene data can't make the viewer fetch from another host.
export function isLocalAssetPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/*
Loads the image assets a scene references and hands out textures for them.
Generic: it only knows about assetPath, never about any particular game.
Call loadFor() with each batch of renderables (initial scene or a RenderableChange)
before creating their sprites; already loaded assets are not fetched again.
*/
export class AssetLoader {
  private failed = new Set<string>();

  async loadFor(renderables: GameRenderable[]): Promise<void> {
    const paths = new Set(renderables.map((r) => r.assetPath));
    await Promise.all([...paths].map((path) => this.load(path)));
  }

  getTexture(path: string): Texture {
    return Assets.cache.has(path) ? Assets.get<Texture>(path) : PLACEHOLDER_TEXTURE;
  }

  private async load(path: string): Promise<void> {
    if (this.failed.has(path) || Assets.cache.has(path)) return;

    if (!isLocalAssetPath(path)) {
      this.fail(path, "not a local asset path");
      return;
    }

    try {
      await Assets.load<Texture>(path);
    } catch (error) {
      this.fail(path, error);
    }
  }

  // Remembered so a broken asset is reported once, not re-fetched on every change.
  private fail(path: string, reason: unknown) {
    this.failed.add(path);
    console.warn(`[AssetLoader] Using placeholder for "${path}":`, reason);
  }
}
