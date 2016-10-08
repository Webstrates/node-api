module.exports = (function () {

  // Object returned by this constructor function.
  const module = {};

  /**
   * Checks if an object is undefined and returns true, otherwise false.
   * 
   * @param {any} obj Object to be tested for undefined.
   * @returns {boolean} It returns true if an object is undefined, otherwise false.
   */
  module.isUndefined = obj => {
    return typeof obj === "undefined";
  };

  /**
   * Checks if an object is a function and returns true, otherwise false.
   * 
   * @param {any} obj Object to be tested for a function.
   * @returns {boolean} Returns true if an object is a function, otherwise false.
   */
  module.isFunction = obj => {
    return !module.isUndefined(obj) && typeof obj === "function";
  };

  /**
   * Checks if an object is an actual object and returns true, otherwise false. 
   * 
   * @param {any} obj Object to be tested for an object.
   * @returns {boolean} It returns true if an object is an actual object, otherwise false.
   */
  module.isObject = obj => {
    return typeof prop == "object" && obj !== null
  }

  /**
   * Checks if an object is an array and returns true, otherwise false. 
   * 
   * @param {any} obj Object to be tested for an array.
   * @returns {boolean} It returns true if an object is an array, otherwise false.
   */
  module.isArray = obj => {
    return !module.isUndefined(obj) && obj.constructor === Array;
  };

  /**
   * Deep freezes an object.
   * 
   * @param {any} obj Object to be deeply frozen.
   * @returns {any} Deeply frozen object.
   * @see https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
   */
  module.deepFreeze = obj => {

    // Retrieve the property names defined on object
    var propNames = Object.getOwnPropertyNames(obj);

    // Freeze properties before freezing self
    propNames.forEach(name => {
      var prop = obj[name];

      // Freeze prop if it is an object
      if (module.isObject(obj)) {
        module.deepFreeze(prop);
      }
    });

    // Freeze self (no-op if already frozen)
    return Object.freeze(obj);
  };

  return module;
})();
