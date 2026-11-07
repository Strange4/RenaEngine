import {Sprite} from 'pixi.js';
//this task is full LLL
export interface AnimatedState{
    //all of the following are in pixels
    x: number; //xcoord of anchor point
    y: number; //ycoord of anchor point
    width: number;
    height: number;
    angle: number; //rotation
}

//Duration of an animation in milliseconds-- feel free to change this value if you want it slower/faster
export const ANIMATION_DURATION = 200;

interface Animation{
    //animates displacement of sprite from point A to point B
    from: AnimatedState;
    to: AnimatedState;
    elapsed: number; //milliseconds elapsed since the start of the animation to finish-- shows how far in it is in its animation
}

//read the sprite's state to see if it's mid animation, return its current animated state
export function getState(sprite: Sprite): AnimatedState{
    return{
        x: sprite.position.x,
        y: sprite.position.y,
        width: sprite.width,
        height: sprite.height,
        angle: sprite.angle,
    };
}

//Set sprite's properties to the given state-- Update calls on this
export function setState(sprite: Sprite, state: AnimatedState): void{
    sprite.position.set(state.x, state.y);
    sprite.width = state.width;
    sprite.height = state.height;
    sprite.angle = state.angle;
}

//Linear interpolation--> fractional value that moves the animation (that's like a rate it follows while getting from A to B)
//start_coord could be the initial x_i or y_i (depending on which axis- x or y we are applying linear interpolation)
//end_coord is the coord x_f or y_f (depending on which axis we are applying linear interpolation)
//progress is a fractional progress, say 50% progress would be 0.5 (ranges from 0% to 100% aka 0<-->1)
function linearInterpolation(start_coord: number, end_coord: number, progress: number): number{
    //return that linear interpolation ratio: initial point + (displacement between initial and final)*progress
    return start_coord +(end_coord - start_coord)*progress; //used the formula for linear interpolation: V = A+ (B-A) *t where t=[0,1]
}

//Linear interpolation displacement rate for rotation **using degrees**
function linearInterpolationAngle(start_angle: number, final_angle: number, progress: number): number{
    //difference between the angles-> computing it ccw and making sure that it fits into the range -180 - 180
    const shortestTurn = (((final_angle - start_angle) % 360) + 540) % 360 -180; //widely used formla in game dev for angles
    return start_angle + shortestTurn*progress; 
}

//State including the progress ratio
//from is the initial animated state, to is the final animated state
function interpolate(from: AnimatedState, to:AnimatedState, progress:number): AnimatedState{
    return{
        x: linearInterpolation(from.x, to.x, progress), //linear interpl. applied to x axis of the animated state
        y: linearInterpolation(from.y, to.y, progress), //linear interpolation applied to y axis
        width:linearInterpolation(from.width, to.width, progress), //if there is no shrinking/ expansion both to and from will have the same width so it will stay idem despite the progress%
        height: linearInterpolation(from.height, to.height, progress), //if there is no height change from the initial to final animated state, both params will be the same, so no change will happen
        angle: linearInterpolationAngle(from.angle, to.angle, progress), //if no rotation it will go from 0 to 0-> no change
    
    };
}

//Animator will have: an animate (starts the animation of the rotation, displacement, shrinking, etc), 
// // an update (move everything by a frame-- animation works frame by frame), and a cancel (stop frame)
export class Animator{

    //one running animation per sprite at a time, we keep a track of each for their respective sprite
    private animations = new Map<Sprite, Animation>();
    private duration:number; //how long the animation lasts

    //animation duration (for each individual animation) is set to our default constant
    constructor(duration: number = ANIMATION_DURATION){
        this.duration = duration;
    }

    //from is the initial animated state, to is the final animated state in the animation of said sprite
    animate(sprite: Sprite, from: AnimatedState, to: AnimatedState): void{
        setState(sprite, from); //set to original and then apply changes of animation with linear interpolation in mind
        this.animations.set(sprite, {from,to,elapsed:0});//include the animation in the set of animations we have: (sprite, animatedstate with a beginning and end state+duration)
    }

    //stop animating a specific sprite
    cancel(sprite: Sprite): void{
        this.animations.delete(sprite); //remove that animation form the list of animations we keep track of
    }

    //move an animation by a frame (we increase the milliseconds time to fast forward to the next frame-- move milliseconds)
    tick(movems: number): void{
        for(const [sprite,animation] of this.animations){ //for each sprite animation part of the animations list add ms to jump to next frame
            animation.elapsed += movems;

            let progress: number; // ranges from 0%-100% animation completion i.e. [0,1]
            //what is the progress given where the animation is at throughout its set duration? 
            // e.g: if duration 60s and it's at 30s elapsed time, progress is 0.5 (50%) because 30s/60s = 0.5
            if (this.duration > 0) {
                progress = Math.min(animation.elapsed/this.duration, 1);
            }
            else{ //duration completed, progress is 100% i.e. 1
                progress = 1;
            }

            if (progress >= 1){ //it finished
                setState(sprite, animation.to); //setting it for sprite to map to the final animated state
                this.animations.delete(sprite); //we finished with that animation, remove it from the animations list
            }
            else{
                setState(sprite, interpolate(animation.from, animation.to, progress));//keep animating it if not finished
            }
        } 
    }

}