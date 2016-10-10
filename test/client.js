const { describe, beforeEach, afterEach, it } = require('mocha');
const chai = require('chai');
const spies = require('chai-spies');
const WebSocketServer = require('./mock/websocket').server;
const W3CWebSocket = require('./mock/websocket').w3cwebsocket;
const Client = require('../lib/client');

const ShareDB = require('sharedb');
const WebSocketJSONStream = require('websocket-json-stream');

chai.use(spies);
const { expect } = chai;

const defaultWebstrateId = "test";

/**
 * Test Webstrates node client.
 */
describe("client", () => {

  let server;
  let websocket;
  let share;

  beforeEach(() => {
    //   // console.log('each');

    server = new WebSocketServer();
    websocket = new W3CWebSocket();
    server.connect(websocket);

    share = new ShareDB();

    var stream = new WebSocketJSONStream(server);
    share.listen(stream);
  });

  afterEach(() => {
    share.close();
    server.close();
  });

  /**
   * Test node client event handling.
   */
  it("client event callbacks", done => {

    const client = new Client(websocket);

    const whenDone = () => {
      expect(spyConnectedHandler).to.have.been.called.once;
      expect(spyErrorHandler).to.have.been.called.once;
      expect(spyDisconnectedHandler).to.have.been.called.once;

      done();
    };

    let connectedHandler = () => {
      server.provokeError();
    };
    let spyConnectedHandler = chai.spy(connectedHandler);
    client.onDidConnect(spyConnectedHandler);

    let errorHandler = () => {
      server.close();
    };
    let spyErrorHandler = chai.spy(errorHandler);
    client.onError(spyErrorHandler);

    let disconnectedHandler = () => {
      whenDone();
    };
    let spyDisconnectedHandler = chai.spy(disconnectedHandler);
    client.onDidDisconnect(spyDisconnectedHandler);
  });

  /**
   * Test for non-existing document.
   */
  it("non-existing document (incl. sharedb)", done => {

    websocket.onDidSend(rawData => {
      try {
        const data = JSON.parse(rawData);
        switch (data.a) {
          // Message for document "test" --> {"a":"s","c":"clients","d":"test"}
          case "s":
            expect(data).to.deep.equal({ a: 's', c: 'webstrates', d: 'test' });
            break;
        }
      }
      catch (error) {
        throw error;
      }
    });

    const client = new Client(websocket);
    const document = client.openDocument(defaultWebstrateId);

    let newDocumentHandler = () => {
      done();
    };
    let spyNewDocumentHandler = chai.spy(newDocumentHandler);
    document.onNewDocument(spyNewDocumentHandler);
  });

  /**
   * Testing alive messages.
   */
  it("keep alive messages", done => {

    let aliveCount = 5;

    websocket.onDidSend(rawData => {
      try {
        const data = JSON.parse(rawData);
        switch (data.type) {
          case "alive":
            --aliveCount;

            if (aliveCount === 0) {
              done();
            }
            break;
        }
      }
      catch (error) {
        throw error;
      }
    });

    new Client(websocket, { keepAliveTimeout: 0 });
  });

  it("connection (incl. sharedb)", done => {

    var originalHtml =
      `<html __wid="czikS1SO">

  <head __wid="dKPcdJxR">
    <script type="text/javascript" __wid="aedXgObF">
      console.log("Hello Script!");
    </script>

    <style type="text/css" __wid="a0oL1xW_">
      html,
      body {
        background: deeppink;
        color: deepskyblue;
      }
    </style>
  </head>

  <body __wid="MaRY_oFn">
    <div __wid="5gHV2_6w">Hello World!</div>
  </body>

  </html>`;

    var filteredHtml = `<html __wid="-czikS1SO"><body __wid="MaRY_oFn"></body></html>`;

    const client = new Client(websocket);
    let document = client.openDocument(defaultWebstrateId);

    // Create document first.
    document.onNewDocument(() => {
      document.update(originalHtml);
      document.close();

      document = client.openDocument(defaultWebstrateId);
      document.onUpdate(e => expect(e).to.equal(originalHtml), { filter: doc => doc });
      document.onUpdate(e => expect(e).to.equal(filteredHtml), { filter: () => ["html", { "__wid": "-czikS1SO" }, ["body", { "__wid": "MaRY_oFn" }]] });
      document.onUpdate(() => done());
    });
  });

  it("update document", done => {

    const newHtml = `<html><body><div>Hello Update!</div></body></html>`;

    const client = new Client(websocket);
    let document = client.openDocument(defaultWebstrateId);

    document.onNewDocument(() => {
      document.close();

      document = client.openDocument(defaultWebstrateId);
      document.onUpdateOp(e => {
        expect(e).to.equals(newHtml);
        done();
      });
      document.update(newHtml);
    });
  });
});
