// AI contribution: No substantial AI-generated code
import { RenderableType, type GameRenderable, type RenderableChange } from "@/shared/renderable";
import { RecordedRenderableChangeSource, type RenderableChangeSource } from "./renderableChangeSource";
import { DEFAULT_VIEWER_WIDTH, getSceneSource } from "./sceneSource";
import { MOCK_SCENE, MOCK_VIEWER_SETUP, mockSceneSource } from "./mockScene";

const map: GameRenderable = {
  id: "map",
  position: [0, 0],
  assetPath: "/sprites/map.png",
  size: [23, 12],
  type: RenderableType.MAP,
  layer: 0,
};

const ship: GameRenderable = {
  id: "ship",
  position: [1, 1],
  assetPath: "/sprites/ship1.png",
  size: [2, 1],
  type: RenderableType.OBJECT,
  layer: 1,
};

const firstChange: RenderableChange = { index: 1, changes: [map, ship] };
const scene = { setup: { tileSize: 40, resolution: [DEFAULT_VIEWER_WIDTH, 480] }, renderables: [map, ship] };

// fake SSE source, send() acts like the server sending a change
function fakeSource() {
  const changes: RenderableChange[] = [];
  let listener: ((change: RenderableChange) => void) | undefined;
  const source: RenderableChangeSource = {
    setChangeListener: (callback) => (listener = callback),
    getAllChanges: () => changes,
    close: jest.fn(),
  };
  const send = (change: RenderableChange) => {
    changes.push(change);
    listener?.(change);
  };
  return { source, send };
}

describe("scene sources", () => {
  it("waits for the first change from the server", async () => {
    const { source, send } = fakeSource();
    const onScene = jest.fn();

    const pending = getSceneSource(source).getInitialScene().then(onScene);
    await Promise.resolve();
    expect(onScene).not.toHaveBeenCalled();

    send(firstChange);
    send({ index: 2, changes: [{ ...ship, position: [3, 1] }] });
    await pending;
    expect(onScene).toHaveBeenCalledWith(scene);
  });

  it("uses the first change of a recording", async () => {
    const recording: RenderableChange[] = [{ index: 2, changes: [{ ...ship, position: [3, 1] }] }, firstChange];

    await expect(getSceneSource(new RecordedRenderableChangeSource(recording)).getInitialScene()).resolves.toEqual(scene);
  });

  it("skips removed renderables", async () => {
    const change = { index: 1, changes: [map, ship, { ...ship, id: "sunk", removed: true }] };

    await expect(getSceneSource(new RecordedRenderableChangeSource([change])).getInitialScene()).resolves.toEqual(scene);
  });

  it("rejects when the first change has no map", async () => {
    const { source, send } = fakeSource();
    const pending = getSceneSource(source).getInitialScene();

    send({ index: 1, changes: [ship] });

    await expect(pending).rejects.toThrow("The initial renderable must define the map");
  });

  it("gives the mock scene and its setup as the initial scene", async () => {
    await expect(mockSceneSource.getInitialScene()).resolves.toEqual({
      setup: MOCK_VIEWER_SETUP,
      renderables: MOCK_SCENE,
    });
  });
});
