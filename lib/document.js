"use strict";

const jsonmlParse = require("jsonml-parse");
const jsondiff = require("json0-ot-diff");
const jsonml = require('jsonml-tools');
const EventManager = require('./event-manager');


/**
 * A wrapper for a sharedb document (webstrate document) providing high-level API to
 * listen to sharedb events and to update the remote document.
 *
 * @constructor
 * @param {any} sharedbConnection ShareDB connection to retrieve document.
 * @param {string} webstrateId Webstrate id.
 */
module.exports = function (sharedbConnection, webstrateId) {

    // Object returned by this constructor function.
    const module = {};

    // Preserve &, <, and > entities on the following types.
    const preserveEntitiesOnTypes = ["script", "style", "!", "#comment"];

    // Webstrate id.
    module.id = webstrateId;

    // ShareDB document.
    let sharedbDocument;

    // Event manager to register and trigger events.
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
     * Event triggered after document connected.
     *
     * @param {any} handler Event handler.
     * @returns {Disposable} An object to dispose (turn off) the event listener.
     */
    module.onDidConnect = function (handler) {
        return onEvent("connected", handler);
    };

    /**
     * Event triggered after document disconnected.
     *
     * @param {any} handler Event handler.
     * @returns {Disposable} An object to dispose (turn off) the event listener.
     */
    module.onDidDisconnect = function (handler) {
        return onEvent("disconnected", handler);
    };

    /**
     * Event triggered after document update.
     *
     * @param {any} handler Event handler.
     * @param {any} [options={}] Options like { filter: Function }.
     * @returns {Disposable} An object to dispose (turn off) the event listener.
     */
    module.onUpdate = function (handler, options = {}) {
        return onEvent("update", handler, options);
    };

    /**
     * Event triggered after document update operations received.
     *
     * @param {any} handler Event handler.
     * @param {any} [options={}] Options like { filter: Function }.
     * @returns {Disposable} An object to dispose (turn off) the event listener.
     */
    module.onUpdateOp = function (handler, options = {}) {
        return onEvent("updateOp", handler, options);
    };

    /**
     * Event triggered when document does not exist and new document is created.
     *
     * @param {any} handler Event handler.
     * @returns {Disposable} An object to dispose (turn off) the event listener.
     */
    module.onNewDocument = function (handler) {
        return onEvent("newDocument", handler);
    };

    /**
     * Event triggered when an error occured.
     *
     * @param {any} handler Event handler.
     * @returns {Disposable} An object to dispose (turn off) the event listener.
     */
    module.onError = function (handler) {
        return onEvent("error", handler);
    };

    /**
     * Close connection to document by destroying sharedb document.
     *
     * @returns {void}
     */
    module.close = () => {
        if (sharedbDocument) {
            sharedbDocument.destroy();
            em.trigger("disconnected", {});
        }
    }

    /**
     * Connect to sharedb document.
     *
     * @returns {void}
     */
    module.connect = () => {

        sharedbDocument = sharedbConnection.get("webstrates", webstrateId);

        // ShareDB documentation: The initial snapshot of the document was loaded from the server. Fires
        // at the same time as callbacks to fetch and subscribe.
        sharedbDocument.on('load', () => {
            em.trigger("connected", {});
        });

        // // Hook into sharedb connection state change in order to emit disconnected event.
        // sharedbConnection.on('state', (state/*, reason*/) => {
        //   switch (state) {
        //     case "disconnected":
        //       // em.trigger("disconnected", {});
        //       break;
        //   }
        // });

        // ShareDB documentation: Populate the fields on doc with a snapshot of the document from the
        // server, and fire events on subsequent changes.
        sharedbDocument.subscribe(function (err) {
            if (err) {
                throw err;
            }

            if (!sharedbDocument.type) {
                em.trigger("newDocument", { reason: "Document doesn't exist on server, creating it." });
                sharedbDocument.create('json0');
                let op = [{
                    "p": [],
                    "oi": ["html", {},
                        ["body", {}]
                    ]
                }];
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

        // ShareDB documentation: An operation was applied to the data. source will be false for ops
        // received from the server and defaults to true for ops generated locally.
        // Unused arguments... sharedbDocument.on('op', function onOp(ops, source) {
        sharedbDocument.on("op", function onOp() {
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
    };

    /**
     * Update sharedb document.
     *
     * @param {any} html Html content set as new sharedb document content.
     * @param {boolean} [preserveEntities=true] Preserve html entities in html content when set true, otherwise
     * entities will be replaced.
     * @returns {void}
     */
    module.update = function (html, preserveEntities = true) {
        htmlToJson(html, json => {
            updateDocument(json);
        }, preserveEntities);
    };

    /**
     * tbd.
     * All elements must have an attribute list, unless the element is a string.
     *
     * @param {any} json tbd.
     * @returns {Array} tbd.
     */
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

    /**
     * tbd.
     *
     * @param {any} xs tbd.
     * @param {any} callback tbd.
     * @returns {void}
     */
    function recurse(xs, callback) {
        return xs.map(function (x) {
            if (typeof x === "string") return callback(x, xs);
            if (Array.isArray(x)) return recurse(x, callback);
            return x;
        });
    }

    /**
     * tbd.
     *
     * @param {any} json tbd.
     * @returns {string} tbd.
     */
    function jsonToHtml(json) {
        // json = recurse(json, function(str, parent) {
        //     if (preserveEntitiesOnTypes.includes(parent[0].toLowerCase())) {
        //         return str;
        //     }
        //     return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // });
        // try {
        //     return jsonml.toXML(json, ["area", "base", "br", "col", "embed", "hr", "img", "input",
        //         "keygen", "link", "menuitem", "meta", "param", "source", "track", "wbr"
        //     ]);
        // }
        // catch (e) {
        //     em.trigger("error", { message: `Unable to parse JsonML`, jsonML: jsonml, error: e });
        // }

        json = recurse(json, function (str, parent) {
            if (["script", "style"].includes(parent[0])) { return str; }
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        });
        try {
            return jsonml.toXML(json, ["area", "base", "br", "col", "embed", "hr", "img", "input",
                "keygen", "link", "menuitem", "meta", "param", "source", "track", "wbr"]);
        } catch (e) {
            console.log("Unable to parse JsonML.");
        }
    }

    /**
     * tbd.
     *
     * @param {any} html tbd.
     * @param {any} callback tbd.
     * @param {boolean} [preserveEntities=true] tbd.
     * @returns {void}
     */
    function htmlToJson(html, callback, preserveEntities = true) {
        // jsonmlParse(html.trim(), function(err, jsonml) {
        //     if (err) throw err;
        //     jsonml = recurse(jsonml, function(str, parent) {
        //         if (preserveEntitiesOnTypes.includes(parent[0].toLowerCase())) {
        //             return str;
        //         }
        //         return str.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
        //     });
        //     callback(jsonml);
        // }, { preserveEntities });

        jsonmlParse(html.trim(), function (err, jsonml) {
            if (err) throw err;
            jsonml = recurse(jsonml, function (str, parent) {
                if (["script", "style"].includes(parent[0])) { return str; }
                return str.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
            });
            callback(jsonml);
        }, { preserveEntities: true });
    }

    /**
     * tbd.
     *
     * @param {any} newJson tbd.
     * @returns {void}
     */
    function updateDocument(newJson) {
        let normalizedOldJson = normalize(sharedbDocument.data);
        let normalizedNewJson = normalize(newJson);
        let ops = jsondiff(normalizedOldJson, normalizedNewJson);
        try {
            sharedbDocument.submitOp(ops);
        }
        catch (e) {
            em.trigger("error", { message: `Invalid document, rebuilding`, jsonML: newJson, error: e });
            let op = [{
                "p": [],
                "oi": ["html", {},
                    ["body", {}]
                ]
            }];
            sharedbDocument.submitOp(op);
        }
    }

    return module;
};