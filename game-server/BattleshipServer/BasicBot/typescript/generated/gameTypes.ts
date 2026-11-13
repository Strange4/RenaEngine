import { PlayerAction, PlayerState } from "./game.ts"
export const Action = PlayerAction;
export const State = PlayerState;
export interface Action extends PlayerAction {}
export interface State extends PlayerState {}
