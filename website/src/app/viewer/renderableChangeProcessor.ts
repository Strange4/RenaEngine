import type { GameRenderable, RenderableChange } from "@/shared/renderable";
import type { RenderableHandlers } from "./renderableHandler";
import { RenderableChangeSource } from "./renderableChangeSource";

export interface RenderableChangeProcessorOptions {}

export class RenderableChangeProcessor {
  private currentRenderables = new Map<string, GameRenderable>();
  private processing = Promise.resolve();
  private disposed = false; //boolean flag that keeps track if a process shuts down. False by default bc no shut down recorded

  constructor(
    private handlers: RenderableHandlers,
    private changeSource: RenderableChangeSource,
    private options: RenderableChangeProcessorOptions = {},
  ) {
    this.changeSource.setChangelisteneter((change) => this.process(change));
  }

  // Processes a change, ensuring that changes are applied in order and that the current state is updated accordingly
  async process(change: RenderableChange): Promise<void> {
    const operation = this.processing.then(() => this.enqueue(change));
    this.processing = operation.catch(() => undefined);
    await operation;
  }

  // Enqueues a change for processing. Changes will be applied in order based on their index
  private async enqueue(change: RenderableChange): Promise<void> {
    if (this.disposed) {
      return;
    }
    await this.apply(change);
  }

  // Applies a change to the current state, calling the appropriate handlers for create, update, or remove actions
  private async apply(change: RenderableChange): Promise<void> {
    for (const renderable of change.changes) {
      const existing = this.currentRenderables.get(renderable.id);
      // FOR REMOVAL
      // If the renderable is marked as removed and exists in the current state, remove it
      if (renderable.removed) {
        if (existing) {
          await this.handlers.remove(renderable.id);
          this.currentRenderables.delete(renderable.id);
        }
      } else if (existing) {
        // FOR UPDATES
        // This is the check for whether the renderable has changed. If it hasn't, we skip the update.
        if (areRenderablesEqual(existing, renderable)) {
          continue;
        }
        await this.handlers.update(renderable);
        this.currentRenderables.set(renderable.id, renderable);
      } else {
        // FOR CREATION
        // If the renderable is new, create it and add it to the current state
        await this.handlers.create(renderable);
        this.currentRenderables.set(renderable.id, renderable);
      }
    }

    // Helper function just to check if two renderables are equal (to avoid unnecessary updates)
    function areRenderablesEqual(
      first: GameRenderable,
      second: GameRenderable,
    ): boolean {
      return (
        first.assetPath === second.assetPath &&
        first.type === second.type &&
        first.layer === second.layer &&
        Boolean(first.removed) === Boolean(second.removed) &&
        first.position[0] === second.position[0] &&
        first.position[1] === second.position[1] &&
        first.size[0] === second.size[0] &&
        first.size[1] === second.size[1] &&
        (first.rotation ?? 0) === (second.rotation ?? 0)
      );
    }
  }

  //Dispose would stop all processes running (useful for the unmounting of the viewer--we don't want handlers to be called then)
  dispose(): void {
    this.disposed = true;
    this.changeSource.close();
  }

  // Returns the current state of renderables as an array
  getCurrentState(): GameRenderable[] {
    return Array.from(this.currentRenderables.values());
  }
}
