"use strict";

/**
 * A mock web socket implementation to test Webstrates node-api.
 *  
 * @constructor 
 */
module.exports = function MockWebSocket () {

  // Object returned by this constructor function.
  const module = {};

  // Server Messages
  module.MESSAGES = {
    init: { "a": "init", "protocol": 1, "id": "ea744bd49a80ed5b2d24e2a2ec732dd2", "type": "http://sharejs.org/types/JSONv0" },
    emptyDocument: { "a": "s", "c": "webstrates", "d": "test", "data": { "v": 0, "type": null } },
    document: { "a": "s", "c": "webstrates", "d": "test", "data": { "v": 8, "data": ["html", { "__wid": "czikS1SO" }, "\n\n", ["head", { "__wid": "dKPcdJxR" }, "\n  ", ["script", { "type": "text/javascript", "__wid": "aedXgObF" }, "\n    console.log(\"Hello Script!\");\n  "], "\n  \n  ", ["style", { "type": "text/css", "__wid": "a0oL1xW_" }, "\n    html,\n    body {\n      background: deeppink;\n      color: deepskyblue;\n    }\n  "], "\n"], "\n\n", ["body", { "__wid": "MaRY_oFn" }, "\n  ", ["div", { "__wid": "5gHV2_6w" }, "Hello World!"], "\n"], "\n\n"] } }
  }

  /*eslint-disable no-unused-vars*/
  module.onopen = event => {
    // dummy
  };
  /*eslint-enable no-unused-vars*/

  /*eslint-disable no-unused-vars*/
  module.onclose = event => {
    // dummy
  };
  /*eslint-enable no-unused-vars*/

  /*eslint-disable no-unused-vars*/
  module.onmessage = event => {
    // dummy
  };
  /*eslint-enable no-unused-vars*/

  /*eslint-disable no-unused-vars*/
  module.onerror = event => {
    // dummy
  };
  /*eslint-enable no-unused-vars*/

  /*eslint-disable no-unused-vars*/
  module.onunknowndata = data => {
    // empty
  };
  /*eslint-enable no-unused-vars*/

  module.send = message => {
    try {
      const data = JSON.parse(message);
      module.ondata.call(this, data);
    }
    catch (error) {
      module.onerror(error);
    }
  };

  module.ondata = data => {
    switch (data.a) {
      case "s":
        module.sendFakedMessage(module.MESSAGES.document);
        break;
      default:
        module.onunknowndata.call(this, data);
        break;
    }
  };

  module.startServer = () => {
    module.onopen.call(this, {});
    module.sendFakedMessage(module.MESSAGES.init);
  };

  module.stopServer = () => {
    module.onclose.call(this, {});
  };

  module.provokeError = () => {
    module.onerror.call(this, {});
  };

  module.sendFakedMessage = message => {
    module.onmessage.call(this, { data: JSON.stringify(message) });
  };

  return module;
};