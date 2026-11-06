import Play from "../main.ts";

(async () => {

  let url = process.env.URL || "http://localhost:3000/game/connect/test/1236";

  let ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('Connected to server');
  };

  ws.onmessage = (event) => {
    console.log('Received:', event.data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = (event) => {
    console.log(`Disconnected (Code: ${event.code}, Reason: ${event.reason})`);
  };

})();