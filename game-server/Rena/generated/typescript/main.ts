import { State, Action } from "./generated/gameTypes.ts";

export const URL = "PUT THE URL HERE";
export const PLAYER_TOKEN = "PUT THE PLAYER TOKEN HERE";
// If you want to be able to see your bot play the game, then set the turn delay here in ms
export const TURN_DELAY = 500;

export default async function Play(state: State): Promise<Action> {
  // Play the game!
}
