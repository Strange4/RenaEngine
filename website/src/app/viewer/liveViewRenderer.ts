import { Container, Sprite } from 'pixi.js';
import { RenderableType } from '@/shared/renderable';
import type { GameRenderable, ViewerSetup } from '@/shared/renderable';
import { AssetLoader } from './assetLoader';

export class LiveViewRenderer {
    // Containers for different types of renderables
    private mapContainer = new Container();
    private objectContainer = new Container();
    private decorationContainer = new Container();

    // Map to keep track of sprites by their IDs
    private sprites = new Map<string, Sprite>();

    private assetLoader: AssetLoader;

    constructor(assetLoader: AssetLoader, private viewerSetup: ViewerSetup) {
        this.mapContainer.label = 'map';
        this.objectContainer.label = 'objects';
        this.decorationContainer.label = 'decorations';

        // Enable sorting of children for proper layering
        this.mapContainer.sortableChildren = true;
        this.objectContainer.sortableChildren = true;
        this.decorationContainer.sortableChildren = true;

        this.assetLoader = assetLoader;
    }

    getContainer(type: RenderableType): Container {
        switch (type) {
            case RenderableType.MAP:
                return this.mapContainer;
            case RenderableType.OBJECT:
                return this.objectContainer;
            case RenderableType.DECORATION:
                return this.decorationContainer;
            default:
                throw new Error(`Unknown renderable type: ${type}`);
        }
    }

    // Add all containers to the main stage
    addContainerToStage(stage: Container): void {
        stage.addChild(this.mapContainer);
        stage.addChild(this.objectContainer);
        stage.addChild(this.decorationContainer);
    }

    // Retrieve a sprite by its ID
    getSprite(id: string): Sprite | undefined {
        return this.sprites.get(id);
    }

    // Add a sprite to so it can be retrieved later by its ID
    addSprite(id: string, sprite: Sprite): void {
        this.sprites.set(id, sprite);
    }

    addGameRenderable(renderable: GameRenderable): Sprite {

        const existingSprite = this.getSprite(renderable.id);
        // If the sprite already exists, return it instead of creating a new one
        if (existingSprite) {
            return existingSprite;
        }

        // Get the container first so an unknown type throws before any sprite is created
        const container = this.getContainer(renderable.type);

        // Load the texture for the renderable's asset path
        const texture = this.assetLoader.getTexture(renderable.assetPath);

        const sprite = new Sprite(texture);

        // Pixi rotates around the sprite's anchor, which acts as its pivot point.
        const tileCenter = this.viewerSetup.tileSize / 2;

        // The position tile is the first tile of the renderable. Divide the
        // half-tile offset (0.5) by the renderable size to place the pivot at the
        // center of that tile, even for sprites spanning multiple tiles.
        // Since Pixi's anchor is normalized (0-1), we divide by the
        // renderable's size in tiles.
        sprite.anchor.set(
            0.5 / renderable.size[0],
            0.5 / renderable.size[1],
        );
        // Pixi's position is the anchor's world position, so offset it to
        // the tile center. This keeps the sprite's visual top-left corner at
        // the renderable's tile position while rotation stays on that tile.
        sprite.position.set(
            renderable.position[0] * this.viewerSetup.tileSize + tileCenter,
            renderable.position[1] * this.viewerSetup.tileSize + tileCenter,
        );
        // Set the zIndex for layering
        sprite.zIndex = renderable.layer;

        // Set the sprite's size based on the renderable's size and the tile size
        // Convert tile-based size to pixel size
        sprite.width = renderable.size[0] * this.viewerSetup.tileSize;
        sprite.height = renderable.size[1] * this.viewerSetup.tileSize;
        sprite.angle = renderable.rotation ?? 0;

        this.applyUpdates(sprite, renderable);
        container.addChild(sprite);
        this.addSprite(renderable.id, sprite);

        return sprite;
    }

    // Create the sprite of a renderable that a change introduced (its ID isn't shown yet).
    // Unlike the initial scene, its asset may not be loaded, so load it first.
    async createGameRenderable(renderable: GameRenderable, signal?: AbortSignal): Promise<Sprite | undefined> {
        await this.assetLoader.loadFor([renderable]);

        // The viewer may have been destroyed while the asset was loading
        if (signal?.aborted) return undefined;

        return this.addGameRenderable(renderable);
    }

    //Update an exisiting renderable (id is present in the viewer state) such that the renderable gets its properties modified
    //param renderable is the new version with the updated properties we want
    

    //Helper function-> it applies the changes to each property of the sprite
    private applyUpdates (sprite: Sprite, renderable: GameRenderable){


        //adding this part of the creational logic
        // Pixi rotates around the sprite's anchor, which acts as its pivot point.
        const tileCenter = this.viewerSetup.tileSize / 2;

        // The position tile is the first tile of the renderable. Divide the
        // half-tile offset (0.5) by the renderable size to place the pivot at the
        // center of that tile, even for sprites spanning multiple tiles.
        // Since Pixi's anchor is normalized (0-1), we divide by the
        // renderable's size in tiles.
        sprite.anchor.set(
            0.5 / renderable.size[0],
            0.5 / renderable.size[1],
        );
        // Pixi's position is the anchor's world position, so offset it to
        // the tile center. This keeps the sprite's visual top-left corner at
        // the renderable's tile position while rotation stays on that tile.
        sprite.position.set(
            renderable.position[0] * this.viewerSetup.tileSize + tileCenter,
            renderable.position[1] * this.viewerSetup.tileSize + tileCenter,
        );
       
        sprite.zIndex = renderable.layer; //zIndex relates to the planes where we place the sprites: background, fore plan, partially hidden by another sprite, etc
        sprite.width = renderable.size[0];
        sprite.height = renderable.size[1];

       sprite.angle = renderable.rotation ?? 0; //if not specified, no rotation
    }

    async updateGameRenderable(renderable: GameRenderable, signal?: AbortSignal): Promise<Sprite | undefined> {
        
        //each sprite is kept in one of 3 containers depending on its type--- helps control layering
        //type changes can also be updates
        const container = this.getContainer(renderable.type);

        await this.assetLoader.loadFor([renderable]); //load asset. old sprite still showing at this point

        //reusing same logic as from Create here--> // The viewer may have been destroyed while the asset was loading
        if (signal?.aborted) return undefined;
    
        //Check for case below first!: "is there even an update to do" checker
        //the renderer maps an ID to a sprite, both old and new versions share the same id. We can fetch the old sprite using that id
        //if we can't find the old sprite, then it's not on the screen and nothing to update
        const sprite = this.getSprite(renderable.id);
        if (!sprite){
            return undefined; //no updates to do, sprite isn't even showing up on screen
        }

        sprite.texture = this.assetLoader.getTexture(renderable.assetPath);

        //if the sprite changed its type: deco, object, obstacle the layering might get into play, 
        if (sprite.parent !== container){
            container.addChild(sprite);
        }
        
        //calling the helper function that applies all of the new changes property by property
        this.applyUpdates(sprite, renderable);
        return sprite; //show new updated sprite image on screen
    }

    // Remove the sprite when its renderable gets removed so it's not shown anymore
    removeGameRenderable(id: string): void {
        const sprite = this.getSprite(id);
        // If there's no sprite for this ID (never created or already removed), nothing to do
        if (!sprite) {
            return;
        }

        // destroy() also takes the sprite out of its container.
        // We don't destroy the texture since other sprites can be using the same asset
        sprite.destroy();
        this.sprites.delete(id);
    }



    async renderScene(renderables: GameRenderable[], signal?: AbortSignal): Promise<void> {
        // Load the assets before creating sprites
        await this.assetLoader.loadFor(renderables);

        // The viewer may have been destroyed while the assets were loading
        if (signal?.aborted) return;

        // Create a sprite for each renderable
        for (const renderable of renderables) {
            this.addGameRenderable(renderable);
        }
    }
}