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

        this.getContainer(renderable.type).addChild(sprite);
        this.addSprite(renderable.id, sprite);

        return sprite;
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