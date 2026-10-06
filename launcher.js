(function () {
  "use strict";

  var DESKTOP = "(min-width: 860px)";

  function init() {
    var root = document.querySelector("[data-apps-catalog]");
    if (!root) return;
    var chips = root.querySelectorAll("[data-theme-chip]");
    var tiles = root.querySelectorAll("[data-app-card]");
    var pane = root.querySelector("[data-launcher-pane]");
    var paneBody = root.querySelector("[data-launcher-pane-body]");
    var empty = root.querySelector("[data-launcher-empty]");
    var sheet = root.querySelector("[data-launcher-sheet]");
    var sheetBody = root.querySelector("[data-launcher-sheet-body]");
    var desktopQuery = window.matchMedia(DESKTOP);
    var hovered = "";
    var pinned = "";
    var shownId = "";
    var opener = null;
    var hideTimer = 0;

    function known(theme) {
      if (!theme) return true;
      for (var i = 0; i < chips.length; i++) {
        if (chips[i].getAttribute("data-theme-chip") === theme) return true;
      }
      return false;
    }

    function themeFromUrl() {
      var theme = new URLSearchParams(window.location.search).get("theme") || "";
      return known(theme) ? theme : "";
    }

    function tileById(id) {
      if (!id) return null;
      for (var i = 0; i < tiles.length; i++) {
        if (tiles[i].getAttribute("data-app-id") === id) return tiles[i];
      }
      return null;
    }

    function visibleId(id) {
      var tile = tileById(id);
      if (!tile || tile.hidden) return "";
      return id;
    }

    function fill(node, id) {
      var tpl = root.querySelector('template[data-about-for="' + id + '"]');
      node.replaceChildren();
      if (tpl) node.appendChild(tpl.content.cloneNode(true));
    }

    function syncTiles(id) {
      for (var i = 0; i < tiles.length; i++) {
        var on = tiles[i].getAttribute("data-app-id") === id;
        tiles[i].classList.toggle("is-current", !!on);
      }
    }

    function syncExpanded(id, open) {
      var buttons = root.querySelectorAll("[data-about]");
      for (var i = 0; i < buttons.length; i++) {
        var on = open && buttons[i].getAttribute("data-about") === id;
        buttons[i].setAttribute("aria-expanded", on ? "true" : "false");
      }
    }

    function render() {
      var id = "";
      if (desktopQuery.matches) id = visibleId(hovered) || visibleId(pinned);
      if (!hovered || !visibleId(hovered)) hovered = "";
      if (!visibleId(pinned)) pinned = "";
      syncTiles(id);
      if (!pane || !paneBody || !empty) return;
      if (!desktopQuery.matches) {
        syncExpanded("", false);
        return;
      }
      syncExpanded(id, !!id);
      if (id === shownId) return;
      shownId = id;
      if (!id) {
        paneBody.hidden = true;
        paneBody.replaceChildren();
        empty.hidden = false;
        return;
      }
      fill(paneBody, id);
      empty.hidden = true;
      paneBody.hidden = false;
    }

    function apply(theme, push) {
      tiles.forEach(function (card) {
        var themes = (card.getAttribute("data-themes") || "").split(/\s+/).filter(Boolean);
        var show = !theme || themes.indexOf(theme) !== -1;
        card.hidden = !show;
      });
      chips.forEach(function (chip) {
        var id = chip.getAttribute("data-theme-chip") || "";
        var on = id === theme;
        chip.classList.toggle("is-active", on);
        if (on) chip.setAttribute("aria-current", "true");
        else chip.removeAttribute("aria-current");
      });
      if (push) {
        var url = new URL(window.location.href);
        if (theme) url.searchParams.set("theme", theme);
        else url.searchParams.delete("theme");
        history.pushState({ theme: theme }, "", url);
      }
      render();
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function (event) {
        // Modified clicks (new tab, new window) follow the chip href.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        apply(chip.getAttribute("data-theme-chip") || "", true);
      });
    });

    window.addEventListener("popstate", function () {
      apply(themeFromUrl(), false);
    });

    function armHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        hovered = "";
        render();
      }, 400);
    }

    tiles.forEach(function (tile) {
      tile.addEventListener("mouseenter", function () {
        if (!desktopQuery.matches || tile.hidden) return;
        clearTimeout(hideTimer);
        hovered = tile.getAttribute("data-app-id") || "";
        render();
      });
      tile.addEventListener("mouseleave", function () {
        if (!desktopQuery.matches) return;
        armHide();
      });
      tile.addEventListener("focusin", function () {
        if (!desktopQuery.matches) return;
        clearTimeout(hideTimer);
        pinned = tile.getAttribute("data-app-id") || "";
        hovered = pinned;
        render();
      });
    });

    if (pane) {
      pane.addEventListener("mouseenter", function () {
        clearTimeout(hideTimer);
      });
      pane.addEventListener("mouseleave", function () {
        if (!desktopQuery.matches) return;
        armHide();
      });
    }

    root.querySelectorAll("[data-about]").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var id = btn.getAttribute("data-about") || "";
        opener = btn;
        if (desktopQuery.matches) {
          clearTimeout(hideTimer);
          pinned = id;
          hovered = id;
          render();
          if (paneBody) paneBody.focus();
          return;
        }
        if (!sheet || !sheetBody) return;
        fill(sheetBody, id);
        syncExpanded(id, true);
        if (typeof sheet.showModal === "function") {
          if (!sheet.open) sheet.showModal();
        } else {
          sheet.hidden = false;
        }
      });
    });

    if (sheet) {
      var closeBtn = sheet.querySelector("[data-launcher-close]");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          if (typeof sheet.close === "function") sheet.close();
          else sheet.hidden = true;
        });
      }
      sheet.addEventListener("click", function (event) {
        if (event.target === sheet && typeof sheet.close === "function") sheet.close();
      });
      sheet.addEventListener("close", function () {
        syncExpanded("", false);
        if (opener) opener.focus();
      });
    }

    root.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !desktopQuery.matches) return;
      if (sheet && sheet.open) return;
      pinned = "";
      hovered = "";
      render();
    });

    root.addEventListener("focusout", function () {
      setTimeout(function () {
        if (!root.contains(document.activeElement)) {
          pinned = "";
          render();
        }
      }, 0);
    });

    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", function () {
        if (desktopQuery.matches && sheet && sheet.open && typeof sheet.close === "function") {
          sheet.close();
        }
        shownId = "";
        render();
      });
    }

    apply(themeFromUrl(), false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
