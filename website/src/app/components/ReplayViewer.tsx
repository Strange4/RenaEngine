"use client";

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { LiveViewRenderer } from "@/app/viewer/liveViewRenderer";
import { getSceneSource } from "@/app/viewer/sceneSource";
import { getInitialMap, getInitialViewerWidth, getResponsiveViewerSetup, createViewerResizeHandler, observeViewerResize } from "@/app/viewer/responsiveViewer";
import ReplayControls from "./ReplayControls";

interface ReplayViewerProps {
  gameId: string;
}

// only draws the initial scene for now, the ReplayController gets connected in 171-175
export default function ReplayViewer({ gameId }: ReplayViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolution, setResolution] = useState<[number, number] | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    let initialized = false;
    let resizeObserver: ResizeObserver | null = null;
    const unmount = new AbortController();

    (async () => {
      const scene = await getSceneSource(gameId).getInitialScene();
      if (unmount.signal.aborted) return;

      // The initial map is used to determine the aspect ratio of the game and the tile size
      const map = getInitialMap(scene.renderables);

      const initialWidth = getInitialViewerWidth(container, scene.setup.resolution[0]);
      const setup = getResponsiveViewerSetup(map, initialWidth);
      setResolution(setup.resolution);
      const renderer = new LiveViewRenderer(new AssetLoader(), setup);

      await app.init({
        width: setup.resolution[0],
        height: setup.resolution[1],
        background: "#1f2937",
        antialias: true,
      });
      initialized = true;

      if (unmount.signal.aborted) {
        app.destroy(true, { children: true });
        return;
      }
      container.appendChild(app.canvas);
      renderer.addContainerToStage(app.stage);
      await renderer.renderScene(scene.renderables, unmount.signal);
      if (unmount.signal.aborted) return;

      // resize the viewer when the container width changes
      const resize = createViewerResizeHandler(
        map,
        renderer,
        app,
        setResolution,
        () => unmount.signal.aborted,
      );

      resizeObserver = observeViewerResize(container, resize);
    })().catch((e) => {
      console.error("Failed to load the replay", e);
    });

    return () => {
      unmount.abort();
      resizeObserver?.disconnect();
      if (initialized) app.destroy(true, { children: true });
    };
  }, [gameId]);

  return (
    <div className="replay-viewer" data-testid="replay-viewer">
      <div
        ref={containerRef}
        className="live-viewer-canvas"
        style={resolution ? { height: `${resolution[1]}px` } : undefined}
        data-testid="replay-canvas"
      />
      <ReplayControls />
    </div>
  );
}
