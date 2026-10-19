"use client";

import { useEffect, useRef } from "react";
import { Application, Sprite } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { type GameRenderable, RenderableType } from "@/shared/renderable";

const TEST_SPRITE: GameRenderable = {
  id: "test-sprite",
  position: [0, 0],
  assetPath: "/sprites/rena.png",
  size: [1, 1],
  type: RenderableType.OBJECT,
  layer: 1,
};

export default function LiveViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    const assets = new AssetLoader();
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

      await assets.loadFor([TEST_SPRITE]);
      if (unmounted) return;

      const sprite = new Sprite(assets.getTexture(TEST_SPRITE.assetPath));
      sprite.anchor.set(0.5);
      const center = () => sprite.position.set(app.screen.width / 2, app.screen.height / 2);
      center();
      app.renderer.on("resize", center);
      app.stage.addChild(sprite);
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

  return <div ref={containerRef} className="live-viewer-canvas" data-testid="live-viewer" />;
}
