const { describe, it } = require('mocha');
const { expect } = require('chai');
const EventManager = require('../lib/event-manager');

describe("event manager", () => {

  const emptyHandler = function () { };

  it("register non-function event handler", () => {
    const em = new EventManager();

    expect(() => {
      em.on("test", "exception");
    }).to.throw();
  });

  it("unregister non-function event handler", () => {
    const em = new EventManager();

    expect(() => {
      em.off("test", "exception");
    }).to.throw();
  });

  it("register & unregister event handler", () => {
    const em = new EventManager();

    expect(() => {
      em.on("test", emptyHandler);
    }).to.not.throw();

    expect(() => {
      em.off("test", emptyHandler);
    }).to.not.throw();
  });

  it("unregister not registered event handler", () => {
    const em = new EventManager();

    expect(() => {
      em.off("test", emptyHandler);
    }).to.throw();
  });

  it("trigger single event", () => {
    const em = new EventManager();

    const event = { hello: "test", world: { property: "deep" } };

    em.on("test", function (e) {
      expect(e).to.deep.equal(event);
    });

    em.trigger("test", event);
  });

  it("allowedEvents option", () => {
    const em = new EventManager({ allowedEvents: ["allowed", "also-allowed"] });

    expect(() => {
      em.on("allowed", emptyHandler);
    }).not.to.throw();

    expect(() => {
      em.on("not-allowed", emptyHandler);
    }).to.throw();

    expect(() => {
      em.on("also-allowed", emptyHandler);
    }).not.to.throw();
  });

  it("filter event option", done => {
    const em = new EventManager();

    const event = { hello: "test", world: { property: "deep" } };

    em.on("test", e1 => {
      expect(e1).to.deep.equal({ hello: "test", filtered: true });
      done();
    }, {
        filter: e2 => {
          const filtered = Object.assign({}, e2);
          delete filtered.world;
          return filtered;
        }
      });

    em.trigger("test", event, {
      onFiltered: e => {
        expect(e).to.deep.equal({ hello: "test" });
        const afterFiltered = Object.assign({}, e);
        afterFiltered.filtered = true;
        return afterFiltered;
      }
    });
  });
});