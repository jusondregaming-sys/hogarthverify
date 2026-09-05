// page-transition.js
// Two jobs, paired with page-transition.css:
//
// 1. Reveal: fades the .page-veil away and, at the same time, starts
//    each [data-fade] block rising/fading in with its own stagger
//    (data-fade-delay, in seconds) — so the whole page reads as
//    gently arriving rather than popping in all at once. Re-runs on
//    `pageshow` too, covering bfcache restores (back/forward), which
//    a plain CSS class just holds in its last state through otherwise.
//
// 2. Nav-link intercept: clicking a same-origin link inside the top
//    nav fades the veil back in first, waits for it to finish, then
//    navigates — so leaving a page reads as "this page fades out"
//    instead of an instant hard cut. Modifier-clicks, middle-click,
//    target="_blank"/download, and off-site links are left alone so
//    "open in new tab" etc. keep working normally.

(function () {
  var VEIL_FADE_MS = 900; // keep in sync with .page-veil's transition-duration

  function reveal() {
    var veil = document.querySelector('.page-veil');
    var faders = document.querySelectorAll('[data-fade]');

    if (veil) veil.classList.remove('veil-hidden');
    faders.forEach(function (el) {
      el.classList.remove('is-visible');
    });

    // Force a reflow so the removals above are committed before we add
    // the classes back — otherwise the browser can coalesce both
    // changes and skip the transition entirely.
    void document.body.offsetHeight;

    if (veil) {
      // Double rAF: guarantees the browser has painted the opaque veil
      // at least once before we fade it away, so the transition always
      // plays.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          veil.classList.add('veil-hidden');
        });
      });
    }

    faders.forEach(function (el) {
      var delay = parseFloat(el.getAttribute('data-fade-delay') || '0');
      setTimeout(function () {
        el.classList.add('is-visible');
      }, delay * 1000);
    });
  }

  function run() {
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal);
    });
  }

  function isInterceptable(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;

    var url;
    try {
      url = new URL(a.href, window.location.href);
    } catch (e) {
      return false;
    }

    if (url.origin !== window.location.origin) return false;
    // Same-page anchor links (e.g. "#section") shouldn't trigger a
    // full-page fade transition.
    if (url.pathname === window.location.pathname && url.hash) return false;

    return true;
  }

  function wireNavLinks() {
    var veil = document.querySelector('.page-veil');
    if (!veil) return;

    document.querySelectorAll('nav.top a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!isInterceptable(a)) return;

        e.preventDefault();
        var destination = a.href;

        veil.classList.remove('veil-hidden'); // fade the veil back in
        setTimeout(function () {
          window.location.href = destination;
        }, VEIL_FADE_MS);
      });
    });
  }

  function init() {
    run();
    wireNavLinks();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Safety net: guarantees the reveal fires at least once per load,
  // even if something upstream delayed DOMContentLoaded from being
  // caught. `run()` is safe to call more than once.
  window.addEventListener('load', function () {
    var stillHidden = document.querySelector('[data-fade]:not(.is-visible)');
    var veilStillUp = document.querySelector('.page-veil:not(.veil-hidden)');
    if (stillHidden || veilStillUp) run();
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) run();
  });
})();
