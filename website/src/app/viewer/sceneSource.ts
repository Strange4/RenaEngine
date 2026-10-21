import type { GameRenderable, ViewerSetup } from "@/shared/renderable";
import { mockSceneSource } from "./mockScene";

export interface Scene {
  setup: ViewerSetup;
  renderables: GameRenderable[];
}

// PS: RenderableChange updates will be added to this interface with the change processor
export interface SceneSource {
  getInitialScene(): Promise<Scene>;
}

// Always gets local mock scene until the viewer can actually reach the Game Server
export function getSceneSource(_gameId: string): SceneSource {
  return mockSceneSource;
}
