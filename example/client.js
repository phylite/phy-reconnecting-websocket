const ReconnectingWebSocket = require("../index.js");

// reconnect: true, will just return the default WebSocket ( return new  WebSocket(...) )
let ws = new ReconnectingWebSocket("wss://echo.websocket.org", { reconnect: true });


ws.on("message", (event) => {
    let message = event.data || event;
    console.log(`Received message: ${message}`) // Hello World!
});

ws.on("open", (event) => {
    console.log("WebSocket is open!");

    ws.send("Hello World!");
});