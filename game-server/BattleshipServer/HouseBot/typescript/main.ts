import {
  ShipName,
  ShipOrientation
} from "./generated/game.ts";
import { Action, State } from "./generated/gameTypes.ts";

let isFirstTurn = true;
let i = 0;

export const URL = "PUT THE URL HERE";
export const PLAYER_TOKEN = "PUT THE PLAYER TOKEN HERE";

export default async function Play(state: State): Promise<Action> {
  // Play the game!
  if (isFirstTurn) {
    const action = {
      PlaceShipsAction: {
        // prettier-ignore
        Ships: [
             { Name: ShipName.Carrier,    StartCoordinate: { X : 1, Y : 1 }, Orientation: ShipOrientation.Horizontal, Size: 0},
             { Name: ShipName.Battleship, StartCoordinate: { X : 1, Y : 0 }, Orientation: ShipOrientation.Horizontal, Size: 0},
             { Name: ShipName.Cruiser,    StartCoordinate: { X : 5, Y : 0 }, Orientation: ShipOrientation.Horizontal, Size: 0},
             { Name: ShipName.Submarine,  StartCoordinate: { X : 3, Y : 2 }, Orientation: ShipOrientation.Horizontal, Size: 0},
             { Name: ShipName.Destroyer,  StartCoordinate: { X : 4, Y : 3 }, Orientation: ShipOrientation.Horizontal, Size: 0},
        ],
      },
    };
    isFirstTurn = false;
    return action;
  }
  const action: Action = {
    ShootAction: {
      ShootAt: {
        X: i % state.GridSize,
        Y: Math.trunc(i / state.GridSize),
      },
    },
  };
  i++;
  return action;
}
