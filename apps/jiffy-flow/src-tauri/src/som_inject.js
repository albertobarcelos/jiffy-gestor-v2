(function () {
  if (window.__JIFFY_SOM_NATIVO__) return;
  window.__JIFFY_SOM_NATIVO__ = true;
  var orig = HTMLAudioElement.prototype.play;
  HTMLAudioElement.prototype.play = function () {
    try {
      var src = String(this.src || this.currentSrc || "");
      if (src.indexOf("pedido-novo") !== -1 && !this.muted) {
        var tauri = window.__TAURI__;
        var internals = window.__TAURI_INTERNALS__;
        var invoke =
          tauri && tauri.core && typeof tauri.core.invoke === "function"
            ? tauri.core.invoke.bind(tauri.core)
            : internals && typeof internals.invoke === "function"
              ? internals.invoke.bind(internals)
              : null;
        if (invoke) {
          invoke("tocar_som_pedido_novo");
          return Promise.resolve();
        }
      }
    } catch (e) {}
    return orig.apply(this, arguments);
  };
})();
