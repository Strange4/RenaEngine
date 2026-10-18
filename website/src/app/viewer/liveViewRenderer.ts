    import { Container, Sprite } from 'pixi.js';
    import { RenderableType } from '@/shared/renderable';

    export class LiveViewRenderer {
        private mapContainer = new Container();
        private objectContainer = new Container();
        private decorationContainer = new Container();

        private sprites = new Map<string, Sprite>();

        constructor() {
            this.mapContainer.name = 'map';
            this.objectContainer.name = 'objects';
            this.decorationContainer.name = 'decorations';
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

    }