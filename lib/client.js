"use strict";

const sharedb = require("sharedb/lib/client");

const EventManager = require('./event-manager');
const Document = require('./document');

/**
 * This client implementation uses an existing connection to a Webstrates server
 * and eases requesting webstrate documents and updating them.
 *  
 * @constructor
 * @param {any} websocket Web socket connection to Webstrates server.
 * @param {any} [options={}] Additional settings like keepAliveTimeout or autoConnect.
 */
module.exports = function (websocket, options = {}) {

  // Object returned by this constructor function.
  const module = {};

  // Override default document options.
  options = Object.assign({
    keepAliveTimeout: 10000,
    autoConnect: true
  }, options);

  // Event manager to register and trigger events.
  const em = new EventManager();
  
  // Connection to Webstrates sharedb instance. 
  let sharedbConnection;

  // Keep web socket alive. Some web socket implementations close automatically after
  // a communication timeout.
  let keepAliveInterval;

  /**
   * Register a callback function, which is called when the particular named event
   * is fired.
   * 
   * @param {string} eventName Event name.
   * @param {Function} handler Event handler called when named event is fired.
   * @param {any} [options={}] Event options.
   * @returns {Disposable} An object to dispose (turn off) the event listener.
   */
  const onEvent = function (eventName, handler, options = {}) {
    em.on(eventName, handler, options);

    return {
      dispose: () => {
        em.off(eventName, handler);
      }
    };
  };

  /**
   * Event triggered after client connected properly.
   * 
   * @param {any} handler Event handler.
   * @returns {Disposable} An object to dispose (turn off) the event listener.
   */
  module.onDidConnect = function (handler) {
    return onEvent("connected", handler);
  };

  /**
   * Event triggered after client disconnected.
   * 
   * @param {any} handler Event handler.
   * @returns {Disposable} An object to dispose (turn off) the event listener.
   */
  module.onDidDisconnect = function (handler) {
    return onEvent("disconnected", handler);
  };

  /**
   * Event triggered when an error occurs.
   * 
   * @param {any} handler Event handler.
   * @returns {Disposable} An object to dispose (turn off) the event listener.
   */
  module.onError = function (handler) {
    return onEvent("error", handler);
  };

  /**
   * Connect to sharedb.
   * 
   * @returns {void}
   */
  const connectToShareDB = () => {
    sharedbConnection = new sharedb.Connection(websocket);

    const sharedbOpenHandler = websocket.onopen;
    websocket.onopen = function (event) {
      startKeepAlive();
      em.trigger("connected", { originalEvent: event });
      sharedbOpenHandler(event);
    };

    // We're sending our own events over the websocket connection that we don't want messing with
    // ShareDB, so we filter them out.
    const sharedbMessageHandler = websocket.onmessage;
    websocket.onmessage = function (event) {
      let data = JSON.parse(event.data);
      if (data.error) {
        em.trigger("error", { message: data.error.message, originalEvent: event });
      }
      if (!data.wa) {
        sharedbMessageHandler(event);
      }
    };

    const sharedbCloseHandler = websocket.onclose;
    websocket.onclose = function (event) {
      stopKeepAlive();
      em.trigger("disconnected", { originalEvent: event });
      sharedbCloseHandler(event);
    };

    const sharedbErrorHandler = websocket.onerror;
    websocket.onerror = function (event) {
      stopKeepAlive();
      em.trigger("error", { originalEvent: event });
      sharedbErrorHandler(event);
    };
  };

  if (options.autoConnect) {
    connectToShareDB();
  }

  /**
   * Opens and returns a webstrate document.
   * 
   * @param {any} webstrateId Webstrate id.
   * @param {boolean} [autoConnect=true] Auto connect sharedb document.
   * @returns {Document} A document providing high-level API to webstrate document.
   */
  module.openDocument = function (webstrateId, autoConnect = true) {
    const document = new Document(sharedbConnection, webstrateId);

    if (autoConnect) {
      document.connect();
    }

    return document;
  }

  /**
   * Start web socket keep alive interval.
   * 
   * @returns {void}
   */
  const startKeepAlive = () => {
    stopKeepAlive();

    keepAliveInterval = setInterval(() => {
      // console.log('alive message');
      try {
        const message = { type: 'alive' };
        websocket.send(JSON.stringify(message));
      }
      catch (err) {
        em.trigger("error", err);
      }
    }, options.keepAliveTimeout);
  }

  /**
   * Stop web socket keep alive interval.
   * 
   * @returns {void}
   */
  const stopKeepAlive = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
  }

  return module;
};