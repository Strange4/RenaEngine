"use client";
// AI contribution: Below 50% AI-generated

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { LiveViewRenderer } from "@/app/viewer/liveViewRenderer";
import { RenderableChangeProcessor } from "@/app/viewer/renderableChangeProcessor";
import { getSceneSource } from "@/app/viewer/sceneSource";
import {Animator} from "@/app/viewer/animator";
import { getInitialMap, getInitialViewerWidth, getResponsiveViewerSetup, createViewerResizeHandler, observeViewerResize } from "@/app/viewer/responsiveViewer";
import { SSERenderableChangeSource } from "../viewer/renderableChangeSource";

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
      // connect to SSE, the first change from the server is the initial scene
      changeSource = new SSERenderableChangeSource(`/api/viewer/sse/${gameId}`);
      const scene = await getSceneSource(changeSource).getInitialScene();
      if (unmount.signal.aborted) return;

      // The initial map is used to determine the aspect ratio of the game and the tile size
      const map = getInitialMap(scene.renderables);

      const initialWidth = getInitialViewerWidth(container, scene.setup?.resolution[0] || 1);
      const setup = getResponsiveViewerSetup(map, initialWidth);
      setResolution(setup.resolution);
      const animator = new Animator();
      const renderer = new LiveViewRenderer(assets, setup, animator);

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
      app.ticker.add((ticker)=> animator.tick(ticker.deltaMS)); //deltaMS is from pixi JS, it's the difference in milliseconds between two frames
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

      // apply the changes we got while setting up (skip the first one, it's already drawn)
      for (const change of changeSource.getAllChanges().slice(1)) {
        processor.process(change).catch((e) => console.log(e));
      }
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
