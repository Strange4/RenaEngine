"use client";

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { LiveViewRenderer } from "@/app/viewer/liveViewRenderer";
import { RenderableChangeProcessor } from "@/app/viewer/renderableChangeProcessor";
import { getSceneSource } from "@/app/viewer/sceneSource";
import { SSERenderableChangeSource } from "../viewer/renderableChangeSource";
import { RenderableType, type ViewerSetup } from "@/shared/renderable";

interface LiveViewerProps {
  gameId: string;
}

export default function LiveViewer({ gameId }: LiveViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Known once the scene is loaded, sizes the viewer to the game's aspect ratio
  const [resolution, setResolution] = useState<[number, number] | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    const assets = new AssetLoader();
    // Created once the renderer exists
    let processor: RenderableChangeProcessor | null = null;
    let changeSource: SSERenderableChangeSource | null = null;
    let initialized = false;
    let resizeObserver: ResizeObserver | null = null;
    const unmount = new AbortController();

    (async () => {
      const scene = await getSceneSource(gameId).getInitialScene();
      if (unmount.signal.aborted) return;

      const map = scene.renderables[0];
      if (!map || map.type !== RenderableType.MAP) {
        throw new Error("The initial renderable must define the map");
      }

      const tileResolution = map.size;

      if (
        !Number.isFinite(tileResolution[0])
        || !Number.isFinite(tileResolution[1])
        || tileResolution[0] <= 0
        || tileResolution[1] <= 0
      ) {
        throw new Error("The initial map must have a positive tile resolution");
      }

      const getSetup = (pixelWidth: number): ViewerSetup => {
        const tileSize = pixelWidth / tileResolution[0];
        return {
          tileSize,
          resolution: [pixelWidth, tileSize * tileResolution[1]],
        };
      }

      const initialWidth = container.clientWidth
        || container.getBoundingClientRect().width
        || scene.setup?.resolution[0]
        || 1;
      const setup = getSetup(initialWidth);
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
      //draw every renderable on the screen (there's a sprite for each ID)
      container.appendChild(app.canvas);
      renderer.addContainerToStage(app.stage);
      await renderer.renderScene(scene.renderables, unmount.signal);
      if (unmount.signal.aborted) return;

      const resize = (pixelWidth: number) => {
        if (pixelWidth <= 0 || unmount.signal.aborted) return;

        const nextSetup = getSetup(pixelWidth);
        renderer.updateViewerSetup(nextSetup);
        app.renderer.resize(nextSetup.resolution[0], nextSetup.resolution[1]);
        setResolution(nextSetup.resolution);
      };

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(([entry]) => {
          resize(entry.contentRect.width);
        });
        resizeObserver.observe(container);
      }

      // connect to SSE
      changeSource = new SSERenderableChangeSource(`/api/viewer/sse/${gameId}`);

      // Applies the RenderableChanges that come after the initial scene
      processor = new RenderableChangeProcessor({
        //if new, create
        create: async (renderable) => {
          await renderer.createGameRenderable(renderable, unmount.signal);
        },
        // Applies the Renderable Update
        update: async (renderable) => {
          await renderer.updateGameRenderable(renderable, unmount.signal);
        },
        remove: async (id) => renderer.removeGameRenderable(id),
      }, changeSource, scene.renderables);
    })().catch((e) => {
      console.log(e);
      // TODO put actual error handling here
      // If you change the console.log, make sure to update the relevant test
    });

    return () => {
      unmount.abort();
      resizeObserver?.disconnect();
      processor?.dispose();
      changeSource?.close();
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
              height: `${resolution[1]}px`,
            }
          : undefined
      }
      data-testid="live-viewer"
    />
  );
}
