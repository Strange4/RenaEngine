// AI contribution: No substantial AI-generated code
import { RenderableType, type GameRenderable } from "@/shared/renderable";
import type { LiveViewRenderer } from "./liveViewRenderer";
import { createRendererHandlers } from "./renderableHandler";

const ship: GameRenderable = {
  id: "ship",
  position: [1, 1],
  assetPath: "/sprites/ship1.png",
  size: [2, 1],
  type: RenderableType.OBJECT,
  layer: 1,
};

const renderer = {
  createGameRenderable: jest.fn().mockResolvedValue(undefined),
  updateGameRenderable: jest.fn().mockResolvedValue(undefined),
  removeGameRenderable: jest.fn(),
};
const signal = new AbortController().signal;
const handlers = createRendererHandlers(renderer as unknown as LiveViewRenderer, signal);

describe("createRendererHandlers", () => {
  it("creates with the signal", async () => {
    await handlers.create(ship);
    expect(renderer.createGameRenderable).toHaveBeenCalledWith(ship, signal);
  });

  it("updates with the signal", async () => {
    await handlers.update(ship);
    expect(renderer.updateGameRenderable).toHaveBeenCalledWith(ship, signal);
  });

  it("removes by id", async () => {
    await handlers.remove("ship");
    expect(renderer.removeGameRenderable).toHaveBeenCalledWith("ship");
  });

  it("throws if the renderer fails", async () => {
    const error = new Error("asset failed");
    renderer.createGameRenderable.mockRejectedValueOnce(error);

    await expect(handlers.create(ship)).rejects.toBe(error);
  });
});
