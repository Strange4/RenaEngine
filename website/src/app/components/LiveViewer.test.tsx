import { act, render, screen, waitFor } from "@testing-library/react";
import { Sprite, Container } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import { RenderableChangeProcessor } from "@/app/viewer/renderableChangeProcessor";
import { getSceneSource } from "@/app/viewer/sceneSource";
import {
  RenderableType,
  type GameRenderable,
  type ViewerSetup,
} from "@/shared/renderable";
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
      ticker: {add: jest.fn()},
    };

    appInstances.push(app);
    return app;
  });

  const MockSprite = jest.fn().mockImplementation((texture) => {

    const position ={
      x: 0,
      y: 0,
      set: jest.fn((x: number, y:number) =>{
        position.x = x;
        position.y = y;
      }),
    };
    const sprite = {
      texture,
      position,
      anchor: { set: jest.fn() },
      zIndex: 0,
      width: 0,
      height: 0,
      angle:0,
      destroy: jest.fn(),
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

jest.mock("@/app/viewer/renderableChangeSource", () => ({
  SSERenderableChangeSource: jest.fn().mockImplementation(() => ({
    setChangeListener: jest.fn(),
    getAllChanges: jest.fn().mockReturnValue([]),
    close: jest.fn(),
  })),
}));

// Uses the real processor, wrapped so tests can get the one the viewer created
jest.mock("@/app/viewer/renderableChangeProcessor", () => {
  const actual = jest.requireActual("@/app/viewer/renderableChangeProcessor");
  return {
    RenderableChangeProcessor: jest.fn(
      (...args: unknown[]) => new actual.RenderableChangeProcessor(...args),
    ),
  };
});

const getViewerProcessor = () =>
  (RenderableChangeProcessor as unknown as jest.Mock).mock.results[0]
    .value as RenderableChangeProcessor;

const getPixiMocks = () =>
  jest.requireMock("pixi.js") as {
    __appInstances: Array<{
      canvas: HTMLCanvasElement;
      screen: { width: number; height: number };
      init: jest.Mock;
      destroy: jest.Mock;
      renderer: { on: jest.Mock };
      stage: { addChild: jest.Mock };
      ticker: {add: jest.Mock};
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
      destroy: jest.Mock;
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

  it("renders the viewer container at the configured size", async () => {
    render(<LiveViewer gameId="1" />);

    const viewer = screen.getByTestId("live-viewer");

    expect(viewer).toBeInTheDocument();
    expect(viewer).toHaveClass("live-viewer-canvas");

    await waitFor(() => {
      expect(viewer).toHaveStyle({
        width: "920px",
        height: "480px",
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

    const { __appInstances, __spriteInstances, __containerInstances } =
      getPixiMocks();
    const app = __appInstances[0];
    const stage = app.stage;

    const [mapContainer, objectContainer, decorationContainer] =
      __containerInstances.slice(1);

    expect(app.init).toHaveBeenCalledWith({
      width: 920,
      height: 480,
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
    expect(spriteOne.position.set).toHaveBeenCalledWith(100, 100);
    expect(spriteOne.anchor.set).toHaveBeenCalledWith(1 / 6, 1 / 6);
    expect(spriteOne.zIndex).toBe(1);
    expect(spriteOne.width).toBe(120);
    expect(spriteOne.height).toBe(120);

    expect(spriteTwo.texture).toBe("mock-texture");
    expect(spriteTwo.position.set).toHaveBeenCalledWith(20, 20);
    expect(spriteTwo.anchor.set).toHaveBeenCalledWith(1 / 6, 1 / 6);
    expect(spriteTwo.zIndex).toBe(2);
    expect(spriteTwo.width).toBe(120);
    expect(spriteTwo.height).toBe(120);

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
        () =>
          new Promise<void>((resolve) => {
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

  it("removes the sprite when a change marks its renderable as removed", async () => {
    render(<LiveViewer gameId="1" />);

    await waitFor(() => {
      expect(RenderableChangeProcessor).toHaveBeenCalledTimes(1);
    });

    const [removedSprite, keptSprite] = getPixiMocks().__spriteInstances;

    await act(async () => {
      await getViewerProcessor().process({
        index: 1,
        changes: [{ ...TEST_SCENE[0], removed: true }],
      });
    });

    expect(removedSprite.destroy).toHaveBeenCalledTimes(1);
    expect(keptSprite.destroy).not.toHaveBeenCalled();
  });

  it("creates a sprite when a change introduces a new renderable", async () => {
    render(<LiveViewer gameId="1" />);

    await waitFor(() => {
      expect(RenderableChangeProcessor).toHaveBeenCalledTimes(1);
    });

    const newRenderable: GameRenderable = {
      id: "new-flag",
      position: [4, 1],
      assetPath: "/sprites/flag.svg",
      size: [1, 1],
      type: RenderableType.DECORATION,
      layer: 5,
    };

    await act(async () => {
      await getViewerProcessor().process({
        index: 1,
        changes: [newRenderable],
      });
    });

    const assets = (AssetLoader as jest.Mock).mock.results[0].value as {
      loadFor: jest.Mock;
    };
    expect(assets.loadFor).toHaveBeenLastCalledWith([newRenderable]);

    const { __spriteInstances, __containerInstances } = getPixiMocks();
    expect(__spriteInstances).toHaveLength(3);

    const created = __spriteInstances[2];
    expect(created.texture).toBe("mock-texture");
    expect(created.position.set).toHaveBeenCalledWith(180, 60);
    expect(created.zIndex).toBe(5);
    expect(created.width).toBe(40);
    expect(created.height).toBe(40);

    const decorationContainer = __containerInstances[3];
    expect(decorationContainer.addChild).toHaveBeenCalledWith(created);

    // the processor now tracks it alongside the initial scene
    expect(
      getViewerProcessor()
        .getCurrentState()
        .map(({ id }) => id),
    ).toEqual(["test-sprite", "test-sprite-two", "new-flag"]);
  });

  it("does not create the sprite if unmounted while its asset is loading", async () => {
    const { unmount } = render(<LiveViewer gameId="1" />);

    await waitFor(() => {
      expect(RenderableChangeProcessor).toHaveBeenCalledTimes(1);
    });

    let resolveAsset!: () => void;
    const assets = (AssetLoader as jest.Mock).mock.results[0].value as {
      loadFor: jest.Mock;
    };
    assets.loadFor.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveAsset = resolve;
      }),
    );

    const pending = getViewerProcessor().process({
      index: 1,
      changes: [{ ...TEST_SCENE[0], id: "late-sprite" }],
    });

    // wait for the create handler to start loading the asset (first call was the initial scene)
    await waitFor(() => {
      expect(assets.loadFor).toHaveBeenCalledTimes(2);
    });

    unmount();

    await act(async () => {
      resolveAsset();
      await pending;
    });

    // only the two sprites from the initial scene
    expect(Sprite).toHaveBeenCalledTimes(2);
  });

  it("stops applying changes once the viewer is unmounted", async () => {
    const { unmount } = render(<LiveViewer gameId="1" />);

    await waitFor(() => {
      expect(RenderableChangeProcessor).toHaveBeenCalledTimes(1);
    });

    const processor = getViewerProcessor();
    unmount();

    // a change arriving after unmount should not touch the destroyed app
    await act(async () => {
      await processor.process({
        index: 1,
        changes: [{ ...TEST_SCENE[0], removed: true }],
      });
    });

    expect(getPixiMocks().__spriteInstances[0].destroy).not.toHaveBeenCalled();
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

  it("updates a renderable", async()=>{

    render(<LiveViewer gameId="15" />);
    await waitFor(() => {
      expect(RenderableChangeProcessor).toHaveBeenCalledTimes(1);
    });

    const [oldShip, updatedShip] = getPixiMocks().__spriteInstances;

    //Say the change is a movement/displacement
    const displacement: GameRenderable = {...TEST_SCENE[0], position:[4,1]};
    await act(async() => {
      await getViewerProcessor().process({index:1, changes:[displacement]});
    });


    expect(oldShip.destroy).not.toHaveBeenCalled();
    expect(updatedShip.destroy).not.toHaveBeenCalled();
    const{__spriteInstances} = getPixiMocks();
    expect(getPixiMocks().__spriteInstances).toHaveLength(2);

    //Viewere registered ticker function simulates passing frames
    const tick = getPixiMocks().__appInstances[0].ticker.add.mock.calls[0][0];
    //halfway in the animation the sprite's properties are also halfway till their final state
    //initial is at 80,80  final is at 144,48
    tick({deltaMS: 100});
    expect(oldShip.position.set).toHaveBeenLastCalledWith(140,80);

    //at the end of the animation, it's at the final state
    tick({deltaMS: 100});
    expect(oldShip.position.set).toHaveBeenLastCalledWith(180,60); //some coordinate position for update
    expect(oldShip.position.set).toHaveBeenCalledWith(180, 60);
  });
});
