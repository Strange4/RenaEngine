import { GameRenderable, RenderableChange, RenderableType, ViewerSetup } from "./renderable";

//reusable base object for the tests-- fills missing values 
const baseRenderable: GameRenderable = {
  id: "base",
  position: [0, 0],
  assetPath: "/sprites/test.png",
  size: [1, 1],
  type: RenderableType.OBJECT,
  layer: 1,
};


//Test renderables
describe("RenderableType", ()=>{
    it("valid renderable type MAP", ()=>{
        expect(RenderableType.MAP).toBe("MAP");
    });

    it("valid renderable type OBJECT", ()=>{
        expect(RenderableType.OBJECT).toBe("OBJECT");
    });

    it("valid renerable type DECORATION", ()=>{
        expect(RenderableType.DECORATION).toBe("DECORATION");
    });

    it("exactly three renderable types", ()=>{
        const values = Object.values(RenderableType);
        expect(values).toHaveLength(3);
    });
});


describe("Renderable with JSON data",()=>{
    it("valid renderable parsing", ()=>{
        const json = `{"id": "player123", "position": [0,0], "layer": 1}`;
        const parsed = JSON.parse(json) as GameRenderable; //as GameRenderable to know what format/shape to expect in JSON

        expect(parsed.id).toBe("player123");
        expect(parsed.position).toEqual([0,0]);
        expect(parsed.layer).toBe(1);

    });

    it("test the 3 layer types working with GameRenderable", ()=>{
        const base: GameRenderable={
            id: "title1",
            position: [2,2],
            assetPath: "/sprites/grass.png",
            size: [1,1],
            type: RenderableType.MAP,
            layer: 0,
        };

        expect({...base, type: RenderableType.MAP}.type).toBe("MAP");
        expect({...base, type: RenderableType.OBJECT}.type).toBe("OBJECT");
        expect({...base, type: RenderableType.DECORATION}.type).toBe("DECORATION");
    });

    //Test multiple renderable things together (multiple ids and position combos)
    it.each([
        ["player1", [0,0]],
        ["bomb1", [2,2]],
        ["stone_tile", [5,3]],
    ]) ("parses id %p at position %p correctly", (id, position)=>{
        //for each thing above
        const renderable: GameRenderable ={
            ...baseRenderable, //the missing unspecified fields get filled with dummy test values
            id: id as string, 
            position: position as [number, number],
        };
        expect(renderable.id).toBe(id);
        expect(renderable.position).toEqual(position);

    });
});

describe("Change in renderable parsed from JSON", ()=>{

    //test single change
    it("single change parsed correctly",()=>{
        const json= `{"index":0, "changes": [{"id": "player1", "position": [20,30]}]}`;
        const parsed= JSON.parse(json) as RenderableChange;

        expect(parsed.index).toBe(0);
        expect(parsed.changes).toHaveLength(1);
        expect(parsed.changes[0].id).toBe("player1");
    });

    //test no changes (empty array)
    it("no changes", ()=>{
        const change: RenderableChange = {index:5, changes:[]};
        expect(change.changes).toHaveLength(0);
    });

    //multiple changes (e.g. Battleship target hit affects multiple tiles)
    it("multiple changes", ()=>{
        const change: RenderableChange={
            index:6,
            changes:[
                {...baseRenderable, id: "ship1_1", removed: true },
                {...baseRenderable, id: "ship1_2", removed: true },
            ],
        };
        expect(change.changes).toHaveLength(2);
        expect(change.changes[0].removed).toBe(true);
        expect(change.changes[1].removed).toBe(true);
    });
});


//Game texture initial rendering (viewer setup)
describe("viewer setup from parsed JSON", ()=>{
    it("valid parsing", ()=>{
        const json= `{"tileSize": 32, "resolution": [640,480]}`;
        const parsed = JSON.parse(json) as ViewerSetup;

        expect(parsed.tileSize).toBe(32);
        expect(parsed.resolution).toEqual([640,480]);
    });
});
