import { act, render, screen, waitFor } from "@testing-library/react";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { getSceneSource } from "@/app/viewer/sceneSource";
import { RenderableType, type GameRenderable, type ViewerSetup } from "@/shared/renderable";
import ReplayViewer from "./ReplayViewer";

const TEST_SETUP: ViewerSetup = { tileSize: 40, resolution: [400, 200] };

const ship: GameRenderable = {
  id: "ship",
  position: [1, 1],
  assetPath: "/sprites/ship1.png",
  size: [2, 1],
  rotation: 0,
  type: RenderableType.OBJECT,
  layer: 1,
};

jest.mock("pixi.js", () => {
  const appInstances: any[] = [];
  const spriteInstances: any[] = [];

  const MockContainer = jest.fn().mockImplementation(() => ({ label: "", sortableChildren: false, addChild: jest.fn() }));

  const MockApplication = jest.fn().mockImplementation(() => {
    const app = {
      canvas: document.createElement("canvas"),
      init: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
      stage: new MockContainer(),
    };
    appInstances.push(app);
    return app;
  });

  const MockSprite = jest.fn().mockImplementation((texture) => {
    const sprite = { texture, position: { set: jest.fn() }, anchor: { set: jest.fn() }, destroy: jest.fn() };
    spriteInstances.push(sprite);
    return sprite;
  });

  return {
    Application: MockApplication,
    Container: MockContainer,
    Sprite: MockSprite,
    __appInstances: appInstances,
    __spriteInstances: spriteInstances,
  };
});

jest.mock("@/app/viewer/assetLoader", () => ({
  AssetLoader: jest.fn().mockImplementation(() => ({
    loadFor: jest.fn().mockResolvedValue(undefined),
    getTexture: jest.fn().mockReturnValue("mock-texture"),
  })),
}));

const mockGetInitialScene = jest.fn();

jest.mock("@/app/viewer/sceneSource", () => ({
  getSceneSource: jest.fn(() => ({ getInitialScene: mockGetInitialScene })),
}));

const getPixiMocks = () =>
  jest.requireMock("pixi.js") as {
    __appInstances: Array<{ canvas: HTMLCanvasElement; init: jest.Mock; destroy: jest.Mock }>;
    __spriteInstances: unknown[];
  };

describe("ReplayViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPixiMocks().__appInstances.length = 0;
    getPixiMocks().__spriteInstances.length = 0;
    mockGetInitialScene.mockResolvedValue({ setup: TEST_SETUP, renderables: [ship] });
  });

  it("puts the controls under the canvas", () => {
    mockGetInitialScene.mockReturnValue(new Promise(() => undefined));
    render(<ReplayViewer gameId="1" />);

    const viewer = screen.getByTestId("replay-viewer");
    const controls = screen.getByRole("toolbar", { name: "Replay controls" });

    expect(viewer.lastElementChild).toBe(controls);
    expect(viewer.firstElementChild).toBe(screen.getByTestId("replay-canvas"));
  });

  it("draws the initial scene", async () => {
    render(<ReplayViewer gameId="42" />);

    const canvas = screen.getByTestId("replay-canvas");
    const app = getPixiMocks().__appInstances[0];
    await waitFor(() => expect(getPixiMocks().__spriteInstances).toHaveLength(1));

    expect(getSceneSource).toHaveBeenCalledWith("42");
    expect(canvas).toHaveStyle({ width: "400px", height: "200px" });
    expect(canvas).toContainElement(app.canvas);
    expect(app.init).toHaveBeenCalledWith({ width: 400, height: 200, background: "#1f2937", antialias: true });
  });

  it("destroys the app on unmount", async () => {
    const { unmount } = render(<ReplayViewer gameId="1" />);
    await waitFor(() => expect(getPixiMocks().__spriteInstances).toHaveLength(1));

    unmount();

    expect(getPixiMocks().__appInstances[0].destroy).toHaveBeenCalledWith(true, { children: true });
  });

  it("does not init pixi if unmounted while loading the scene", async () => {
    let resolveScene!: (scene: unknown) => void;
    mockGetInitialScene.mockReturnValue(new Promise((resolve) => (resolveScene = resolve)));

    const { unmount } = render(<ReplayViewer gameId="1" />);
    const app = getPixiMocks().__appInstances[0];
    unmount();
    await act(async () => resolveScene({ setup: TEST_SETUP, renderables: [ship] }));

    expect(app.init).not.toHaveBeenCalled();
    expect(app.destroy).not.toHaveBeenCalled();
  });

  it("destroys the app if unmounted during init", async () => {
    let resolveInit!: () => void;
    const { unmount } = render(<ReplayViewer gameId="1" />);
    const app = getPixiMocks().__appInstances[0];
    app.init.mockReturnValue(new Promise<void>((resolve) => (resolveInit = resolve)));

    await waitFor(() => expect(app.init).toHaveBeenCalled());
    unmount();
    await act(async () => resolveInit());

    expect(app.destroy).toHaveBeenCalledWith(true, { children: true });
    expect(getPixiMocks().__spriteInstances).toHaveLength(0);
  });

  it("does not draw sprites if unmounted while loading assets", async () => {
    let resolveAssets: (() => void) | undefined;
    (AssetLoader as jest.Mock).mockImplementationOnce(() => ({
      loadFor: jest.fn(() => new Promise<void>((resolve) => (resolveAssets = resolve))),
      getTexture: jest.fn().mockReturnValue("mock-texture"),
    }));

    const { unmount } = render(<ReplayViewer gameId="1" />);
    await waitFor(() => expect(resolveAssets).toBeDefined());
    unmount();
    await act(async () => resolveAssets?.());

    expect(getPixiMocks().__spriteInstances).toHaveLength(0);
  });

  it("logs an error if loading fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const failure = new Error("no scene");
      mockGetInitialScene.mockRejectedValueOnce(failure);

      render(<ReplayViewer gameId="1" />);

      await waitFor(() => expect(errorSpy).toHaveBeenCalledWith("Failed to load the replay", failure));
      expect(getPixiMocks().__appInstances[0].init).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
