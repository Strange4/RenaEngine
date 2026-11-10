import { RenderableType, type GameRenderable, type ViewerSetup } from "@/shared/renderable";
import type { Application } from "pixi.js";
import type { LiveViewRenderer } from "./liveViewRenderer";

export function getInitialMap(renderables: GameRenderable[]): GameRenderable {
  const map = renderables[0];
  if (!map || map.type !== RenderableType.MAP) {
    throw new Error("The initial renderable must define the map");
  }

  if (
    !Number.isFinite(map.size[0])
    || !Number.isFinite(map.size[1])
    || map.size[0] <= 0
    || map.size[1] <= 0
  ) {
    throw new Error("The initial map must have a positive tile resolution");
  }

  return map;
}

// This function calculates the responsive viewer setup
// based on the map's size and the desired pixel width.
export function getResponsiveViewerSetup(
  map: GameRenderable,
  pixelWidth: number,
): ViewerSetup {
  const tileSize = pixelWidth / map.size[0];
  return {
    tileSize,
    resolution: [pixelWidth, tileSize * map.size[1]],
  };
}

export function createViewerResizeHandler(
  map: GameRenderable,
  renderer: LiveViewRenderer,
  app: Application,
  setResolution: (resolution: [number, number]) => void,
  isAborted: () => boolean,
): (pixelWidth: number) => void {
  return (pixelWidth: number) => {
    if (pixelWidth <= 0 || isAborted()) return;

    const nextSetup = getResponsiveViewerSetup(map, pixelWidth);
    renderer.updateViewerSetup(nextSetup);
    app.renderer.resize(nextSetup.resolution[0], nextSetup.resolution[1]);
    setResolution(nextSetup.resolution);
  };
}

// This function is used to determine the initial width of the viewer
// based on the container's width and a fallback width.
export function getInitialViewerWidth(
  container: HTMLElement,
  fallbackWidth: number,
): number {
  return container.clientWidth
    || container.getBoundingClientRect().width
    || fallbackWidth
    || 1;
}

// This function observes the container's size and calls the provided callback
// whenever the width changes. It returns a ResizeObserver instance or null if
// ResizeObserver is not supported.
export function observeViewerResize(
  container: HTMLElement,
  onResize: (pixelWidth: number) => void,
): ResizeObserver | null {
  if (typeof ResizeObserver === "undefined") return null;

  const observer = new ResizeObserver(([entry]) => {
    onResize(entry.contentRect.width);
  });
  observer.observe(container);
  return observer;
}
