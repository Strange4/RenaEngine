import { RenderableType, type GameRenderable, type RenderableChange } from "@/shared/renderable";
import type { RenderableHandlers } from "./renderableHandler";
import { PlaybackState, ReplayController, type ReplayStatus, STEP_DELAY, PLAYBACK_SPEEDS} from "./replayController";

const baseRenderable: GameRenderable = {
  id: "base",
  position: [0, 0],
  assetPath: "/sprites/base.png",
  size: [1, 1],
  rotation: 0,
  type: RenderableType.OBJECT,
  layer: 0,
};

const ship: GameRenderable = { ...baseRenderable, id: "ship", position: [1, 1] };
const movedShip: GameRenderable = { ...ship, position: [2, 1] };
const flag: GameRenderable = { ...baseRenderable, id: "flag", type: RenderableType.DECORATION };

// create flag, move ship, remove ship
const RECORDING: RenderableChange[] = [
  { index: 1, changes: [flag] },
  { index: 2, changes: [movedShip] },
  { index: 3, changes: [{ ...movedShip, removed: true }] },
];

function handlers(): RenderableHandlers & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    create: jest.fn(async (renderable) => {
      calls.push(`create:${renderable.id}`);
    }),
    update: jest.fn(async (renderable) => {
      calls.push(`update:${renderable.id}:${renderable.position.join(",")}`);
    }),
    remove: jest.fn(async (id) => {
      calls.push(`remove:${id}`);
    }),
  };
}

function controllerFor(recording = RECORDING, testHandlers = handlers()) {
  const controller = new ReplayController(testHandlers, recording, [ship]);
  return { controller, testHandlers };
}

describe("ReplayController", () => {
  it("starts paused on the initial scene", () => {
    const { controller, testHandlers } = controllerFor();

    expect(controller.getStatus()).toEqual<ReplayStatus>({
      state: PlaybackState.PAUSED,
      position: 0,
      length: 3,
      speed: 1,
    });
    expect(controller.getCurrentState()).toEqual([ship]);
    expect(testHandlers.calls).toEqual([]);
  });

  it("is ended if the recording is empty", async () => {
    const { controller } = controllerFor([]);

    expect(controller.getStatus()).toMatchObject({ state: PlaybackState.ENDED, position: 0, length: 0 });
    await expect(controller.applyNextChange()).resolves.toBe(false);
  });

  it("applies the changes in index order", async () => {
    const { controller, testHandlers } = controllerFor([RECORDING[2], RECORDING[0], RECORDING[1]]);

    await expect(controller.applyNextChange()).resolves.toBe(true);
    await expect(controller.applyNextChange()).resolves.toBe(true);
    await expect(controller.applyNextChange()).resolves.toBe(true);
    await expect(controller.applyNextChange()).resolves.toBe(false);

    expect(testHandlers.calls).toEqual(["create:flag", "update:ship:2,1", "remove:ship"]);
    expect(controller.getCurrentState()).toEqual([flag]);
    expect(controller.getStatus()).toMatchObject({ state: PlaybackState.ENDED, position: 3 });
  });

  it("applies one change at a time", async () => {
    const { controller, testHandlers } = controllerFor();

    const results = await Promise.all([controller.applyNextChange(), controller.applyNextChange()]);

    expect(results).toEqual([true, true]);
    expect(testHandlers.calls).toEqual(["create:flag", "update:ship:2,1"]);
    expect(controller.getStatus().position).toBe(2);
  });

  it("notifies listeners after each change", async () => {
    const { controller } = controllerFor();
    const statuses: ReplayStatus[] = [];
    controller.onStatusChange((status) => statuses.push(status));

    await controller.applyNextChange();
    await controller.applyNextChange();
    await controller.applyNextChange();

    expect(statuses.map((status) => `${status.state}@${status.position}`)).toEqual([
      "PAUSED@1",
      "PAUSED@2",
      "ENDED@3",
    ]);
  });

  it("stops notifying after unsubscribing", async () => {
    const { controller } = controllerFor();
    const listener = jest.fn();
    const unsubscribe = controller.onStatusChange(listener);

    await controller.applyNextChange();
    unsubscribe();
    await controller.applyNextChange();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the position if a change fails", async () => {
    const testHandlers = handlers();
    testHandlers.create = jest.fn().mockRejectedValueOnce(new Error("asset failed to load")).mockResolvedValue(undefined);
    const { controller } = controllerFor(RECORDING, testHandlers);

    await expect(controller.applyNextChange()).rejects.toThrow("asset failed to load");
    expect(controller.getStatus().position).toBe(0);

    await expect(controller.applyNextChange()).resolves.toBe(true);
    expect(controller.getStatus().position).toBe(1);
  });

  it("does nothing after dispose", async () => {
    const { controller, testHandlers } = controllerFor();
    const listener = jest.fn();
    controller.onStatusChange(listener);

    controller.dispose();

    await expect(controller.applyNextChange()).resolves.toBe(false);
    expect(testHandlers.calls).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    expect(controller.getStatus().position).toBe(0);
  });

  it("does not move the position if disposed during a change", async () => {
    const testHandlers = handlers();
    let finishCreate: () => void = () => undefined;
    testHandlers.create = jest.fn(() => new Promise<void>((resolve) => (finishCreate = resolve)));
    const { controller } = controllerFor(RECORDING, testHandlers);

    const step = controller.applyNextChange();
    for (let i = 0; i < 20 && (testHandlers.create as jest.Mock).mock.calls.length === 0; i++) {
      await Promise.resolve();
    }
    controller.dispose();
    finishCreate();

    await expect(step).resolves.toBe(false);
    expect(controller.getStatus().position).toBe(0);
  });

  it("throws for the controls that are not done yet", async () => {
    const { controller, testHandlers } = controllerFor();

    expect(() => controller.play()).toThrow("not implemented yet (#171)");
    expect(() => controller.pause()).toThrow("not implemented yet (#171)");
    await expect(controller.stepForward()).rejects.toThrow("not implemented yet (#172)");
    await expect(controller.stepBackward()).rejects.toThrow("not implemented yet (#173)");
    //expect(() => controller.setSpeed(2)).toThrow("not implemented yet (#174)");
    expect(controller.getStatus()).toMatchObject({ state: PlaybackState.PAUSED, position: 0, speed: 1 });
    expect(testHandlers.calls).toEqual([]);
  });
});

describe ("playback speed", ()=> {

  //implementing a shared setup to counter the duplicated lines
    function controllerWithListener(){
      const {controller} = controllerFor();
      const listener = jest.fn();
      controller.onStatusChange(listener);
      return{controller, listener};
    }

  it("sets selected speed", () =>{
    
    const {controller, listener} = controllerWithListener();
    controller.setSpeed(1.5);

    //shows the new/ selected new speed
    expect(controller.getStatus()).toMatchObject({state: PlaybackState.PAUSED, position:0, speed:1.5});
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({speed:1.5})); //user's new selected speed
  });
  it ("if no speed changes happen, it does not notify", ()=>{
    const {controller, listener} = controllerWithListener();//adding this call to helper to avoid duplicate
    controller.setSpeed(1);

    //default speed of 1x is still there
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies user if speed change occurs", ()=>{

    const {controller, listener} = controllerWithListener();//adding this call to helper to avoid duplicate

    //it also sets the speed during the speed change selection
    controller.setSpeed(2);

    //status shows new speed selected
    expect(controller.getStatus()).toMatchObject({state: PlaybackState.PAUSED, position: 0, speed:2});
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({speed: 2}));
  });

  it("ignores the speed changes after dispose", () =>{
  
    const {controller, listener} = controllerWithListener();//adding this call to helper to avoid duplicate
    controller.dispose();

    controller.setSpeed(2); //2x speed instead of 1x..but after dispose should be ignored
    expect(controller.getStatus().speed).toBe(1);
    expect(listener).not.toHaveBeenCalled();

  });

  

  //we only accept set speeds. anything else throws error
  it.each([0,-1,55,1.1,Number.NaN])("rejects unsupported speeds", (speed)=>{
    const {controller} = controllerFor();
    
    expect(() => controller.setSpeed(speed)).toThrow("Unsupported playback speed-- playback speed error");
  });
});
