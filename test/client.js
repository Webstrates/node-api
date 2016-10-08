const { describe, it } = require('mocha');
const chai = require('chai');
const spies = require('chai-spies');
const MockW3WebSocket = require('./mock-websocket');
const Client = require('../lib/client');

chai.use(spies);
const { expect } = chai;

const defaultWebstrateId = "test";

describe("client", () => {

  it("client event callbacks", () => {

    const ws = new MockW3WebSocket();

    const client = new Client(ws);

    let connectedHandler = () => { };
    let spyConnectedHandler = chai.spy(connectedHandler);
    client.onDidConnect(spyConnectedHandler);

    let errorHandler = () => { };
    let spyErrorHandler = chai.spy(errorHandler);
    client.onError(spyErrorHandler);

    let disconnectedHandler = () => { };
    let spyDisconnectedHandler = chai.spy(disconnectedHandler);
    client.onDidDisconnect(spyDisconnectedHandler);

    ws.startServer();
    ws.provokeError();
    ws.stopServer();

    expect(spyConnectedHandler).to.have.been.called.once;
    expect(spyErrorHandler).to.have.been.called.once;
    expect(spyDisconnectedHandler).to.have.been.called.once;
  });

  it("non-existing document (incl. sharedb)", () => {
    const ws = new MockW3WebSocket();
    ws.ondata = data => {
      switch (data.a) {
        // Message for document "test" --> {"a":"s","c":"clients","d":"test"}
        case "s":
          expect(data).to.deep.equal({ a: 's', c: 'webstrates', d: 'test' });
          ws.sendFakedMessage(ws.MESSAGES.emptyDocument);
          break;
      }
    }

    const client = new Client(ws);
    const document = client.openDocument(defaultWebstrateId);

    let newDocumentHandler = () => { };
    let spyNewDocumentHandler = chai.spy(newDocumentHandler);
    document.onNewDocument(spyNewDocumentHandler);

    ws.startServer();
    ws.stopServer();

    expect(spyNewDocumentHandler).to.have.been.called.once;
  });

  it("keep alive messages", done => {

    let aliveCount = 5; 

    const ws = new MockW3WebSocket();
    ws.onunknowndata = data => {
      switch (data.type) {
        case "alive":
          --aliveCount;

          if (aliveCount < 0) {
            done();
            ws.stopServer();
          }
          break;
      }
    };
    const client = new Client(ws, { keepAliveTimeout: 0 });
    client.openDocument(defaultWebstrateId);

    ws.startServer();
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

    const ws = new MockW3WebSocket();
    ws.ondata = data => {
      switch (data.a) {
        // Message for document "test" --> {"a":"s","c":"clients","d":"test"}
        case "s":
          expect(data).to.deep.equal({ a: 's', c: 'webstrates', d: 'test' });
          ws.sendFakedMessage(ws.MESSAGES.document);
          break;
      }
    }

    const client = new Client(ws);
    const document = client.openDocument(defaultWebstrateId);

    document.onUpdate(e => expect(e).to.equal(originalHtml), { filter: doc => doc });
    document.onUpdate(e => expect(e).to.equal(filteredHtml), { filter: () => ["html", { "__wid": "-czikS1SO" }, ["body", { "__wid": "MaRY_oFn" }]] });
    document.onUpdate(() => done());

    ws.startServer();
    ws.stopServer();
  });

  it("update document", done => {

    const newHtml = `<html><body><div>Hello Update!</div></body></html>`;

    const ws = new MockW3WebSocket();
    ws.ondata = data => {
      switch (data.a) {
        case "s":
          ws.sendFakedMessage(ws.MESSAGES.document);
          break;
      }
    }

    const client = new Client(ws);
    const document = client.openDocument(defaultWebstrateId);

    document.onUpdateOp(e => {
      expect(e).to.equals(newHtml);
      ws.stopServer();
      done();
    });

    ws.startServer();
    document.update(newHtml);
  });
});
