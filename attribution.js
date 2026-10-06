(function () {
  "use strict";

  var DEFAULT_HREF = "https://kindel.com";
  var DEFAULT_TEXT = "Built on Kindel apps";

  function render(target, opts) {
    opts = opts || {};
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el || el.querySelector(".kld-attribution-link")) return null;
    var link = document.createElement("a");
    link.className = "kld-attribution-link";
    link.href = opts.href || el.getAttribute("data-href") || DEFAULT_HREF;
    link.textContent = opts.text || el.getAttribute("data-text") || DEFAULT_TEXT;
    el.classList.add("kld-attribution");
    el.appendChild(link);
    return link;
  }

  function boot() {
    var nodes = document.querySelectorAll("[data-kld-attribution]");
    nodes.forEach(function (el) {
      render(el);
    });
  }

  window.KindelAttribution = { render: render };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
