/**
 * Mock of the Appian Component SDK (the script normally injected at APPIAN_JS_SDK_URI).
 *
 * Provides just enough of window.Appian for richTextFieldWithTables/v1/index.js to run
 * standalone in a browser, and exposes window.__harness so Playwright tests can:
 *   - override component parameters (?params=<url-encoded json> or __harness.applyParams)
 *   - inspect values saved back to "Appian" (saveValue calls)
 *   - inspect validations
 *   - inspect/control the mocked image-upload connected system (invokeClientApi)
 */
(function () {
  "use strict";

  var DEFAULT_PARAMS = {
    richText: "",
    readOnly: false,
    disabled: false,
    height: "auto",
    placeholder: "",
    tableBorderStyle: "STANDARD",
    insertableItemsLabel: "",
    insertableItems: [],
    maxSize: 100000,
    allowImages: true,
    imageStorageConnectedSystem: "mock-connected-system",
  };

  // Allow per-page overrides via query string: /editor/index.html?params={"readOnly":true}
  var overrides = {};
  try {
    var raw = new URLSearchParams(window.location.search).get("params");
    if (raw) overrides = JSON.parse(raw);
  } catch (e) {
    console.error("appian-mock: failed to parse ?params=", e);
  }

  var onNewValueCallback = null;

  var harness = {
    params: Object.assign({}, DEFAULT_PARAMS, overrides),
    saved: {}, // latest value per key from saveValue
    saveHistory: [], // every saveValue call in order: {key, value}
    validations: [],
    clientApiCalls: [], // every invokeClientApi call: {connectedSystem, apiName, payload}
    uploadDelayMs: 0, // artificial latency for image uploads
    failNextUpload: false, // make the next invokeClientApi return an error payload
    ready: false,

    /** Merge new params and re-fire onNewValue, like a SAIL re-render. */
    applyParams: function (newParams) {
      Object.assign(harness.params, newParams);
      if (onNewValueCallback) onNewValueCallback(Object.assign({}, harness.params));
    },
  };
  window.__harness = harness;

  window.Appian = {
    getLocale: function () {
      return harness.params.locale || "en-US";
    },
    Component: {
      onNewValue: function (callback) {
        onNewValueCallback = callback;
      },
      saveValue: function (key, value) {
        harness.saved[key] = value;
        harness.saveHistory.push({ key: key, value: value });
      },
      setValidations: function (validations) {
        harness.validations = Array.isArray(validations) ? validations : [validations];
      },
      invokeClientApi: function (connectedSystem, apiName, payload) {
        harness.clientApiCalls.push({
          connectedSystem: connectedSystem,
          apiName: apiName,
          payload: payload,
        });
        var callNumber = harness.clientApiCalls.length;
        var shouldFail = harness.failNextUpload;
        harness.failNextUpload = false;
        return new Promise(function (resolve) {
          setTimeout(function () {
            if (shouldFail) {
              resolve({ payload: { error: "Simulated connected system failure" } });
            } else {
              resolve({
                payload: {
                  docID: callNumber,
                  docURL: "https://mock.appian.local/doc/" + callNumber,
                },
              });
            }
          }, harness.uploadDelayMs);
        });
      },
      getAriaLabelledBy: function () {
        return "mock-aria-labelledby";
      },
      getAriaDescribedBy: function () {
        return "mock-aria-describedby";
      },
    },
  };

  // index.js registers its onNewValue handler synchronously when it loads (after this
  // script). Fire the initial parameter set once everything on the page has loaded,
  // mimicking Appian delivering the first SAIL value.
  window.addEventListener("load", function () {
    if (onNewValueCallback) onNewValueCallback(Object.assign({}, harness.params));
    harness.ready = true;
  });
})();
