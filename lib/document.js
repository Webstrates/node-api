"use strict";

const sharedb = require("sharedb/lib/client");
const jsonmlParse = require("jsonml-parse");
const jsondiff = require("json0-ot-diff");
const jsonml = require('jsonml-tools');
const EventManager = require('./event-manager');

/**
 * @constructor
 * @param {WebSocket} websocket Web socket object.
 * @param {string} webstrateId Id of webstrate.
 * @param {any} [options={}] Additional settings like keepAliveTimeout.
 */
module.exports = function (websocket, webstrateId, options) {

  // Object returned by this constructor function.
  const module = {};

  // Override default document options.
  options = Object.assign({
    keepAliveTimeout: 10000
  }, options);

  let sharedbDocument;
  let keepAliveInterval;

  module.id = webstrateId;

  const em = new EventManager({
    allowedEvents: [
      "connected",
      "disconnected",
      "update",
      "updateOp",
      "newDocument",
      "error"
    ]
  });

  /**
   * Register a callback function, which is called when the particular named event
   * is fired.
   * 
   * @param String eventName Event name.
   * @param Function listener Listener called when named event is fired.
   * @param {} options Event options.
   */
  const onEvent = function (eventName, listener, options = {}) {
    em.on(eventName, listener, options);

    return {
      dispose: () => {
        em.off(eventName, listener);
      }
    };
  };

  module.onDidConnect = function (listener) {
    return onEvent("connected", listener);
  };

  module.onDidDisconnect = function (listener) {
    return onEvent("disconnected", listener);
  };

  module.onUpdate = function (listener, options) {
    return onEvent("update", listener, options);
  };

  module.onUpdateOp = function (listener, options) {
    return onEvent("updateOp", listener, options);
  };

  module.onNewDocument = function (listener) {
    return onEvent("newDocument", listener);
  };

  module.onError = function (listener) {
    return onEvent("error", listener);
  };

  module.close = () => {
    if (sharedbDocument) {
      sharedbDocument.destroy();
    }
  }

  module.connect = () => {
    sharedbDocument = new sharedb.Connection(websocket);

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

    sharedbDocument = sharedbDocument.get("webstrates", webstrateId);

    // Unused arguments... sharedbDocument.on('op', function onOp(ops, source) {
    sharedbDocument.on('op', function onOp() {
      let json = sharedbDocument.data;

      em.trigger("updateOp", json, {
        onFiltered: function (afterFiltered) {
          return jsonToHtml(afterFiltered);
        },
        onNotFiltered: function (notFiltered) {
          return jsonToHtml(notFiltered);
        }
      });
    });

    sharedbDocument.subscribe(function (err) {
      if (err) {
        throw err;
      }

      if (!sharedbDocument.type) {
        em.trigger("newDocument", { reason: "Document doesn't exist on server, creating it." });
        sharedbDocument.create('json0');
        let op = [{ "p": [], "oi": ["html", {}, ["body", {}]] }];
        sharedbDocument.submitOp(op);
      }

      let json = sharedbDocument.data;

      em.trigger("update", json, {
        onFiltered: function (afterFiltered) {
          return jsonToHtml(afterFiltered);
        },
        onNotFiltered: function (notFiltered) {
          return jsonToHtml(notFiltered);
        }
      });
    });
  };

  module.update = function (html, preserveEntities = true) {
    htmlToJson(html, json => {
      updateDocument(json);
    }, preserveEntities);
  };

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

  const stopKeepAlive = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
  }

  // All elements must have an attribute list, unless the element is a string
  function normalize(json) {
    if (typeof json === "undefined" || json.length === 0) {
      return [];
    }

    if (typeof json === "string") {
      return json;
    }

    let [tagName, attributes, ...elementList] = json;

    // Second element should always be an attributes object.
    if (Array.isArray(attributes) || typeof attributes === "string") {
      elementList.unshift(attributes);
      attributes = {};
    }

    if (!attributes) {
      attributes = {};
    }

    elementList = elementList.map(function (element) {
      return normalize(element);
    });

    return [tagName.toLowerCase(), attributes, ...elementList];
  }

  function recurse(xs, callback) {
    return xs.map(function (x) {
      if (typeof x === "string") return callback(x, xs);
      if (Array.isArray(x)) return recurse(x, callback);
      return x;
    });
  }

  function jsonToHtml(json) {
    json = recurse(json, function (str, parent) {
      if (["script", "style"].includes(parent[0].toLowerCase())) {
        return str;
      }
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    });
    try {
      return jsonml.toXML(json, ["area", "base", "br", "col", "embed", "hr", "img", "input",
        "keygen", "link", "menuitem", "meta", "param", "source", "track", "wbr"]);
    }
    catch (e) {
      em.trigger("error", { message: `Unable to parse JsonML`, jsonML: jsonml, error: e });
    }
  }

  function htmlToJson(html, callback, preserveEntities = true) {
    jsonmlParse(html.trim(), function (err, jsonml) {
      if (err) throw err;
      jsonml = recurse(jsonml, function (str, parent) {
        if (["script", "style"].includes(parent[0].toLowerCase())) {
          return str;
        }
        return str.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
      });
      callback(jsonml);
    }, { preserveEntities });
  }

  function updateDocument(newJson) {
    let normalizedOldJson = normalize(sharedbDocument.data);
    let normalizedNewJson = normalize(newJson);
    let ops = jsondiff(normalizedOldJson, normalizedNewJson);
    try {
      sharedbDocument.submitOp(ops);
    }
    catch (e) {
      em.trigger("error", { message: `Invalid document, rebuilding`, error: e });
      let op = [{ "p": [], "oi": ["html", {}, ["body", {}]] }];
      sharedbDocument.submitOp(op);
    }
  }

  return module;
};
