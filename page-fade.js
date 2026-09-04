// page-fade.js
// Shared by every page. Two things happen here on every load:
//
// 1. The `.page-veil` — a solid black div covering the whole screen — is
//    faded out (`veil-hidden` class), revealing the page underneath.
// 2. Elements marked with `data-fade` start hidden (via effects.css) and
//    get an `.is-visible` class added, which triggers their own fade/
//    slide-in transition — at the same time the veil is fading out, so
//    the whole thing reads as "black screen dissolves into the page".
//
// This re-runs itself on `pageshow` too, which covers the case where a
// browser restores the page from bfcache (e.g. some back/forward
// navigation) instead of doing a fresh parse — a plain autoplaying CSS
// animation just stays in its last state there.

(function () {
  function reveal() {
    var veil = document.querySelector('.page-veil');
    var els = document.querySelectorAll('[data-fade]');

    if (veil) veil.classList.remove('veil-hidden');
    els.forEach(function (el) {
      el.classList.remove('is-visible');
    });

    // Force a reflow so the removals above are committed before we add
    // the classes back — otherwise the browser can coalesce both changes
    // and skip the transition entirely.
    void document.body.offsetHeight;

    // Hold on solid black for a beat, then dissolve it away.
    if (veil) {
      setTimeout(function () {
        veil.classList.add('veil-hidden');
      }, 120);
    }

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

  // Safety net: guarantees this always fires at least once per load, even
  // if something upstream delayed DOMContentLoaded from being caught (e.g.
  // this script tag itself was injected/loaded unusually late). `run()` is
  // safe to call more than once — reveal() just re-applies the same
  // hidden -> visible transition — so this can't cause a double-fade, it
  // can only cover a case where nothing else fired yet.
  window.addEventListener('load', function () {
    var stillHidden = document.querySelector('[data-fade]:not(.is-visible)');
    var veilStillUp = document.querySelector('.page-veil:not(.veil-hidden)');
    if (stillHidden || veilStillUp) run();
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) run();
  });
})();
