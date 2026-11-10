import type { GameRenderable, ViewerSetup } from "@/shared/renderable";


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
