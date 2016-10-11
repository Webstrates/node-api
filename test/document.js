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

describe("document", () => {

  let share;
  let server;
  let client;
  let websocket;

  beforeEach(() => {
    server = new WebSocketServer();
    websocket = new W3CWebSocket();
    server.connect(websocket);

    share = new ShareDB();

    var stream = new WebSocketJSONStream(server);
    share.listen(stream);

    client = new Client(websocket);
  });

  afterEach(() => {
    client.close();
    share.close();
    server.close();
  });

  it("connected event", done => {

    const document = client.openDocument(defaultWebstrateId);

    let connectHandler = () => {
      expect(spyConnectHandler).to.have.been.called.once;
      document.close();
      done();
    };
    let spyConnectHandler = chai.spy(connectHandler);
    document.onDidConnect(spyConnectHandler);
  });

  it("disconnected event", done => {

    const document = client.openDocument(defaultWebstrateId);

    let disconnectHandler = () => {
      expect(spyDisconnectHandler).to.have.been.called.once;
      done();
    };
    let spyDisconnectHandler = chai.spy(disconnectHandler);
    document.onDidDisconnect(spyDisconnectHandler);

    document.close();
  });

  /**
   * Test for non-existing document.
   */
  it("new document", done => {

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

  it("new document & update document", done => {

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
});