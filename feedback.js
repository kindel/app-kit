(function () {
  "use strict";

  // Hosts set window.KindelFeedback = { endpoint: "..." } before this file,
  // or data-endpoint on each .app-feedback-form-inner. The default is the
  // kindel.com path, a same-origin POST to /api/app-feedback.
  function endpointFor(form) {
    var attr = form.getAttribute("data-endpoint");
    if (attr) return attr;
    var cfg = window.KindelFeedback;
    if (cfg && typeof cfg.endpoint === "string" && cfg.endpoint) return cfg.endpoint;
    return "/api/app-feedback";
  }

  function initFeedback() {
    var toggles = document.querySelectorAll(".app-feedback-toggle");
    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var section = btn.closest(".app-feedback-section");
        var form = section ? section.querySelector(".app-feedback-form") : null;
        if (form) {
          form.hidden = !form.hidden;
          if (!form.hidden) {
            var textarea = form.querySelector(".app-feedback-message");
            if (textarea) textarea.focus();
          }
        }
      });
    });

    var cancels = document.querySelectorAll(".app-feedback-cancel");
    cancels.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var form = btn.closest(".app-feedback-form");
        if (form) {
          form.hidden = true;
          var inner = form.querySelector(".app-feedback-form-inner");
          if (inner) inner.reset();
          var status = form.querySelector(".app-feedback-status");
          if (status) status.hidden = true;
        }
      });
    });

    var forms = document.querySelectorAll(".app-feedback-form-inner");
    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        var app = form.getAttribute("data-app");
        var message = form.querySelector(".app-feedback-message").value.trim();
        var emailInput = form.querySelector(".app-feedback-email");
        var email = emailInput ? emailInput.value.trim() : "";
        var honeypotInput = form.querySelector(".app-feedback-honeypot");
        var website = honeypotInput ? honeypotInput.value.trim() : "";
        var statusEl = form.querySelector(".app-feedback-status");
        var submitBtn = form.querySelector(".app-feedback-submit");

        if (!message) {
          if (statusEl) {
            statusEl.textContent = "Please enter your feedback.";
            statusEl.hidden = false;
            statusEl.className = "app-feedback-status app-feedback-error";
          }
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) {
          statusEl.textContent = "Sending...";
          statusEl.hidden = false;
          statusEl.className = "app-feedback-status";
        }

        var payload = {
          app: app,
          message: message,
          email: email,
          website: website,
          page: window.location.href
        };

        fetch(endpointFor(form), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (resp) {
            return resp.text().then(function (text) {
              var data = {};
              if (text) {
                try { data = JSON.parse(text); } catch (e) { data = {}; }
              }
              if (!resp.ok) {
                throw new Error((data && data.error) || "Could not send feedback.");
              }
              return data;
            });
          })
          .then(function () {
            if (statusEl) {
              statusEl.textContent = "Got it. Thank you.";
              statusEl.className = "app-feedback-status app-feedback-success";
              statusEl.hidden = false;
            }
            form.reset();
            setTimeout(function () {
              var wrapper = form.closest(".app-feedback-form");
              if (wrapper) wrapper.hidden = true;
              if (statusEl) statusEl.hidden = true;
            }, 2000);
          })
          .catch(function (err) {
            if (statusEl) {
              statusEl.textContent = err.message || "Something went wrong.";
              statusEl.className = "app-feedback-status app-feedback-error";
              statusEl.hidden = false;
            }
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFeedback);
  } else {
    initFeedback();
  }
})();
