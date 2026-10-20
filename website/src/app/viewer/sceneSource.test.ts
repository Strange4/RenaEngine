import { getSceneSource } from "./sceneSource";
import { MOCK_SCENE, MOCK_VIEWER_SETUP, mockSceneSource } from "./mockScene";

describe("scene sources", () => {
  it("uses the local mock scene for every game until the viewer reaches the Game Server", () => {
    expect(getSceneSource("1")).toBe(mockSceneSource);
    expect(getSceneSource("42")).toBe(mockSceneSource);
  });

  it("gives the mock scene and its setup as the initial scene", async () => {
    await expect(mockSceneSource.getInitialScene()).resolves.toEqual({
      setup: MOCK_VIEWER_SETUP,
      renderables: MOCK_SCENE,
    });
  });
});
