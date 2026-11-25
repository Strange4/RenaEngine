// AI contribution: No substantial AI-generated code
import type { GameRenderable, ViewerSetup } from "@/shared/renderable";
import type { RenderableChangeSource } from "./renderableChangeSource";
import { getInitialMap, getResponsiveViewerSetup } from "./responsiveViewer";
// mock scene is only used for testing now
// import { mockSceneSource } from "./mockScene";

export interface Scene {
  setup: ViewerSetup; // map dimensions gotten from map renderable
  renderables: GameRenderable[];
}

// PS: RenderableChange updates will be added to this interface with the change processor
export interface SceneSource {
  getInitialScene(): Promise<Scene>;
}

// used when we can't get the browser width (same as the game server's default resolution)
export const DEFAULT_VIEWER_WIDTH = 920;

// The first change of a game has the whole first frame (including the map), so it's the initial scene
export function getSceneSource(changeSource: RenderableChangeSource): SceneSource {
  return {
    getInitialScene: () =>
      new Promise((resolve, reject) => {
        const useChange = (change: { changes: GameRenderable[] }) => {
          try {
            const renderables = change.changes.filter((renderable) => !renderable.removed);
            const map = getInitialMap(renderables);
            resolve({ setup: getResponsiveViewerSetup(map, DEFAULT_VIEWER_WIDTH), renderables });
          } catch (e) {
            reject(e);
          }
        };

        const [first] = changeSource.getAllChanges();
        if (first) {
          useChange(first);
        } else {
          // wait for it, the processor replaces this listener later
          changeSource.setChangeListener(useChange);
        }
      }),
  };
}
