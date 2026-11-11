import {type Sprite} from "pixi.js";
import {Animator, getState, type AnimatedState} from "./animator";
import { start } from "repl";

//defining a fake sprite for tests
function fakeSprite(state: AnimatedState): Sprite{
    const position ={
        x: state.x,
        y: state.y,
        set(x:number, y: number){
            position.x = x;
            position.y = y;
        },
    };

    return{
        position,
        width: state.width,
        height: state.height,
        angle: state.angle,
    } as unknown as Sprite;
}

//Defining a starting animated state and final animated state
const start_state: AnimatedState ={
    x:0,
    y:0,
    width:32,
    height:32,
    angle:0,
};
const final_state: AnimatedState={
    x:100,
    y:40,
    width:64, //setting a different width for an expansion to test this update kind as well
    height: 96,
    angle: 90, //to test rotation as well
};




describe("Animator", () =>{

    it("interpolates throughout the duration of the animation", ()=>{
        const animator = new Animator(200);
        const sprite = fakeSprite(start_state); //starts at initial
        animator.animate(sprite,final_state);
        animator.tick(100);

        //in this case, every property is halfway between start and end progress 50%
        expect(getState(sprite)).toEqual({x:50, y:20,width:48,height:64,angle:45});
    });

    it("finishes once the final animated state is reached and stops the animation",()=>{
        const animator= new Animator(200);
        const sprite = fakeSprite(start_state); //starts at initial state
        animator.animate(sprite, final_state);

        //giving more time than the duration here to be certain that the animation is fully complete (at 200ms , say 199.9999ms it might still be at a different state other than final)
        animator.tick(250);
        expect(getState(sprite)).toEqual(final_state); //once the duration of animation is over, we reached final

    });

    it("turns angles counter clockwise to rotate via the shortest way", ()=>{
        const animator = new Animator(200);
        const sprite = fakeSprite({...start_state, angle:270});
        //the only animation here is rotation
        animator.animate(sprite,{...start_state,angle:0});

        animator.tick(100);
        expect(sprite.angle).toBe(315); //assuming 50% progress, 270 to 0 has a 90degree difference-- in between it would be 270+90/2=315
        //animation ends at angle 0 (final rotation)
        animator.tick(100);
        expect(sprite.angle).toBe(0);
    });

    it("leaves the sprite as is the moment a animation is cancelled", ()=>{
        const animator = new Animator(200);
        const sprite = fakeSprite(start_state);

        animator.animate(sprite, final_state);
        animator.tick(100);
        animator.cancel(sprite); //we cancel the animation for some reason-- must expect the post conditions to be fulfilled

        //later frames shouldn't get animated, leave it as if
        //assume that 50% progress made
        animator.tick(100);
        expect(getState(sprite)).toEqual({x:50,y:20, width:48, height:64, angle:45});
    });

    it("animates several sprites independently", ()=>{
        const animator = new Animator(200);
        const sprite1 = fakeSprite(start_state);
        const sprite2 = fakeSprite(start_state);

        //animate first sprite
        animator.animate(sprite1,final_state);
        animator.tick(100);

        //animate second sprite 100ms after the first one starts-- so we get a delay between the two
        animator.animate(sprite2, final_state);
        animator.tick(100);
        
        //say we check the states once sprite1 finishes. Sprie1 would reach its final state, but sprite2, since it started 1/2 later it will be halfway in its frames
        expect(getState(sprite1)).toEqual(final_state);
        expect(sprite2.position.x).toBe(50); //starts at x:0 and should end at 100, but 1/2 is 50
        expect(sprite2.position.y).toBe(20); //starts at y:0 and should end at 40-- 1/2 would be 20
    });

    it("finishes on the first frame if the animation duration is 0ms", ()=>{
        const animator = new Animator(0); //duration 0ms
        const sprite = fakeSprite(start_state);

        animator.animate(sprite, final_state);
        animator.tick(15);

        expect(getState(sprite)).toEqual(final_state);

    });

    it("scales active animations without changing their progress", () => {
        const animator = new Animator(200);
        const sprite = fakeSprite(start_state);

        animator.animate(sprite, final_state);
        animator.tick(100);
        animator.resizeAnimations(2);

        expect(getState(sprite)).toEqual({
            x: 100,
            y: 40,
            width: 96,
            height: 128,
            angle: 45,
        });

        animator.tick(100);
        expect(getState(sprite)).toEqual({
            x: 200,
            y: 80,
            width: 128,
            height: 192,
            angle: 90,
        });
    });
});

describe("changing the duration", ()=>{
    it("if the duration is 0, the animation finishes on the first frame", ()=>{
        const animator = new Animator(200);
        const sprite = fakeSprite(start_state);
        animator.setDuration(0); //this case
        animator.animate(sprite, final_state);
        animator.tick(16);

        expect(getState(sprite)).toEqual(final_state);//this animation takes no time, so as soon as it happens it's done. done 100% right away
    });
});