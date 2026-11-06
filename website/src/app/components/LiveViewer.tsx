"use client";

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { LiveViewRenderer } from "@/app/viewer/liveViewRenderer";
import { RenderableChangeProcessor } from "@/app/viewer/renderableChangeProcessor";
import { getSceneSource } from "@/app/viewer/sceneSource";
import { SSERenderableChangeSource } from "../viewer/renderableChangeSource";

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
    // Created once the renderer exists
    let processor: RenderableChangeProcessor | null = null;
    let initialized = false;
    const unmount = new AbortController();

    (async () => {
      const { setup, renderables } =
        await getSceneSource(gameId).getInitialScene();
      if (unmount.signal.aborted) return;

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
      if (unmount.signal.aborted) {
        app.destroy(true, { children: true });
        return;
      }

      container.appendChild(app.canvas);
      renderer.addContainerToStage(app.stage);
      await renderer.renderScene(renderables, unmount.signal);
      if (unmount.signal.aborted) return;

      // connect to SSE
      const changeSource = new SSERenderableChangeSource("/viewer/sse");

      // Applies the RenderableChanges that come after the initial scene
      processor = new RenderableChangeProcessor(
        {
          create: async (renderable) => {
            await renderer.createGameRenderable(renderable, unmount.signal);
          },
          // TODO #86: update the sprite of an existing renderable
          update: async () => {},
          remove: async (id) => renderer.removeGameRenderable(id),
        },
        changeSource,
      );
      // The server's first change has index 1, so the initial scene is index 0
      processor.initialize(renderables, 0);
    })().catch((e) => {
      console.log(e);
      // TODO put actual error handling here
      // If you change the console.log, make sure to update the relevant test
    });

    return () => {
      unmount.abort();
      processor?.dispose();
      if (initialized) app.destroy(true, { children: true });
    };
  }, [gameId]);

  return (
    <div
      ref={containerRef}
      className="live-viewer-canvas"
      style={
        resolution
          ? {
              width: `${resolution[0]}px`,
              height: `${resolution[1]}px`,
            }
          : undefined
      }
      data-testid="live-viewer"
    />
  );
}
