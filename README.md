[![Build Status](https://travis-ci.org/Webstrates/node-api.svg?branch=master)](https://travis-ci.org/Webstrates/node-api)

# Webstrates Node API
The Webstrates Node API offers a high-level API to connect to a Webstrates server and open webstrates documents. It
further offers event callbacks, which will be called when a document does not exist on the server, a document is opened
or a document changed. This API is intended to be used by developers who want to contribute tools to ease the development
or alteration of webstrates like the [Webstrates Editor Extension for Visual Studio Code](https://github.com/Webstrates/vsce). 

Add webstrates node-api to your npm project.
```
$> npm install webstrates --save
```

Look at the example folder or [here](https://github.com/Webstrates/node-api/blob/master/example/client-cli.js) for a working
client-cli example! Alternatively, try out the following step-by-step example.

## Documentation by Example

1. Create a W3C compatible websocket.

```javascript
const W3CWebSocket = require('websocket').w3cwebsocket;

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

// Connect to webstrate.cs.au.dk --> Do not forget ws:// prefix.
var websocket = createWebSocket("ws://webstrate.cs.au.dk");
```

2. Connect to Webstrates server.

```javascript
var webstrates = require('webstrates');

...

var client = new webstrates.Client(websocket);

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
```

3. Open webstrate document (e.g., with webstrate id node-api).

```javascript
// Set auto connect parameter to false in order to add event listeners to
// the document.
var document = client.openDocument("node-api", false);

document.onDidConnect(function() {
    console.log(`document connected
`);
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

// Finally connect to document
// This might be deprecated once webstrates node-api supports triggering events on
// event listeners that have been registered after connection to sharedb document
// established.
document.connect();
```

4. Add listeners to receive document content and document updates.

```javascript
...

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

...
```

5. Filter or change webstrate document before onUpdate and onUpdateOp callbacks are triggered.

```javascript
...

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

...
```

6. Disconnect from document and also disconnect from Webstrates server.

```javascript
...

// Close connection to document.
document.close();

...

// CLose client connection. This also closes the websocket connection.
client.close();

...
```

# Developers

## How to release a new version
Use the `npm version` command to release a new version. It will run `npm test` before version is released
and only continues if all tests succeed. It further will create a git tag named after the new version and
push the tag to the remote repository. Travis CI will run again all tests and deploy the new version to
npmjs repository.

To release a new version use:

```$> npm version [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease | from-git]```

For example:

```$> npm version patch```

More details on `npm version` command at [npmjs.org](https://docs.npmjs.com/cli/version).

# License
This work is licenced under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).