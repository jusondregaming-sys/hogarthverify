// footsteps.js
// Shared by every page. Populates the empty `.footstep-trail` container
// with footprints that walk across the *whole* viewport in a random
// direction, fading in one at a time like an actual trail being left
// behind, then fading out again. At most MAX_TRAILS walk at once.
//
// Deliberately has no dependency on localStorage or any other storage —
// it just runs fresh on every page load.

(function () {
  var container = document.querySelector('.footstep-trail');
  if (!container) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var MAX_TRAILS = 3;
  var STEP_GAP = 46;       // px between footprints along the walking direction
  var STEP_OFFSET = 9;     // px sideways offset, alternating left/right foot
  var STEP_STAGGER = 0.5;  // seconds between each footprint appearing
  var FADE_IN = 0.9;
  var HOLD = 1.5;
  var FADE_OUT = 1.1;
  var STEP_LIFE = FADE_IN + HOLD + FADE_OUT;

  var FOOT_PATH = '<svg viewBox="0 0 24 24"><path d="M12 2.3c-2.3 0-4.1 2.7-4.1 6.5 0 2.1.7 3.7 1.6 4.9-1 1.7-1.6 3.9-1.6 5.6 0 1.7 1.9 2.9 4.1 2.9s4.1-1.2 4.1-2.9c0-1.7-.6-3.9-1.6-5.6.9-1.2 1.6-2.8 1.6-4.9 0-3.8-1.8-6.5-4.1-6.5Z"/></svg>';

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function spawnTrail() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // Walk in a random compass direction, starting somewhere well inside
    // the viewport so the trail can head any which way — top, bottom,
    // corner to corner — instead of always hugging the bottom edge.
    var angle = rand(0, Math.PI * 2);
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    var perpAngle = angle + Math.PI / 2;
    var px = Math.cos(perpAngle);
    var py = Math.sin(perpAngle);

    var startX = rand(vw * 0.15, vw * 0.85);
    var startY = rand(vh * 0.15, vh * 0.85);
    var rotationDeg = (angle * 180 / Math.PI) + 90;

    var els = [];
    var margin = 24;
    var i = 0;

    while (els.length < 14) {
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
      el.style.transform = 'translate(-50%, -50%) rotate(' + (rotationDeg + (side === 1 ? -6 : 6)) + 'deg) scaleX(' + side + ')';
      el.style.animation = 'step-fade ' + STEP_LIFE + 's ease-in-out ' + (i * STEP_STAGGER) + 's 1';
      container.appendChild(el);
      els.push(el);
      i++;
    }

    // Nothing fit on screen (tiny viewport, unlucky angle) — try again shortly.
    if (els.length === 0) {
      setTimeout(spawnTrail, rand(300, 800));
      return;
    }

    var totalDuration = ((els.length - 1) * STEP_STAGGER) + STEP_LIFE;
    setTimeout(function () {
      els.forEach(function (el) { el.remove(); });
      setTimeout(spawnTrail, rand(400, 2200));
    }, totalDuration * 1000);
  }

  for (var n = 0; n < MAX_TRAILS; n++) {
    setTimeout(spawnTrail, n * rand(500, 1300));
  }
})();
