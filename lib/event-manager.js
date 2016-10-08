"use strict";

const { isUndefined, isFunction, isArray/*, deepFreeze*/ } = require('./helpers');

/**
 * The event manager is a class that provides on, off, and trigger functions and thereby mimics
 * a well-established JavaScript event handling pattern. An instance of this event handler can
 * register event handlers for given event names using the on function. The off function removes
 * event handlers. The trigger function triggers event handlers registered under the triggered event
 * name. 
 * 
 * @constructor
 * @param {any} [options={}] Event handler options (e.g., allowedEvents: ["myEventA", "my-event-b", "myeventc"]).
 */
module.exports = function (options = {}) {

  // Object returned by this constructor function.
  const module = {};

  // Override default event handler options.
  options = Object.assign({
    allowedEvents: undefined
  }, options);

  // Container holding registered event handlers.
  // i.e. { myEventA: [ { handler: Function, options: { filter: Function } }, { handler: Function } ]}
  const _eventHandlers = {};

  /**
   * Register an event handler function for a given event name. Add options for event handling such
   * as { filter: Function }, which will be called each time an event is triggered.
   * 
   * @param {string} eventName Event name.
   * @param {Function} eventHandler Event handler function.
   * @param {any} [eventOptions={}] Event handler options such as { filter: Function }.
   * @returns {void}
   */
  module.on = function (eventName, eventHandler, eventOptions = {}) {

    // Event handler needs to be a function.
    if (!isFunction(eventHandler)) {
      throw new Error(`event handler needs to be a function`);
    }

    // Check if allowedEvents is set, if it is an array, and if the event is allowed. Otherwise throw
    // exceptions. 
    if (!isUndefined(options.allowedEvents)) {
      if (isArray(options.allowedEvents)) {
        if (options.allowedEvents.indexOf(eventName) < 0) {
          throw new Error(`event is not allowed`);
        }
      }
      else {
        throw new Error(`allowed events needs to be an array of strings`);
      }
    }

    // Create event handler metadata including the event handler object as well as the event
    // options object.
    const metadata = {
      handler: eventHandler,
      options: eventOptions
    };

    // Init container for named event if it does not exist.
    if (isUndefined(_eventHandlers[eventName])) {
      _eventHandlers[eventName] = [];
    }

    // Add event handler.
    _eventHandlers[eventName].push(metadata);
  };

  /**
   * Remove an event handler function registered to named events.
   * 
   * @param {string} eventName Event name.
   * @param {Function} eventHandler Event handler function.
   * @returns {void}
   */
  module.off = function (eventName, eventHandler) {

    // Event handler needs to be a function.
    if (!isFunction(eventHandler)) {
      throw new Error('event handler needs to be a function');
    }

    // Check if event handler was actually registered. The idx variable will
    // be > -1 when event handler exists, otherwise it will be -1.
    var idx = -1;
    if (hasEventHandlers(eventName)) {
      const len = _eventHandlers[eventName].length;
      for (var i = 0; i < len; i++) {
        if (_eventHandlers[eventName][i].handler === eventHandler) {
          idx = i;
          break;
        }
      }
    }

    // Throw an error if someone tries to remove an event handler, which has not been
    // registered before.
    if (idx < 0) {
      throw new Error('event handler not registered');
    }

    // Remove event handler.
    _eventHandlers[eventName].splice(idx, 1);
  };

  /**
   * Trigger an event with name and an event object. Each handler function registered with
   * the event name will be called with the event object as first parameter. Additionally,
   * event handler options registered with an event handler will be processed before calling
   * the event handler function. For example, a filter function (e.g., { filter: Function })
   * will be called before the event handler is triggered. If applies, optional trigger options
   * will be executed afterwards, e.g., { onFiltered: Function } will be called after an event
   * handler's optional filter function is called. Otherwise { onNotFiltered: Function } is
   * called.
   * 
   * @param {string} eventName Event name.
   * @param {any} event Event object.
   * @param {any} [triggerOptions={}] Optional settings used when event is triggered.
   * @returns {void}
   */
  module.trigger = function (eventName, event, triggerOptions = {}) {

    // Trigger events if there are any event handlers registered for named event.
    if (hasEventHandlers(eventName)) {

      // Trigger each event handler.
      _eventHandlers[eventName].forEach(({ handler, options }) => {

        // Freeze event object to make sure it is not mutated during event handling and
        // to assure that every event handler gets the same event object that was passed
        // with the trigger function.
        // let frozenEvent = deepFreeze(event);
        let frozenEvent = event; // !!! Do not freeze event, otherwise sharedb complains.

        // Check if filter function was set as an option when registerd the event handler.
        if (isFunction(options.filter)) {

          // Call filter function and again deep freeze the function result.
          frozenEvent = options.filter.call(this, frozenEvent);
          // frozenEvent = deepFreeze(frozenEvent);  // !!! Do not freeze event, otherwise sharedb complains.

          // Check if onFiltered event was set in the triggerOptions.
          if (isFunction(triggerOptions.onFiltered)) {
            frozenEvent = triggerOptions.onFiltered.call(this, frozenEvent);
          }
        }
        else {
          // If not filter option was set when the event handler was registered then call
          // the onNotFiltered function if set in the triggerOptions.
          if (isFunction(triggerOptions.onNotFiltered)) {
            frozenEvent = triggerOptions.onNotFiltered.call(this, frozenEvent);
          }
        }

        // Finally, call event handler.
        handler.call(this, frozenEvent);
      });
    }
  };

  /**
   * Returns true if event handlers exist for named event.
   * 
   * @param {any} eventName Event name.
   * @returns {boolean} True if event handlers exist for named events, otherwise false.
   */
  const hasEventHandlers = eventName => {
    const namedEventHandlers = _eventHandlers[eventName];
    return isArray(namedEventHandlers) && namedEventHandlers.length > 0;
  }

  return module;
};
