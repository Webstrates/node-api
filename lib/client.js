"use strict";

const W3CWebSocket = require('websocket').w3cwebsocket;

const Document = require('./document');

/**
 * 
 * @constructor
 * @param {any} websocket
 * @param {any} [options={}]
 */
module.exports = function (websocket, options = {}) {

  // Object returned by this constructor function.
  const module = {};

  module.openDocument = function (webstrateId, autoConnect = true) {
    const document = new Document(websocket, webstrateId, options);

    if (autoConnect) {
      document.connect();
    }

    return document;
  }

  return module;
};