import { act, render, screen, waitFor } from "@testing-library/react";
import { Application, Sprite, Container } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { getSceneSource } from "@/app/viewer/sceneSource";
import { RenderableType, type GameRenderable, type ViewerSetup } from "@/shared/renderable";
import LiveViewer from "./LiveViewer";

const TEST_VIEWER_SETUP: ViewerSetup = {
  tileSize: 32,
  resolution: [800, 600],
};

const TEST_SCENE: GameRenderable[] = [
  {
    id: "test-sprite",
    position: [2, 2],
    assetPath: "/sprites/rena.png",
    size: [3, 3],
    rotation: 0,
    type: RenderableType.OBJECT,
    layer: 1,
  },
  {
    id: "test-sprite-two",
    position: [0, 0],
    assetPath: "/sprites/ship1.png",
    size: [3, 3],
    rotation: 0,
    type: RenderableType.OBJECT,
    layer: 2,
  },
];

const mockInit = jest.fn();

jest.mock("pixi.js", () => {
  const appInstances: any[] = [];
  const containerInstances: any[] = [];
  const spriteInstances: any[] = [];

  const MockContainer = jest.fn().mockImplementation(() => {
    const container = {
      label: "",
      sortableChildren: false,
      addChild: jest.fn(),
    };

    containerInstances.push(container);
    return container;
  });

  const MockApplication = jest.fn().mockImplementation(() => {
    const app = {
      canvas: document.createElement("canvas"),
      screen: { width: 800, height: 600 },
      init: mockInit,
      destroy: jest.fn(),
      stage: new MockContainer(),
    };

    appInstances.push(app);
    return app;
  });

  const MockSprite = jest.fn().mockImplementation((texture) => {
    const sprite = {
      texture,
      position: { set: jest.fn() },
      anchor: { set: jest.fn() },
      zIndex: 0,
      width: 0,
      height: 0,
    };

    spriteInstances.push(sprite);
    return sprite;
  });

  return {
    Application: MockApplication,
    Container: MockContainer,
    Sprite: MockSprite,
    __appInstances: appInstances,
    __containerInstances: containerInstances,
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
    __appInstances: Array<{
      canvas: HTMLCanvasElement;
      screen: { width: number; height: number };
      init: jest.Mock;
      destroy: jest.Mock;
      renderer: { on: jest.Mock };
      stage: { addChild: jest.Mock };
    }>;
    __containerInstances: Array<{
      label: string;
      sortableChildren: boolean;
      addChild: jest.Mock;
    }>;
    __spriteInstances: Array<{
      texture: unknown;
      position: { set: jest.Mock };
      anchor: { set: jest.Mock };
      zIndex: number;
      width: number;
      height: number;
    }>;
  };

describe("LiveViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const mocks = getPixiMocks();
    mocks.__appInstances.length = 0;
    mocks.__containerInstances.length = 0;
    mocks.__spriteInstances.length = 0;

    mockInit.mockResolvedValue(undefined);
    mockGetInitialScene.mockResolvedValue({
      setup: TEST_VIEWER_SETUP,
      renderables: TEST_SCENE,
    });
  });

  it("renders the viewer container sized to the scene", async () => {
    render(<LiveViewer gameId="1" />);

    const viewer = screen.getByTestId("live-viewer");

    expect(viewer).toBeInTheDocument();
    expect(viewer).toHaveClass("live-viewer-canvas");

    await waitFor(() => {
      expect(viewer).toHaveStyle({
        width: "800px",
        height: "600px",
      });
    });
  });

  it("loads the initial scene from the game's scene source", async () => {
    render(<LiveViewer gameId="42" />);

    await waitFor(() => {
      expect(mockGetInitialScene).toHaveBeenCalledTimes(1);
    });

    expect(getSceneSource).toHaveBeenCalledWith("42");
  });

  it("does not set up PixiJS if unmounted while the scene is loading", async () => {
    let resolveScene!: (scene: unknown) => void;

    mockGetInitialScene.mockReturnValue(
      new Promise((resolve) => {
        resolveScene = resolve;
      }),
    );

    const { unmount } = render(<LiveViewer gameId="1" />);
    const app = getPixiMocks().__appInstances[0];

    unmount();

    await act(async () => {
      resolveScene({ setup: TEST_VIEWER_SETUP, renderables: TEST_SCENE });
    });

    expect(app.init).not.toHaveBeenCalled();
    expect(app.destroy).not.toHaveBeenCalled();
    expect(Container).toHaveBeenCalledTimes(1);
  });

  it("initializes PixiJS and adds a centered sprite", async () => {
    const { container } = render(<LiveViewer gameId="1" />);

    const viewer = screen.getByTestId("live-viewer");

    await waitFor(() => {
      expect(viewer.querySelector("canvas")).not.toBeNull();
    });

    const { __appInstances, __spriteInstances, __containerInstances } = getPixiMocks();
    const app = __appInstances[0];
    const stage = app.stage;

    const [mapContainer, objectContainer, decorationContainer] =
    __containerInstances.slice(1);

    expect(app.init).toHaveBeenCalledWith({
      width: 800,
      height: 600,
      background: "#1f2937",
      antialias: true,
    });

    expect(viewer).toContainElement(app.canvas);
    expect(container).toContainElement(viewer);

    expect(AssetLoader).toHaveBeenCalledTimes(1);
    expect(Container).toHaveBeenCalledTimes(4);

    expect(mapContainer.label).toBe("map");
    expect(objectContainer.label).toBe("objects");
    expect(decorationContainer.label).toBe("decorations");

    expect(mapContainer.sortableChildren).toBe(true);
    expect(objectContainer.sortableChildren).toBe(true);
    expect(decorationContainer.sortableChildren).toBe(true);

    expect(stage.addChild).toHaveBeenCalledTimes(3);
    expect(stage.addChild).toHaveBeenNthCalledWith(1, mapContainer);
    expect(stage.addChild).toHaveBeenNthCalledWith(2, objectContainer);
    expect(stage.addChild).toHaveBeenNthCalledWith(3, decorationContainer);

    expect(Sprite).toHaveBeenCalledTimes(2);

    expect(__spriteInstances).toHaveLength(2);

    const [spriteOne, spriteTwo] = __spriteInstances;

    expect(spriteOne.texture).toBe("mock-texture");
    expect(spriteOne.position.set).toHaveBeenCalledWith(64, 64);
    expect(spriteOne.zIndex).toBe(1);
    expect(spriteOne.width).toBe(96);
    expect(spriteOne.height).toBe(96);

    expect(spriteTwo.texture).toBe("mock-texture");
    expect(spriteTwo.position.set).toHaveBeenCalledWith(0, 0);
    expect(spriteTwo.zIndex).toBe(2);
    expect(spriteTwo.width).toBe(96);
    expect(spriteTwo.height).toBe(96);

    expect(objectContainer.addChild).toHaveBeenCalledTimes(2);
    expect(objectContainer.addChild).toHaveBeenNthCalledWith(1, spriteOne);
    expect(objectContainer.addChild).toHaveBeenNthCalledWith(2, spriteTwo);

    expect(mapContainer.addChild).not.toHaveBeenCalled();
    expect(decorationContainer.addChild).not.toHaveBeenCalled();
  });

  it("destroys the application when unmounted", async () => {
    const { unmount } = render(<LiveViewer gameId="1" />);

    const { __appInstances } = getPixiMocks();

    await waitFor(() => {
      expect(__appInstances[0].stage.addChild).toHaveBeenCalledTimes(3);
    });

    unmount();

    expect(__appInstances[0].destroy).toHaveBeenCalledWith(true, {
      children: true,
    });
  });

  it("destroys the application if unmounted while initialization is pending", async () => {
    let resolveInit!: () => void;

    const initPromise = new Promise<void>((resolve) => {
      resolveInit = resolve;
    });

    mockInit.mockReturnValue(initPromise);

    const { unmount } = render(<LiveViewer gameId="1" />);

    const { __appInstances } = getPixiMocks();
    const app = __appInstances[0];

    // init only starts once the scene has loaded
    await waitFor(() => {
      expect(app.init).toHaveBeenCalled();
    });

    unmount();

    await act(async () => {
      resolveInit();
      await initPromise;
    });

    await waitFor(() => {
      expect(app.destroy).toHaveBeenCalledWith(true, {
        children: true,
      });
    });

    expect(app.stage.addChild).not.toHaveBeenCalled();
  });

  it("does not create sprites if unmounted while assets are loading", async () => {
    let resolveAssets!: () => void;

    (AssetLoader as jest.Mock).mockImplementationOnce(() => ({
      loadFor: jest.fn(
        () => new Promise<void>((resolve) => {
          resolveAssets = resolve;
        }),
      ),
      getTexture: jest.fn().mockReturnValue("mock-texture"),
    }));

    const { unmount } = render(<LiveViewer gameId="1" />);

    const { __appInstances } = getPixiMocks();
    const app = __appInstances[0];

    await waitFor(() => {
      expect(app.stage.addChild).toHaveBeenCalledTimes(3);
    });

    unmount();

    await act(async () => {
      resolveAssets();
    });

    expect(app.destroy).toHaveBeenCalledWith(true, {
      children: true,
    });
    expect(Sprite).not.toHaveBeenCalled();
  });

  it("logs an error when PixiJS initialization fails", async () => {
    const error = new Error("Pixi initialization failed");
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    mockInit.mockRejectedValueOnce(error);

    try {
      render(<LiveViewer gameId="1" />);

      await waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(error);
      });

      const { __appInstances, __containerInstances } = getPixiMocks();
      const app = __appInstances[0];

      expect(app.init).toHaveBeenCalledTimes(1);
      expect(app.stage.addChild).not.toHaveBeenCalled();

      expect(__containerInstances).toHaveLength(4);
    } finally {
      logSpy.mockRestore();
    }
  });
});