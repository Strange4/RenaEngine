import { Container, Sprite } from 'pixi.js';
import { RenderableType } from '@/shared/renderable';
import type { GameRenderable } from '@/shared/renderable';
import { AssetLoader } from './assetLoader';

export class LiveViewRenderer {
    private mapContainer = new Container();
    private objectContainer = new Container();
    private decorationContainer = new Container();

    private sprites = new Map<string, Sprite>();

    private assetLoader: AssetLoader;

    constructor(assetLoader: AssetLoader) {
        this.mapContainer.label = 'map';
        this.objectContainer.label = 'objects';
        this.decorationContainer.label = 'decorations';

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

    addContainerToStage(stage: Container): void {
        stage.addChild(this.mapContainer);
        stage.addChild(this.objectContainer);
        stage.addChild(this.decorationContainer);
    }

    getSprite(id: string): Sprite | undefined {
        return this.sprites.get(id);
    }

    addSprite(id: string, sprite: Sprite): void {
        this.sprites.set(id, sprite);
    }

    addGameRenderable(renderable: GameRenderable): Sprite {

        const existingSprite = this.getSprite(renderable.id);
        // If the sprite already exists, return it instead of creating a new one
        if (existingSprite) {
            return existingSprite; 
        }

        const texture = this.assetLoader.getTexture(renderable.assetPath);

        const sprite = new Sprite(texture);

        sprite.position.set(
            renderable.position[0],
            renderable.position[1]
        );

        sprite.zIndex = renderable.layer;

        sprite.width = renderable.size[0];
        sprite.height = renderable.size[1];

        this.getContainer(renderable.type).addChild(sprite);
        this.addSprite(renderable.id, sprite);

        return sprite;
    }
}