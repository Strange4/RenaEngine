"use client";

import { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { LiveViewRenderer } from "@/app/viewer/liveViewRenderer";
import { type GameRenderable, RenderableType } from "@/shared/renderable";

const TEST_SPRITE: GameRenderable = {
  id: "test-sprite",
  position: [64, 64],
  assetPath: "/sprites/rena.png",
  size: [96, 96],
  type: RenderableType.OBJECT,
  layer: 1,
};

const TEST_SPRITE_TWO: GameRenderable = {
  id: "test-sprite-two",
  position: [192, 64],
  assetPath: "/sprites/ship1.png",
  size: [96, 96],
  type: RenderableType.OBJECT,
  layer: 2,
};

export default function LiveViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    const assets = new AssetLoader();
    const renderer = new LiveViewRenderer(assets);
    let initialized = false;
    let unmounted = false;

    (async () => {
      await app.init({ resizeTo: container, background: "#1f2937", antialias: true });
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
    })();

    return () => {
      unmounted = true;
      if (initialized) app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={containerRef} className="live-viewer-canvas" data-testid="live-viewer" />;
}
