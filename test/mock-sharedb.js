// "use strict";

// /**
//  * A mock sharedb implementation to test Webstrates node-api.
//  *  
//  * @constructor 
//  * @param {any} [options={}] Options like existing documents (e.g., { documents: ["test"] }).
//  */
// module.exports = function MockShareDB (options = {}) {

//   options = Object.assign({
//     documents: []
//   }, options);

//   // Object returned by this constructor function.
//   const module = {};

//   // Server Messages
//   module.MESSAGES = {
//     init: { "a": "init", "protocol": 1, "id": "ea744bd49a80ed5b2d24e2a2ec732dd2", "type": "http://sharejs.org/types/JSONv0" },
//     emptyDocument: { "a": "s", "c": "webstrates", "d": "test", "data": { "v": 0, "type": null } },
//     document: { "a": "s", "c": "webstrates", "d": "test", "data": { "v": 8, "data": ["html", { "__wid": "czikS1SO" }, "\n\n", ["head", { "__wid": "dKPcdJxR" }, "\n  ", ["script", { "type": "text/javascript", "__wid": "aedXgObF" }, "\n    console.log(\"Hello Script!\");\n  "], "\n  \n  ", ["style", { "type": "text/css", "__wid": "a0oL1xW_" }, "\n    html,\n    body {\n      background: deeppink;\n      color: deepskyblue;\n    }\n  "], "\n"], "\n\n", ["body", { "__wid": "MaRY_oFn" }, "\n  ", ["div", { "__wid": "5gHV2_6w" }, "Hello World!"], "\n"], "\n\n"] } }
//   }

//   /**
//    * 
//    * 
//    * @param {any} websocket Web socket used for communication.
//    */
//   module.Connection = (websocket) => {

//     websocket.onopen = () => {
//       console.log(`sharedb mock onopen`);
//     };

//     websocket.onmessage = () => {
//       console.log(`sharedb mock onmessage`);
//     };

//     websocket.onclose = () => {
//       console.log(`sharedb mock onclose`);
//     };

//     websocket.onclose = () => {
//       console.log(`sharedb mock onclose`);
//     };

//     return {
//       get: (collectionName, documentId) => {
//         return {

//         }
//       }
//     }
//   }

//   return module;
// };