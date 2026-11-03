import type { GameRenderable } from "@/shared/renderable";

// Interface for handling renderable objects
export interface RenderableHandlers {
  create(renderable: GameRenderable): Promise<void>;
  update(renderable: GameRenderable): Promise<void>;
  remove(id: string): Promise<void>;
}
