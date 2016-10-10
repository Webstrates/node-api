"use strict";

const EventManager = require('../../lib/event-manager');

let counter = 0;

const W3CWebSocket = function () {


  // Object returned by this constructor function.
  const module = {};

  module.id = counter++;

  const em = new EventManager();

  /*eslint-disable no-unused-vars*/
  module.onopen = event => {
    // dummy
  };
  /*eslint-enable no-unused-vars*/

  /*eslint-disable no-unused-vars*/
  module.onclose = event => {
    // dummy
  };
  /*eslint-enable no-unused-vars*/

  /*eslint-disable no-unused-vars*/
  module.onmessage = event => {
    // dummy
  };
  /*eslint-enable no-unused-vars*/

  /*eslint-disable no-unused-vars*/
  module.onerror = event => {
    // dummy
  };
  /*eslint-enable no-unused-vars*/

  module.send = message => {
    // console.log(`send from client ${JSON.stringify(message)}`);
    em.trigger("send", message);
    // process.nextTick(() => {
    // });
    // console.log(module.server);
  };

  module.onDidSend = handler => {
    em.on("send", handler);

    return {
      dispose: () => {
        em.off("send", handler);
      }
    }
  };

  module.close = () => {
    module.onclose.call(this, {});
  };

  return module;
};

const Server = function () {

  // Object returned by this constructor function.
  const module = {};

  const em = new EventManager({
    allowedEvents: [
      "connection",
      "message",
      "close"
    ]
  });

  const websockets = [];

  module.on = (eventName, handler) => {
    // console.log(`register event ${eventName}: ${handler}`);
    em.on(eventName, handler);
  };

  module.send = data => {
    // console.log(`data: ${data} to websockets ${websockets.length}`);

    process.nextTick(() => {
      websockets.forEach(websocket => {
        // console.log(`onmessage ${websocket.onmessage}`);
        websocket.onmessage.call(websocket, { data: data });
      });
    });
  };

  /**
   * Connect client to server.
   * 
   * @param {any} websocket Client web socket.
   * @returns {void}
   */
  module.connect = websocket => {
    websockets.push(websocket);

    // Override websocket send function to hook in-between to receive "outgoing" data.
    const websocketSend = websocket.send;
    websocket.send = data => {
      // console.log(`client ${websocket.id} sent message ${data}`);
      websocketSend.call(websocket, data);

      try {
        const obj = JSON.parse(data);
        // ignore alive messages
        if (obj.type === "alive") {
          return;
        }

        process.nextTick(() => {
          // console.log(typeof data);
          em.trigger("message", data);
        });
      }
      catch (error) {
        throw error;
      }
    };

    // To mimic Node single-thread behavior, trigger connection event on next tick.
    // This will allow event listeners to be registered before connection event is
    // triggered.
    process.nextTick(() => {
      em.trigger('connection', {});
      websocket.onopen.call(websocket, {});
    });
  };

  /**
   * Closes the web socket server.
   * 
   * @returns {void}
   */
  module.close = () => {
    process.nextTick(() => {
      websockets.forEach(websocket => {
        websocket.onclose.call(websocket, {});
      })
      websockets.length = 0;
    });
  };

  /**
   * Provokes an error (only for testing!!!).
   * 
   * @returns {void}
   */
  module.provokeError = () => {
    process.nextTick(() => {
      websockets.forEach(websocket => {
        // websocket.send(`{ error: "scrambled eggs" }`);
        websocket.onerror.call(websocket, {});
      });
    });
  };

  return module;
};

/**
 * A mock web socket implementation to test Webstrates node-api.
 *  
 * @constructor 
 */
module.exports = {
  w3cwebsocket: W3CWebSocket,
  server: Server
};
