//This file is essential for the rendering of real game data (fits any GENERIC game)
//defines the shared interfaces from the game server (no hardcoded display rendering)-- it's the shared communication between the game server and the liveviewer

//precondition (game server's): sends data in a format (json tbd)
//postcondition (viewer): reads data and renders


/*
LAYER types
our app.stage will  have mapContainer (bottom, this is the game texture), objectContainer (middle), decorationContainer (top)
It will draw each plan using the Painter's Algorithm (could also be the Z-Algo--- more efficient)
i.e. Objects appear on top of any other layers
*/
export enum RenderableType{
    MAP="MAP",
    OBJECT="OBJECT",
    DECORATION="DECORATION",
}

//Generic renderable- the game object contains a unique id (to track what sprites belong to what game *could also have this in the url tbd)
//any renderable change should lookup the id!!! (for proper game linking)
export interface GameRenderable{
    id: string; 
    position: [number, number];
    assetPath:string; 
    size:[number, number]; //how big the object is tile-wise
    type:RenderableType; 
    layer:number; //zIndex for the Z Algorithm drawing the layers (graphics)
    removed?: boolean; //optional, might need this for games like Battleship where elements get removed
}


/*
Renderable changes
*we consider this for one clock tick
For efficiency, change what needs to be and keep the rest as is => use a list of renderables that just got changed. If the id of that renderable is new, create the sprite. If the id is existing, update the sprite associated to the id
List of changes/actions is sent by the game server
*/
export interface RenderableChange{
    index: number; //position of the action change (keep a sequence of changes-- helps us jump to moments backwards, forwards etc)
    changes: GameRenderable[]; //list of changed renderables, each has a unique id
}

/*
Game Texture setup (no actions, just visuals)
*/
export interface ViewerSetup{
    tileSize: number;
    resolution: [number,number]; //game host can personalize the size of the pixiJs Canvas showing the game rendering
}