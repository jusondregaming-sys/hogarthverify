// page-fade.js
// Shared by every page. Elements marked with `data-fade` start hidden
// (via CSS) and get an `.is-visible` class added here, which triggers a
// CSS transition. This is more reliable than a plain CSS `animation`
// that autoplays on parse: it re-runs itself on `pageshow` too, which
// covers the case where a browser restores the page from bfcache
// (e.g. some back/forward navigation) instead of doing a fresh parse —
// a plain autoplaying animation just stays in its last state there.

(function () {
  function reveal() {
    var els = document.querySelectorAll('[data-fade]');
    els.forEach(function (el) {
      el.classList.remove('is-visible');
    });
    // Force a reflow so the removal above is committed before we add the
    // class back — otherwise the browser can coalesce both changes and
    // skip the transition entirely.
    void document.body.offsetHeight;
    els.forEach(function (el) {
      var delay = parseFloat(el.getAttribute('data-fade-delay') || '0');
      setTimeout(function () {
        el.classList.add('is-visible');
      }, delay * 1000);
    });
  }

  function run() {
    // Double rAF: guarantees the browser has painted the hidden state at
    // least once before we flip it, so the transition always plays.
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) run();
  });
})();
