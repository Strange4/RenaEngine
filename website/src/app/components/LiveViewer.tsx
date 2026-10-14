"use client";

import { useEffect, useRef } from "react";
import { Application, Assets, Sprite } from "pixi.js";

const TEST_SPRITE_URL = "/sprites/rena.png";

export default function LiveViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
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

      const texture = await Assets.load(TEST_SPRITE_URL);
      if (unmounted) return;

      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      const center = () => sprite.position.set(app.screen.width / 2, app.screen.height / 2);
      center();
      app.renderer.on("resize", center);
      app.stage.addChild(sprite);
    })();

    return () => {
      unmounted = true;
      if (initialized) app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={containerRef} className="live-viewer-canvas" data-testid="live-viewer" />;
}
