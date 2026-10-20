"use client";

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { LiveViewRenderer } from "@/app/viewer/liveViewRenderer";
import { getSceneSource } from "@/app/viewer/sceneSource";

interface LiveViewerProps {
  gameId: string;
}

export default function LiveViewer({ gameId }: LiveViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Known once the scene is loaded, sizes the viewer to the game's canvas
  const [resolution, setResolution] = useState<[number, number] | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    const assets = new AssetLoader();
    let initialized = false;
    let unmounted = false;

    (async () => {
      const { setup, renderables } = await getSceneSource(gameId).getInitialScene();
      if (unmounted) return;

      setResolution(setup.resolution);
      const renderer = new LiveViewRenderer(assets, setup);

      await app.init({
        width: setup.resolution[0],
        height: setup.resolution[1],
        background: "#1f2937",
        antialias: true,
      });
      initialized = true;

      // init is async: if we unmounted while it was running, the cleanup
      // below already ran without a renderer to destroy, so destroy here instead.
      if (unmounted) {
        app.destroy(true, { children: true });
        return;
      }

      container.appendChild(app.canvas);
      renderer.addContainerToStage(app.stage);
      await renderer.renderScene(renderables);

      if (unmounted) return;
    })().catch(e => {
      console.log(e);
      // TODO put actual error handling here
      // If you change the console.log, make sure to update the relevant test
    });

    return () => {
      unmounted = true;
      if (initialized) app.destroy(true, { children: true });
    };
  }, [gameId]);

  return (
    <div
      ref={containerRef}
      className="live-viewer-canvas"
      style={resolution ? {
        width: `${resolution[0]}px`,
        height: `${resolution[1]}px`,
      } : undefined}
      data-testid="live-viewer"
    />
  );
}
