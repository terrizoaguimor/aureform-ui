import test from "node:test";
import assert from "node:assert/strict";
import {
  GoogleMapsLoadError,
  googleMapsCamera,
  googleMapsError,
  isGoogleMapPosition,
  loadGoogleMaps,
  subscribeGoogleMapsErrors,
} from "../src/lib/google-maps.ts";

/** An inert DOM: appending a script never performs a network request. */
async function inBrowser(
  run,
  { foreignScript = false, existingSDK = false } = {},
) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const scripts = [];
  const appended = [];
  const imports = [];
  const host = {};
  class Script extends EventTarget {
    src = "";
    nonce = "";
    id = "";
    async = false;
    remove() {
      const index = scripts.indexOf(this);
      if (index >= 0) scripts.splice(index, 1);
    }
  }
  const libraries = {
    maps: {
      Map: class {},
      Polyline: class {},
      TrafficLayer: class {},
    },
    marker: { AdvancedMarkerElement: class {} },
    core: { event: { clearInstanceListeners() {} } },
  };
  let libraryFailure = false;
  const importLibrary = async (name) => {
    imports.push(name);
    if (libraryFailure && name === "maps") {
      throw new Error(
        "A provider error containing synthetic-key-a must stay private.",
      );
    }
    return libraries[name];
  };
  if (existingSDK) host.google = { maps: { importLibrary } };
  if (foreignScript) {
    const script = new Script();
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=host-owned-placeholder";
    scripts.push(script);
  }
  const document = {
    baseURI: "https://example.test/aureform-ui/en/maps/",
    createElement(tag) {
      assert.equal(tag, "script");
      return new Script();
    },
    querySelectorAll(selector) {
      assert.equal(selector, "script[src]");
      return scripts;
    },
    querySelector(selector) {
      assert.equal(selector, "script[nonce]");
      return { nonce: "host-csp-nonce" };
    },
    head: {
      appendChild(script) {
        scripts.push(script);
        appended.push(script);
        return script;
      },
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: host,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: document,
  });
  function complete() {
    host.google = { maps: { importLibrary } };
    assert.equal(typeof host.__aureformGoogleMapsReadyV1, "function");
    host.__aureformGoogleMapsReadyV1();
  }
  try {
    await run({
      host,
      scripts,
      appended,
      imports,
      complete,
      setLibraryFailure: (failure) => {
        libraryFailure = failure;
      },
    });
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
    if (previousDocument)
      Object.defineProperty(globalThis, "document", previousDocument);
    else delete globalThis.document;
  }
}

test("imports and camera helpers are server-safe; SDK loading requires a browser", async () => {
  assert.equal(typeof globalThis.window, "undefined");
  assert.deepEqual(googleMapsCamera([], { width: 720, height: 460 }), {
    center: { lat: 27, lng: -32 },
    zoom: 2,
  });
  await assert.rejects(() => loadGoogleMaps({ apiKey: "synthetic-key-a" }), {
    code: "browser-required",
  });
});

test("no SDK request is created without a valid, explicitly supplied browser key", async () => {
  await inBrowser(async ({ appended }) => {
    for (const apiKey of [
      "",
      " ",
      "key&callback=another",
      "key\nvalue",
      "a".repeat(257),
    ]) {
      await assert.rejects(
        () => loadGoogleMaps({ apiKey }),
        (error) => {
          assert.ok(["missing-key", "invalid-config"].includes(error.code));
          assert.equal(error.message.includes(apiKey.trim()), !apiKey.trim());
          return true;
        },
      );
    }
    assert.equal(appended.length, 0);
  });
});

test("concurrent maps share one script and one library initialization", async () => {
  await inBrowser(async ({ appended, imports, complete }) => {
    const first = loadGoogleMaps({
      apiKey: "synthetic-key-a",
      language: "es",
      region: "co",
    });
    const second = loadGoogleMaps({
      apiKey: " synthetic-key-a ",
      language: "en",
    });
    assert.equal(appended.length, 1);
    const url = new URL(appended[0].src);
    assert.equal(url.origin, "https://maps.googleapis.com");
    assert.equal(url.pathname, "/maps/api/js");
    assert.equal(url.searchParams.get("loading"), "async");
    assert.equal(url.searchParams.get("language"), "es");
    assert.equal(url.searchParams.get("region"), "CO");
    assert.equal(url.searchParams.get("v"), "weekly");
    assert.equal(appended[0].nonce, "host-csp-nonce");
    complete();
    const [a, b] = await Promise.all([first, second]);
    assert.equal(a, b);
    assert.deepEqual(imports, ["maps", "marker", "core"]);
    assert.equal(typeof a.marker.AdvancedMarkerElement, "function");
    assert.equal(Object.hasOwn(a.maps, "Marker"), false);
    await loadGoogleMaps({ apiKey: "synthetic-key-a" });
    assert.equal(appended.length, 1);
    assert.equal(imports.length, 3);
  });
});

test("different keys are rejected both during loading and after SDK initialization", async () => {
  await inBrowser(async ({ appended, complete }) => {
    const first = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    await assert.rejects(
      () => loadGoogleMaps({ apiKey: "synthetic-key-b" }),
      (error) => {
        assert.equal(error.code, "key-conflict");
        assert.equal(error.retryable, false);
        assert.equal(error.message.includes("synthetic-key"), false);
        return true;
      },
    );
    complete();
    await first;
    await assert.rejects(() => loadGoogleMaps({ apiKey: "synthetic-key-b" }), {
      code: "key-conflict",
    });
    assert.equal(appended.length, 1);
  });
});

test("foreign SDK tags and host-owned importLibrary functions prevent a second loader", async () => {
  for (const options of [{ foreignScript: true }, { existingSDK: true }]) {
    await inBrowser(async ({ appended }) => {
      await assert.rejects(
        () => loadGoogleMaps({ apiKey: "synthetic-key-a" }),
        { code: "existing-sdk", retryable: false },
      );
      assert.equal(appended.length, 0);
    }, options);
  }
});

test("a failed network transfer can retry once with the same key", async () => {
  await inBrowser(async ({ appended, scripts, complete }) => {
    const failed = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    appended[0].dispatchEvent(new Event("error"));
    await assert.rejects(failed, { code: "network", retryable: true });
    assert.equal(scripts.length, 0);
    const retried = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    assert.equal(appended.length, 2);
    assert.equal(scripts.length, 1);
    complete();
    await retried;
  });
});

test("library failures are sanitized and retry imports without reinjecting the SDK", async () => {
  await inBrowser(async ({ appended, complete, setLibraryFailure }) => {
    setLibraryFailure(true);
    const failed = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    complete();
    await assert.rejects(failed, (error) => {
      assert.equal(error.code, "library");
      assert.equal(error.retryable, true);
      assert.equal(error.message.includes("synthetic-key-a"), false);
      assert.equal(error.message.includes("provider error"), false);
      return true;
    });
    setLibraryFailure(false);
    await loadGoogleMaps({ apiKey: "synthetic-key-a" });
    assert.equal(appended.length, 1);
  });
});

test("a timeout locks further injection until reload, including concurrent consumers", async () => {
  await inBrowser(async ({ appended }) => {
    const first = loadGoogleMaps({ apiKey: "synthetic-key-a", timeoutMs: 5 });
    const second = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    const failures = await Promise.allSettled([first, second]);
    for (const failure of failures) {
      assert.equal(failure.status, "rejected");
      assert.equal(failure.reason.code, "timeout");
      assert.equal(failure.reason.retryable, false);
    }
    await assert.rejects(() => loadGoogleMaps({ apiKey: "synthetic-key-a" }), {
      code: "timeout",
    });
    assert.equal(appended.length, 1);
  });
});

test("an executed script missing importLibrary is not injected again", async () => {
  await inBrowser(async ({ host, appended }) => {
    const first = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    host.__aureformGoogleMapsReadyV1();
    await assert.rejects(first, { code: "invalid-config", retryable: false });
    await assert.rejects(() => loadGoogleMaps({ apiKey: "synthetic-key-a" }), {
      code: "invalid-config",
    });
    assert.equal(appended.length, 1);
  });
});

test("late authentication failures notify maps, preserve the host hook and do not reload the SDK", async () => {
  await inBrowser(async ({ host, appended, complete }) => {
    let hostCalls = 0;
    host.gm_authFailure = () => {
      hostCalls++;
    };
    const first = [];
    const second = [];
    const unsubscribe = subscribeGoogleMapsErrors((error) =>
      first.push(error.code),
    );
    subscribeGoogleMapsErrors((error) => {
      second.push(error.code);
      throw new Error("Consumer callback");
    });
    const loaded = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    complete();
    await loaded;
    host.gm_authFailure();
    assert.deepEqual(first, ["authentication"]);
    assert.deepEqual(second, ["authentication"]);
    assert.equal(hostCalls, 1);
    unsubscribe();
    host.gm_authFailure();
    assert.deepEqual(first, ["authentication"]);
    assert.deepEqual(second, ["authentication", "authentication"]);
    assert.equal(hostCalls, 2);
    await assert.rejects(() => loadGoogleMaps({ apiKey: "synthetic-key-a" }), {
      code: "authentication",
      retryable: false,
    });
    assert.equal(appended.length, 1);
  });
});

test("authentication failure during bootstrap rejects all pending consumers", async () => {
  await inBrowser(async ({ host, appended }) => {
    const first = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    const second = loadGoogleMaps({ apiKey: "synthetic-key-a" });
    host.gm_authFailure();
    const results = await Promise.allSettled([first, second]);
    assert.ok(
      results.every(
        (result) =>
          result.status === "rejected" &&
          result.reason.code === "authentication",
      ),
    );
    assert.equal(appended.length, 1);
  });
});

test("CSP nonce and region are explicit configuration rather than URL interpolation", async () => {
  await inBrowser(async ({ appended, complete }) => {
    const first = loadGoogleMaps({
      apiKey: "synthetic-key-a",
      nonce: "explicit-nonce",
      region: "US",
    });
    assert.equal(appended[0].nonce, "explicit-nonce");
    assert.equal(new URL(appended[0].src).searchParams.get("region"), "US");
    complete();
    await first;
  });
});

test("camera fitting supports a single point, small screens and immediate antimeridian views", () => {
  const point = { lat: 4.711, lng: -74.0721 };
  const one = googleMapsCamera([point], { width: 720, height: 460 });
  assert.equal(one.zoom, 10);
  assert.ok(Math.abs(one.center.lat - point.lat) < 1e-8);
  assert.ok(Math.abs(one.center.lng - point.lng) < 1e-8);
  const dateLine = googleMapsCamera(
    [
      { lat: 10, lng: 179 },
      { lat: 10, lng: -179 },
    ],
    { width: 720, height: 460 },
  );
  assert.equal(Math.abs(dateLine.center.lng), 180);
  assert.ok(dateLine.zoom >= 7);
  const route = [
    { lat: 40, lng: -74 },
    { lat: 42, lng: -71 },
  ];
  const desktop = googleMapsCamera(route, { width: 900, height: 460 });
  const mobile = googleMapsCamera(route, { width: 280, height: 460 });
  assert.ok(mobile.zoom < desktop.zoom);
  assert.ok(
    Number.isFinite(googleMapsCamera(route, { width: 0, height: 0 }).zoom),
  );
});

test("invalid coordinates and raw errors never expose the input data in failures", () => {
  for (const point of [
    { lat: NaN, lng: 1 },
    { lat: 91, lng: 1 },
    { lat: 1, lng: -181 },
  ]) {
    assert.equal(isGoogleMapPosition(point), false);
    assert.throws(
      () => googleMapsCamera([point], { width: 720, height: 460 }),
      {
        code: "invalid-data",
      },
    );
  }
  for (const error of [
    new Error("synthetic-key-a"),
    { code: "network", message: "synthetic-key-a" },
  ]) {
    const safe = googleMapsError(error);
    assert.ok(safe instanceof GoogleMapsLoadError);
    assert.equal(safe.message.includes("synthetic-key-a"), false);
  }
});
