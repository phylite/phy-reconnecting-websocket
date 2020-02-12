const WebSocket = require('ws');
const EventEmitter = require('@phylite/phy-event-emitter');

class ReconnectingWebSocket extends EventEmitter {

    constructor(url, protocols, options){
        super();

        if(!Array.isArray(protocols) && !options){
            options = protocols;
            protocols = [];
        }

        this.ws = null; // WebSocket
        this.url = url; // WebSocket URL
        this.protocols = protocols; // The sub-protocol selected by the server.
        this.options = options || {}; // WebSocket options

        if( this.options["reconnect"] === false ) return new WebSocket(this.url, this.protocols, this.options);

        this.reconnectInterval = 1000; // How long to wait before trying to reconnect
        this.reconnectAttempts = Infinity; // Maximum number of reconnect attempts


        this.attemptNumber = 0; // Number of reconnect attempts
        this.hasHadConnection = false; // Connection has been made
        this.readyState = 0; // WebSocket readyStates plus some more
        // CONNECTING       0
        // OPEN             1
        // CLOSING          2
        // CLOSED           3
        // RECONNECTING     4



        // Events
        this.onopen = null; // Only happens on the first successful connection
        this.onclose = null; // Only happens on the final disconnection, connection was gracefully and intentionally closed
        this.onerror = null; // onerror
        this.onmessage = null; // onmessage
        this.onreconnect = null; // fired on a successful reconnection
        this.ondisconnect = null; // fired on a disconnection
        this.onconnectionretry = null; // fired before attempting it to reconnect
        this.onconnectiontimeout = null; // connection timeout

        this.cleanStart(); // Start a new ws connection

    }

    bind(){
        let ws = this.ws;

        ws.onopen = (event) => {

            // if CONNECTING and has not had any previous connection
            // else was must be RECONNECTING
            if(this.readyState === 0 || this.hasHadConnection === false) {
                this.dispatchEvent("open", event);
            } else {
                this.dispatchEvent("reconnect", event);
            }

            this.hasHadConnection = true;
            this.readyState = 1; // OPEN
            this.attemptNumber = 0; // Successfully reconnected, reset count
        };

        ws.onclose = (event) => {
            let {wasClean, reason, code} = event;

            this.attemptNumber += 1;

            // if the connection closed the cleanly emit close event
            // else try to restart connection
            if(code === 1000 || this.readyState === 2) {
                this.readyState = 3; // CLOSED
                this.dispatchEvent("close", event);
            }
            else {

                if(this.attemptNumber < this.reconnectAttempts){
                    this.readyState = 4; // RECONNECTING

                    // If connection is lost
                    if(this.attemptNumber === 1 && this.hasHadConnection) this.dispatchEvent("disconnect", event);

                    // Try to restart
                    this.dispatchEvent("connectionretry", event);

                    // Reconnect
                    setTimeout(() => {this.cleanStart()}, this.reconnectInterval);

                } else {
                    this.readyState = 3; // CLOSED
                    this.dispatchEvent("connectiontimeout", event);
                }

            }
        };

        ws.onerror = (event) => this.dispatchEvent("error", event);

        ws.onmessage = (message) => this.dispatchEvent("message", message);

    }

    unbind(){
        let ws = this.ws;
        if(!ws) return;

        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;

        let readyState = ws.readyState;
        if(readyState < 2) ws.close(1012, "restart");

        this.ws = null;
    }

    cleanStart(){
        this.unbind();
        this.ws = new WebSocket(this.url, this.protocols, this.options);
        this.bind();
    }

    close(){
        if(this.ws && this.readyState === 1) this.ws.close(1000, "close called");
        this.readyState = 2;
    }

    send(...args){
        this.ws.send(...args);
    }

    dispatchEvent(eventName, ...event){
        if(!eventName) return;
        let callback = this[`on${eventName}`];
        if(callback) callback(...event);
        this.emit(eventName, ...event);
    }

}

module.exports = ReconnectingWebSocket;