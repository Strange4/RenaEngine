
import type { GameRenderable, RenderableChange } from "@/shared/renderable";
import type { RenderableHandlers } from "./renderableHandler";

//Adding options for the default timeout. The processor needs to know how long to wait when a missing index is detected (in case of a server hiccup)
//Case: server hiccup causes the server not to fully transfer the action/ action gets lost (ex: it has id 4).Then, id 5,6,7 are under pending and are waiting for the lost id4.
//With this fix, we wait for the gapTimeout milliseconds and then do an action to fetch the current state from the server
export interface RenderableChangeProcessorOptions{
  gapTimeout?: number;
  fetchScene?: () => Promise<{renderables: GameRenderable[]; index: number}>; //after the waiting time expires, fetch current scene from server to get the missing update we lost
}
const DEFAULT_GAP_TIMEOUT = 3000; //in milliseconds, some arbitrary constant- can modify the #


export class RenderableChangeProcessor {
  private currentRenderables = new Map<string, GameRenderable>();
  private pendingChanges = new Map<number, RenderableChange>();
  private lastProcessedIndex: number | null = null;
  private processing = Promise.resolve();
  //Missing index process waiting fix- adding new params
  private gapTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false; //boolean flag that keeps track if a process shuts down. False by default bc no shut down recorded

  constructor(
    private handlers: RenderableHandlers,
    private options: RenderableChangeProcessorOptions= {},
  ) {}
  
  // Initializes the processor with a set of renderables and an initial index (useful for starting from a specific point in time)
  initialize(renderables: GameRenderable[], initialIndex: number): void {
    this.currentRenderables.clear();
    this.pendingChanges.clear();
    this.clearGapTimer(); //clear the timer -- we don't want to detect old time gaps, so we must reset

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
    if (this.disposed){
      return;
    }
    if (this.lastProcessedIndex !== null && change.index <= this.lastProcessedIndex) {
      return;
    }

    // If the change is new, add it to the pending changes
    if (!this.pendingChanges.has(change.index)) {
      this.pendingChanges.set(change.index, change);
    }

    //Without initialize(), the first change received becomes the starting point
    if (this.lastProcessedIndex === null){
      this.lastProcessedIndex = change.index - 1;
    }
    await this.drain();
  }

  //Apply pending changes when next index is available
    private async drain(): Promise<void>{
      while(!this.disposed && this.lastProcessedIndex !== null){
        const nextIndex = this.lastProcessedIndex +1;
        const nextChange = this.pendingChanges.get(nextIndex);

        if(!nextChange){
          //changes following missing index are waiting for it before they can execute
          if (this.pendingChanges.size > 0) this.startGapTimer(nextIndex);
          return;
        }

      await this.apply(nextChange);
      this.pendingChanges.delete(nextIndex);
      this.lastProcessedIndex = nextIndex;

      this.clearGapTimer();
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
        (first.rotation ?? 0) === (second.rotation ?? 0)
      );
    }
  }

  //Resync applies the fetches from the fresh scene at the index (recoverFromGap() is what fetched it). It runs in the same queue as process() in order to prevent changes being applied before the missing index gets retrieved
  //params: takes in renderables-- list of everything in the game (i.e. snapshot of the game) and takes in index: the change index the snapshot corresponds to/ the missing index for which we need the changes
  async resync(renderables: GameRenderable[], index: number): Promise<void>{
    const operation = this.processing.then(async ()=> {
      if (this.disposed) return;
     
      //Missing change could arrive while fetching action is performed (following the gap timer timeout)
      if (this.lastProcessedIndex !== null && index <=this.lastProcessedIndex){
        return;
      }
      this.clearGapTimer();

      //passed renderables parameter only took a snapshot of what was present. There is a possibility that some renderables got removed during that index's changes
      // find what got removed, and apply the removal changes (inform the viewer of the changes it missed)
     
      const snapshotIds = new Set(renderables.map((r) => r.id)); //collected ids of current snapshot scene
      const removals = this.getCurrentState()
      //we keep only what's not in the snapshot of the current scene because we need to know what's disappearing (what removals happened during the missing gap)
      .filter((r) => !snapshotIds.has(r.id)) //if it's in the snapshot, don't keep
      .map((r) => ({...r, removed: true})) //the ones we kept are all of the things removed, mark them as removed such that the change can later be executed to match the server's current state

      //Apply missing changes (includes removals that happened during the missing gap)
      await this.apply({index, changes: [...removals, ...renderables]});
      this.lastProcessedIndex = index;//viewer now matches the viewer's state at that specific missing index (if a sprite gets removed at that step, the viewer now also has it removed)

      //fresh scene
      for (const pendingIndex of this.pendingChanges.keys()){
        if(pendingIndex <= index) this.pendingChanges.delete(pendingIndex);
      }
      await this.drain();
    });
    this.processing = operation.catch(() => undefined);
    await operation;
  }

  //Dispose would stop all processes running (useful for the unmounting of the viewer--we don't want handlers to be called then)
  dispose(): void {
    this.disposed = true;
    this.clearGapTimer();
    this.pendingChanges.clear();
  }


  // Returns the current state of renderables as an array
  getCurrentState(): GameRenderable[] {
    return Array.from(this.currentRenderables.values());
  }

  // Returns the last processed index, or null if no changes have been processed yet
  getLastProcessedIndex(): number | null {
    return this.lastProcessedIndex;
  }

  //clears the timer
  private clearGapTimer(): void{
    if (this.gapTimer !== null){
      clearTimeout(this.gapTimer); //stops the timer
      this.gapTimer = null; //clears the gap timer (detection system for missing updates from server i.e. missing index)
    }
  }

  //Starts the timer to keep track of the duration of the gap (how long we are waiting for the missing index)
  //calls the operation action if the missing index hasn't arrived once the timeout expires
  private startGapTimer(missingIndex: number): void{
    //if we are already waiting on a gap, don't restart, keep it trackign
    if (this.gapTimer !== null){
      return;
    }
    //else, we trigger the timer to keep track of the gap and execute the callback once the timeout expires
    this.gapTimer = setTimeout(() => {
      this.gapTimer = null;
      void this.recoverFromGap(missingIndex); //operation is fetchScene
    }, this.options.gapTimeout ?? DEFAULT_GAP_TIMEOUT);
  }

  //Recovers the missing index by using fetchScene to get the current updated scene with that index's changes
  private async recoverFromGap(missingIndex: number): Promise<void> {
    //if the process got disposed or if we aren't fetching the current scene, ignore-- no recovery is to be made
    if (this.disposed || !this.options.fetchScene){
      return;
    }
    try{
      const scene = await this.options.fetchScene();
      if (this.disposed){ //if the viewer unmounts during the fetching, don't spend resources to recover
        return;
      }
      await this.resync(scene.renderables, scene.index); //wait until the viewer gets the fetched scene sent by resync
    }
    catch(error){
      console.warn(`Could not recover missing changes`, error)
      //try again if still pending and process not disposed
      if (!this.disposed && this.pendingChanges.size > 0){
        //missing index gap detected, start gap timer- after timeout perform the fetching action again
        this.startGapTimer(missingIndex);
      }
    }
  }
}
