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

/**
 * Test Webstrates node client.
 */
describe("client", () => {

  let server;
  let websocket;
  let share;

  beforeEach(() => {
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
   * Testing client connected event callback.
   */
  it("connected event", done => {

    const client = new Client(websocket);

    let spyConnectedHandler = chai.spy(() => {
      expect(spyConnectedHandler).to.have.been.called.once;
      done();
    });
    client.onDidConnect(spyConnectedHandler);
  });

  /**
   * Testing client disconnected event callback.
   */
  it("disconnected event", done => {

    const client = new Client(websocket);

    let spyDisconnectedHandler = chai.spy(() => {
      expect(spyDisconnectedHandler).to.have.been.called.once;
      done();
    });
    client.onDidDisconnect(spyDisconnectedHandler);
      
    server.close();
  });

  /**
   * Testing client error event callback.
   */
  it("error event", done => {

    const client = new Client(websocket);

    let spyErrorHandler = chai.spy(() => {
      expect(spyErrorHandler).to.have.been.called.once;
      done();
    });
    client.onError(spyErrorHandler);

    server.provokeError();
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
});
