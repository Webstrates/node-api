const W3CWebSocket = require('websocket').w3cwebsocket;
var webstrates = require('../index');

/**
 * Create a Web socket connection using the host address to connect. The host address
 * could also contain the port.
 *  
 * @param {any} hostname The host address (e.g., webstrates.cs.au.dk or localhost:7007).
 * @param {any} [port=-1] The port number. No port number assumes default Web socket port.
 * @returns {W3CWebsocket} W3C web socket connection.
 */
function createWebSocket(hostname, port = -1) {
    // https://github.com/theturtle32/WebSocket-Node/blob/19108bbfd7d94a5cd02dbff3495eafee9e901ca4/docs/W3CWebSocket.md
    return new W3CWebSocket(
        // requestUrl
        port > -1 ? `${hostname}:${port}/ws/` : `${hostname}/ws/`,
        // requestedProtocols
        undefined,
        // origin
        undefined,
        // headers
        {
            // cookie: "session=XXX"
        },
        // requestOptions
        undefined,
        // clientConfig
        {
            maxReceivedFrameSize: 1024 * 1024 * 20 // 20 MB
        });
}

/**
 * Filters out the <head>...</head> from a document and returns it as a new jsonML
 * document. 
 * 
 * @param {any} jsonML The original jsonML document.
 * @returns {any} The filtered jsonML document without head element.
 */
function filterHead(jsonML) {
    var newJsonML = jsonML.slice(0, 1);

    if (jsonML && jsonML.length > 2) {
        for (var i = 2; i < jsonML.length; i++) {
            if (jsonML[i][0].toLowerCase() === "head") {
                continue;
            }
            newJsonML.push(jsonML[i]);
        }
    }

    return newJsonML;
}

/**
 * Changes the head tag element name to neck and returns the changed jsonML
 * document.
 * 
 * @param {any} jsonML The original jsonML document.
 * @returns {any} The jsonML document with head element changed to neck.
 */
function changeHeadToNeck(jsonML) {
    if (jsonML && jsonML.length > 2) {
        for (var i = 2; i < jsonML.length; i++) {
            if (jsonML[i][0].toLowerCase() === "head") {
                jsonML[i][0] = "neck";
            }
        }
    }

    return jsonML;
}

var websocket = createWebSocket("ws://webstrate.cs.au.dk");
var client = new webstrates.Client(websocket);

/* eslint-disable no-console */

client.onDidConnect(function() {
    console.log(`client connected
`);
});

client.onDidDisconnect(function() {
    console.log(`client disconnected
`);
});

client.onError(function(error) {
    console.log(`client error
    ${error}
`);
});

// Set auto connect parameter to false in order to add event listeners to
// the document.
var document = client.openDocument("node-api", false);

document.onDidConnect(function() {
    console.log(`document connected
`);

    // Update document after connected.
    document.update(`<html><head><title>Webstrates Client CLI Example</title></head><body><div>Body / Div Content</div></body></html>`);
});

document.onDidDisconnect(function() {
    console.log(`document disconnected
`);
});

document.onError(function(error) {
    console.log(`document on error
    ${error}
`);
});

document.onNewDocument(function() {
    console.log(`document did not exist on server
`);
});

document.onUpdate(function(html) {
    console.log(`initial document content stored on server
    ${html}
`);
});

document.onUpdateOp(function(html) {
    console.log(`document on update op
    ${html}
`);
});

document.onUpdate(function(html) {
        console.log(`initial document content stored on server after on filtered
    ${html}
`);
}, {
    filter: filterHead
});

document.onUpdateOp(function(html) {
    console.log(`document on filtered update op
    ${html}
`);
}, {
    filter: filterHead
});

document.onUpdate(function(html) {
    console.log(`initial document content stored on server after on changed
    ${html}
`);
}, {
    filter: changeHeadToNeck
});

document.onUpdateOp(function(html) {
    console.log(`document on changed update op
    ${html}
`);
}, {
    filter: changeHeadToNeck
});

// Finally connect to document
// This might be deprecated once webstrates node-api supports triggering events on
// event listeners that have been registered after connection to sharedb document
// established.
document.connect();

// Disconnect after 2 seconds timeout.
setTimeout(function() {
    document.close();
    client.close();
}, 2000);

/* eslint-enable no-console */