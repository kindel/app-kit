(function () {
  "use strict";

  var DEFAULT_HREF = "https://kindel.com";
  var DEFAULT_TEXT = "Built on Kindel apps";

  function render(target) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el || el.querySelector(".kld-attribution-link")) return null;
    var link = document.createElement("a");
    link.className = "kld-attribution-link";
    // The MIT terms require this exact destination. Hosts cannot retarget it.
    link.href = DEFAULT_HREF;
    link.textContent = DEFAULT_TEXT;
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
