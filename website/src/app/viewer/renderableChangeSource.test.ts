// This file is temporary and will imitates the game server's renderable change source. 
// It provides a mock implementation of the RenderableChangeSource interface, 
// returning a predefined set of renderable changes for testing purposes.

import { MOCK_RENDERABLE_CHANGES, mockRenderableChangeSource } from "./renderableChangeSource";

describe("mockRenderableChangeSource", () => {
  it("provides renderable changes in index order", async () => {
    await expect(mockRenderableChangeSource.getChanges()).resolves.toEqual(
      MOCK_RENDERABLE_CHANGES,
    );

    expect(
      MOCK_RENDERABLE_CHANGES.map(({ index }) => index),
    ).toEqual([1, 2, 3]);
  });
});
