import type { GameRenderable } from "@/shared/renderable";
import type {LiveViewRenderer} from "./liveViewRenderer";

// Interface for handling renderable objects
export interface RenderableHandlers {
  create(renderable: GameRenderable): Promise<void>;
  update(renderable: GameRenderable): Promise<void>;
  remove(id: string): Promise<void>;
}

//Adding duplicate code from ReplayViewer.tsx here since it contains a sharedfunction here with the copied handlers-- LiveViewer has the same ones, so it's best if they stay shared 
export function createRendererHandlers(renderer: LiveViewRenderer, signal: AbortSignal): RenderableHandlers {
  return {
    create: async (renderable) => {
      await renderer.createGameRenderable(renderable, signal);
    },
    update: async (renderable) => {
      await renderer.updateGameRenderable(renderable, signal);
    },
    remove: async (id) => renderer.removeGameRenderable(id),
  };
}