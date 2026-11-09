"use client";

import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { LiveViewRenderer } from "@/app/viewer/liveViewRenderer";
import { getSceneSource } from "@/app/viewer/sceneSource";
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
    const unmount = new AbortController();

    (async () => {
      const scene = await getSceneSource(gameId).getInitialScene();
      if (unmount.signal.aborted) return;

      setResolution(scene.setup.resolution);
      const renderer = new LiveViewRenderer(new AssetLoader(), scene.setup);

      await app.init({
        width: scene.setup.resolution[0],
        height: scene.setup.resolution[1],
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
    })().catch((e) => {
      console.error("Failed to load the replay", e);
    });

    return () => {
      unmount.abort();
      if (initialized) app.destroy(true, { children: true });
    };
  }, [gameId]);

  return (
    <div className="replay-viewer" data-testid="replay-viewer">
      <div
        ref={containerRef}
        className="live-viewer-canvas"
        style={resolution ? { width: `${resolution[0]}px`, height: `${resolution[1]}px` } : undefined}
        data-testid="replay-canvas"
      />
      <ReplayControls />
    </div>
  );
}
