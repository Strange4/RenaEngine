import {
  Coordinate,
  Ship,
  ShipName,
  ShipOrientation,
  ShotResult
} from "./generated/game.ts";
import { Action, State } from "./generated/gameTypes.ts";

let availableShots : number[];
let isInSinkingMode = false;
let sinkingCenter : Coordinate;
let direction = 0;
let nextShotOffset = 1;



export const URL = "PUT THE URL HERE";
export const PLAYER_TOKEN = "PUT THE PLAYER TOKEN HERE";
// If you want to be able to see your bot play the game, then set the turn delay here in ms
export const TURN_DELAY = 500;

export default async function Play(state: State): Promise<Action> {
  // Play the game!
  if (state.IsPlacementPhase) {
    availableShots = Array.from({length: state.GridSize * state.GridSize}, (_, i) => i);
    const ships: Ship[] = [];
    // Build a 1D array of all each available choice for easy randomizing
    const spots = Array.from({length: state.GridSize * state.GridSize}, (_, i) => i);
    const orientations = [ShipOrientation.Horizontal, ShipOrientation.Vertical];
    [[ShipName.Carrier, 5], [ShipName.Battleship, 4], [ShipName.Cruiser, 3], [ShipName.Submarine, 3], [ShipName.Destroyer, 2]].forEach(ship => {
      let isValid = false;
      let orientation : ShipOrientation;
      let startSpot : number;
      let x : number;
      let y : number;
      let neededSpots : number[];
      
      do {
        orientation = orientations[Math.floor(Math.random() * orientations.length)];
        startSpot = spots[Math.floor(Math.random() * spots.length)];
        x = startSpot % state.GridSize;
        y = Math.floor(startSpot / state.GridSize);
        // Depends on ship size, orientation and starting position
        neededSpots = Array.from({length: ship[1]}, (_, spotOffset) => orientation == ShipOrientation.Horizontal? x + spotOffset: y + spotOffset);
        isValid = neededSpots.every(spot => {
          if (orientation == ShipOrientation.Horizontal) {
            return spot < state.GridSize && binarySearch(spots,y * state.GridSize + spot) != -1;
          }
          return spot < state.GridSize && binarySearch(spots,spot * state.GridSize + x) != -1;
        });
      } while (!isValid);

      // add the action
      ships.push({Name: ship[0], StartCoordinate: {X: x, Y: y}, Orientation: orientation, Size: ship[1]});
      //remove the spots
      neededSpots.forEach(spot => {
        if (orientation == ShipOrientation.Horizontal) {
          spots.splice(binarySearch(spots,y * state.GridSize + spot), 1);
        } else {
          spots.splice(binarySearch(spots,spot * state.GridSize + x), 1);
        }
      });

    });
    const action = {
      
      PlaceShipsAction: {
        Ships: ships,
      },
    };
    return action;
  }

  let x : number;
  let y : number;

  let lastShot = state.ShotsFired[state.ShotsFired.length - 1];

  if (lastShot && lastShot.Result == ShotResult.Hit) {
    isInSinkingMode = true;
    sinkingCenter = lastShot.Coordinate!;
  }

  if (isInSinkingMode) {
    
    if (lastShot.Result == ShotResult.Sunk) {
      isInSinkingMode = false;
      direction = 0;
      nextShotOffset = 1;
    } else {
      let isValid = true;
      do {
        if (lastShot.Result == ShotResult.Miss || !isValid) {
          if (direction == 3) {
            isInSinkingMode = false;
          }
          direction = (direction + 1) % 4;
          nextShotOffset = 1;
        } else if (lastShot.Result == ShotResult.Hit) {
          nextShotOffset++;
        }

        if (direction == 0) {
          x = sinkingCenter.X + nextShotOffset;
          y = sinkingCenter.Y;
        } else if (direction == 1) {
          y = sinkingCenter.Y + nextShotOffset;
          x = sinkingCenter.X;
        } else if (direction == 2) {
          x = sinkingCenter.X - nextShotOffset;
          y = sinkingCenter.Y;
        } else {
          y = sinkingCenter.Y - nextShotOffset;
          x = sinkingCenter.X;
        }

        isValid = x < state.GridSize && y < state.GridSize && binarySearch(availableShots,y * state.GridSize + x) != -1;
        
      } while (!isValid && isInSinkingMode);
    }
  }

  if (!isInSinkingMode) {
    let randomShot = availableShots[Math.floor(Math.random() * availableShots.length)];
    x = randomShot % state.GridSize;
    y = Math.floor(randomShot / state.GridSize);
  } 

  availableShots.splice(binarySearch(availableShots,y! * state.GridSize + x!), 1);
  const action: Action = {
    ShootAction: {
      ShootAt: {
        X: x!,
        Y: y!,
      },
    },
  };
  return action;
}

function binarySearch<T>(
  arr: readonly T[],
  target: T,
  compareFn: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareFn(arr[mid], target);

    if (comparison === 0) {
      return mid;
    }
    if (comparison < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}