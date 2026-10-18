import { act, render, screen, waitFor } from "@testing-library/react";
import { Application, Sprite } from "pixi.js";
import { AssetLoader } from "@/app/viewer/assetLoader";
import LiveViewer from "./LiveViewer";

const mockInit = jest.fn();

jest.mock("pixi.js", () => {
  const appInstances: any[] = [];
  const spriteInstances: any[] = [];

  const MockApplication = jest.fn().mockImplementation(() => {
    const app = {
      canvas: document.createElement("canvas"),
      screen: { width: 800, height: 600 },
      init: mockInit,
      destroy: jest.fn(),
      renderer: {
        on: jest.fn(),
      },
      stage: {
        addChild: jest.fn(),
      }
    }

    appInstances.push(app);
    return app;
  });

  const MockSprite = jest.fn().mockImplementation((texture) => {
    const sprite = {
      texture,
      anchor: { set: jest.fn() },
      position: { set: jest.fn() },
    };

    spriteInstances.push(sprite);
    return sprite;
  });

  return {
    Application: MockApplication,
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
    __spriteInstances: Array<{
      texture: unknown;
      anchor: { set: jest.Mock };
      position: { set: jest.Mock };
    }>;
  };

describe("LiveViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPixiMocks().__appInstances.length = 0;
    getPixiMocks().__spriteInstances.length = 0;
  });

  it("renders the viewer container", () => {
    render(<LiveViewer />);

    expect(screen.getByTestId("live-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("live-viewer")).toHaveClass(
      "live-viewer-canvas",
    );
  });

  it("initializes PixiJS and adds a centered sprite", async () => {
    const { container } = render(<LiveViewer />);

    const viewer = screen.getByTestId("live-viewer");

    await waitFor(() => {
      expect(viewer.querySelector("canvas")).not.toBeNull();
    });

    const { __appInstances, __spriteInstances } = getPixiMocks();
    const app = __appInstances[0];
    const sprite = __spriteInstances[0];

    expect(app.init).toHaveBeenCalledWith({
      resizeTo: viewer,
      background: "#1f2937",
      antialias: true,
    });

    expect(viewer).toContainElement(app.canvas);

    expect(AssetLoader).toHaveBeenCalledTimes(1);

    expect(Sprite).toHaveBeenCalledWith("mock-texture");
    expect(sprite.anchor.set).toHaveBeenCalledWith(0.5);
    expect(sprite.position.set).toHaveBeenCalledWith(400, 300);
    expect(app.renderer.on).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(app.stage.addChild).toHaveBeenCalledWith(sprite);

    expect(container).toContainElement(viewer);
  });

  it("recenters the sprite when the renderer resizes", async () => {
    render(<LiveViewer />);

    const { __appInstances, __spriteInstances } = getPixiMocks();

    await waitFor(() => {
      expect(__spriteInstances).toHaveLength(1);
    });

    const app = __appInstances[0];
    const sprite = __spriteInstances[0];

    const resizeHandler = app.renderer.on.mock.calls.find(
      ([event]) => event === "resize",
    )?.[1] as (() => void) | undefined;

    expect(resizeHandler).toBeDefined();

    app.screen.width = 1200;
    app.screen.height = 900;

    act(() => {
      resizeHandler!();
    });

    expect(sprite.position.set).toHaveBeenLastCalledWith(600, 450);
  });

  it("destroys the application when unmounted", async () => {
    const { unmount } = render(<LiveViewer />);

    const { __appInstances } = getPixiMocks();

    await waitFor(() => {
      expect(__appInstances[0].stage.addChild).toHaveBeenCalledTimes(1);
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

    const { __appInstances } = getPixiMocks();

    mockInit.mockReturnValue(initPromise);

    const { unmount } = render(<LiveViewer />);

    const app = __appInstances[0];

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
  });

  it("logs an error when PixiJS initialization fails", async () => {
    const error = new Error("Pixi initialization failed");
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    mockInit.mockRejectedValueOnce(error);

    try {
      render(<LiveViewer />);

      await waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(error);
      });

      const { __appInstances } = getPixiMocks();
      const app = __appInstances[0];

      expect(app.init).toHaveBeenCalledTimes(1);
      expect(app.stage.addChild).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });
});