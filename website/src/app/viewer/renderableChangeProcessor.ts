
import type { GameRenderable, RenderableChange } from "@/shared/renderable";
import type { RenderableHandlers } from "./renderableHandler";

export class RenderableChangeProcessor {
  private currentRenderables = new Map<string, GameRenderable>();
  private pendingChanges = new Map<number, RenderableChange>();
  private lastProcessedIndex: number | null = null;
  private processing = Promise.resolve();

  constructor(private handlers: RenderableHandlers) {}
  
  // Initializes the processor with a set of renderables and an initial index (useful for starting from a specific point in time)
  initialize(renderables: GameRenderable[], initialIndex: number): void {
    this.currentRenderables.clear();
    this.pendingChanges.clear();

    // Initialize the current state with the provided renderables
    for (const renderable of renderables) {
      if (!renderable.removed) {
        this.currentRenderables.set(renderable.id, renderable);
      }
    }

    this.lastProcessedIndex = initialIndex;
  }

  // Processes a change, ensuring that changes are applied in order and that the current state is updated accordingly
  async process(change: RenderableChange): Promise<void> {
    const operation = this.processing.then(() => this.enqueue(change));
    this.processing = operation.catch(() => undefined);
    await operation;
  }

  // Enqueues a change for processing. Changes will be applied in order based on their index
  private async enqueue(change: RenderableChange): Promise<void> {
    if (this.lastProcessedIndex !== null && change.index <= this.lastProcessedIndex) {
      return;
    }

    // If the change is new, add it to the pending changes
    if (!this.pendingChanges.has(change.index)) {
      this.pendingChanges.set(change.index, change);
    }

    while (this.pendingChanges.size > 0) {
      const nextIndex =
        this.lastProcessedIndex === null ? change.index : this.lastProcessedIndex + 1;
      const nextChange = this.pendingChanges.get(nextIndex);

      if (!nextChange) {
        return;
      }

      await this.apply(nextChange);
      this.pendingChanges.delete(nextIndex);
      this.lastProcessedIndex = nextIndex;
    }
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
        first.id === second.id &&
        first.assetPath === second.assetPath &&
        first.type === second.type &&
        first.layer === second.layer &&
        Boolean(first.removed) === Boolean(second.removed) &&
        first.position[0] === second.position[0] &&
        first.position[1] === second.position[1] &&
        first.size[0] === second.size[0] &&
        first.size[1] === second.size[1] &&
        first.rotation === second.rotation
      );
    }
  }

  // Returns the current state of renderables as an array
  getCurrentState(): GameRenderable[] {
    return Array.from(this.currentRenderables.values());
  }

  // Returns the last processed index, or null if no changes have been processed yet
  getLastProcessedIndex(): number | null {
    return this.lastProcessedIndex;
  }
}
