import Play from "../main.ts";
import { State, Action } from "./gameTypes.ts";


const url = process.env.URL || "http://localhost:5000/game/connect/test/1236";

const ws = new WebSocket(url);
ws.binaryType = "arraybuffer";

ws.onopen = () => {
  console.log('Connected to server');
};

ws.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  const state = State.decode(new Uint8Array(event.data));
  console.log('Received: event', state);
  const action = await Play(state);
  console.log("Sending", action);
  const bytes = Action.encode(action).finish();
  ws.send(bytes);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log(`Disconnected (Code: ${event.code}, Reason: ${event.reason})`);
};
