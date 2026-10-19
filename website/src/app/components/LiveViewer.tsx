"use client";

import { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { LiveViewRenderer } from "@/app/viewer/liveViewRenderer";
import { type GameRenderable,type ViewerSetup, RenderableType } from "@/shared/renderable";

const TEST_SPRITE: GameRenderable = {
  id: "test-sprite",
  position: [2, 2],
  assetPath: "/sprites/rena.png",
  size: [3, 3],
  type: RenderableType.OBJECT,
  layer: 1,
};

const TEST_SPRITE_TWO: GameRenderable = {
  id: "test-sprite-two",
  position: [0, 0],
  assetPath: "/sprites/ship1.png",
  size: [3, 3],
  type: RenderableType.OBJECT,
  layer: 2,
};

const TEST_VIEWER_SETUP: ViewerSetup = {
    tileSize: 32,
    resolution: [800, 600],
};

export default function LiveViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    const assets = new AssetLoader();
    const renderer = new LiveViewRenderer(assets, TEST_VIEWER_SETUP);
    let initialized = false;
    let unmounted = false;

    (async () => {
      await app.init({
        width: TEST_VIEWER_SETUP.resolution[0],
        height: TEST_VIEWER_SETUP.resolution[1],
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

      await renderer.renderScene([TEST_SPRITE, TEST_SPRITE_TWO]);
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
  }, []);

  return (
    <div
      ref={containerRef}
      className="live-viewer-canvas"
      style={{
        width: `${TEST_VIEWER_SETUP.resolution[0]}px`,
        height: `${TEST_VIEWER_SETUP.resolution[1]}px`,
      }}
      data-testid="live-viewer"
    />
  );
}
