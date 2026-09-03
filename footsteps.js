// footsteps.js
// Shared by every page. Populates the `.footstep-trail` container with
// footprints that "ink in" one at a time and walk across the *whole*
// viewport — top, bottom, corners, any direction — the way footprints
// appear on the Marauder's Map. At most MAX_TRAILS walk at once.
//
// No localStorage, no dependency on any prior page state — it just runs
// fresh every time this script executes. Runs on initial load AND on
// `pageshow` (covers browsers restoring the page from bfcache on
// back/forward, where a plain load listener would never fire again).

(function () {
  var MAX_TRAILS = 3;
  var STEP_GAP = 46;        // px between footprints along the walking direction
  var STEP_OFFSET = 9;      // px sideways offset, alternating left/right foot
  var STEP_STAGGER = 0.45;  // seconds between each footprint appearing
  var FADE_IN = 0.25;       // quick "ink stamp" appearance
  var HOLD = 1.4;
  var FADE_OUT = 1.6;       // slow fade, like ink sinking into parchment
  var STEP_LIFE = FADE_IN + HOLD + FADE_OUT;
  var MAX_STEPS_PER_TRAIL = 14;

  var FOOT_PATH = '<svg viewBox="0 0 24 24"><path d="M12 2.3c-2.3 0-4.1 2.7-4.1 6.5 0 2.1.7 3.7 1.6 4.9-1 1.7-1.6 3.9-1.6 5.6 0 1.7 1.9 2.9 4.1 2.9s4.1-1.2 4.1-2.9c0-1.7-.6-3.9-1.6-5.6.9-1.2 1.6-2.8 1.6-4.9 0-3.8-1.8-6.5-4.1-6.5Z"/></svg>';

  // The `step-fade` keyframes (opacity + a var(--step-transform)-based pop)
  // live in each page's own <style> block, not here — that way the trail
  // still has correct CSS even in the split second before this script runs.

  var activeTimers = [];
  var running = false;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clearTimers() {
    activeTimers.forEach(function (id) { clearTimeout(id); });
    activeTimers = [];
  }

  function schedule(fn, ms) {
    var id = setTimeout(fn, ms);
    activeTimers.push(id);
    return id;
  }

  function spawnTrail(container) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var angle = rand(0, Math.PI * 2);
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    var perpAngle = angle + Math.PI / 2;
    var px = Math.cos(perpAngle);
    var py = Math.sin(perpAngle);

    var startX = rand(vw * 0.12, vw * 0.88);
    var startY = rand(vh * 0.12, vh * 0.88);
    var rotationDeg = (angle * 180 / Math.PI) + 90;

    var els = [];
    var margin = 24;

    for (var i = 0; i < MAX_STEPS_PER_TRAIL; i++) {
      var t = i * STEP_GAP;
      var x = startX + dx * t;
      var y = startY + dy * t;
      if (x < -margin || x > vw + margin || y < -margin || y > vh + margin) break;

      var side = (i % 2 === 0) ? 1 : -1;
      x += px * STEP_OFFSET * side;
      y += py * STEP_OFFSET * side;

      var el = document.createElement('span');
      el.className = 'step';
      el.innerHTML = FOOT_PATH;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      var transformValue = 'translate(-50%, -50%) rotate(' + (rotationDeg + (side === 1 ? -6 : 6)) + 'deg) scaleX(' + side + ')';
      el.style.setProperty('--step-transform', transformValue);
      el.style.transform = transformValue;
      el.style.animation = 'step-fade ' + STEP_LIFE + 's ease-in-out ' + (i * STEP_STAGGER) + 's 1 both';
      container.appendChild(el);
      els.push(el);
    }

    if (els.length === 0) {
      schedule(function () { spawnTrail(container); }, rand(300, 800));
      return;
    }

    var totalDuration = ((els.length - 1) * STEP_STAGGER) + STEP_LIFE;
    schedule(function () {
      els.forEach(function (el) { el.remove(); });
      schedule(function () { spawnTrail(container); }, rand(300, 1600));
    }, totalDuration * 1000);
  }

  function start() {
    var container = document.querySelector('.footstep-trail');
    if (!container) return;

    // Reset: clear anything left over from a previous run (e.g. bfcache restore).
    clearTimers();
    container.innerHTML = '';
    running = true;

    for (var n = 0; n < MAX_TRAILS; n++) {
      schedule(function () { spawnTrail(container); }, n * rand(150, 500));
    }
  }

  try {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      start();
    } else {
      document.addEventListener('DOMContentLoaded', start);
    }
    window.addEventListener('pageshow', function (e) {
      // Fires on every normal load too, but start() is idempotent (it clears
      // and restarts), and this guarantees bfcache-restored pages (back/
      // forward navigation) get a fresh, running trail instead of a frozen one.
      if (e.persisted || !running) start();
    });
  } catch (err) {
    // Never let a footstep bug break the rest of the page.
    if (window.console && console.error) console.error('footsteps.js error:', err);
  }
})();
