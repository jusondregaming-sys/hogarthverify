// footsteps.js
// A couple of faint ink footprint trails that wander across the screen,
// Marauder's Masp style: each print stamps in a beat after the last (as
// if someone is walking the path), sits for a moment, then fades away
// again — so the trail always has a "walking away" feel rather than
// just sitting there.
//
// At most MAX_TRAILS walk at once. New trails start at random
// intervals from random edges of the screen, wander in a gently
// curving line, and clean themselves up entirely once they've faded.
//
// Always animates — does not gate on prefers-reduced-motion, so it's
// guaranteed to show up regardless of OS/browser motion settings.

(function () {
  var MAX_TRAILS = 2;
  var STEP_LENGTH = 30;      // px between successive footprints
  var STANCE_WIDTH = 7;      // px each foot sits left/right of the center line
  var FOOT_SIZE = { w: 15, h: 24 };

  // A solid shoe-sole print — a larger rounded forefoot pad and a
  // smaller rounded heel pad, no toes — drawn pointing "up" (forefoot
  // at the top) in its own coordinate space. footsteps.js rotates the
  // whole thing to match the direction of travel.
  var FOOT_SVG =
    '<svg viewBox="0 0 60 96" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="30" cy="30" rx="18" ry="26"/>' +
      '<ellipse cx="30" cy="76" rx="14" ry="18"/>' +
    '</svg>';

  var container = null;
  var activeTrails = 0;
  var pendingCleanups = []; // timeout ids for each trail's own removal, so resize can cancel them

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // Builds a gently curving walk from one edge of the viewport to
  // roughly the far side, wandering "anywhere" rather than in a
  // straight line.
  function generatePath(w, h) {
    // Re-reads window.innerWidth/innerHeight at call time (see spawnTrail),
    // so every trail is generated for whatever the viewport is *right now*
    // — resizing the window just changes the canvas the next trail walks
    // across, it never stretches an old one.
    var margin = 60;
    var edge = Math.floor(rand(0, 4));
    var x, y, angle; // angle: 0 = moving right, 90 = moving down (degrees)

    if (edge === 0) {        // start top, head down-ish
      x = rand(0, w);
      y = -margin;
      angle = rand(60, 120);
    } else if (edge === 1) { // start bottom, head up-ish
      x = rand(0, w);
      y = h + margin;
      angle = rand(240, 300);
    } else if (edge === 2) { // start left, head right-ish
      x = -margin;
      y = rand(0, h);
      angle = rand(-30, 30);
    } else {                 // start right, head left-ish
      x = w + margin;
      y = rand(0, h);
      angle = rand(150, 210);
    }

    var points = [];
    var steps = Math.floor(rand(30, 50));

    for (var i = 0; i < steps; i++) {
      points.push({ x: x, y: y, angle: angle });

      angle += rand(-16, 16); // gentle wander, step to step
      var rad = (angle * Math.PI) / 180;
      x += Math.cos(rad) * STEP_LENGTH;
      y += Math.sin(rad) * STEP_LENGTH;

      if (x < -margin || x > w + margin || y < -margin || y > h + margin) {
        break;
      }
    }

    return points;
  }

  function spawnTrail() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var path = generatePath(w, h);
    if (path.length < 6) return; // too short to bother with, try again later

    activeTrails++;

    var trailEl = document.createElement('div');
    trailEl.className = 'footstep-trail';
    container.appendChild(trailEl);

    var stagger = rand(190, 260);   // ms between each print appearing
    var life = rand(2800, 3800);    // ms each individual print stays visible

    path.forEach(function (p, i) {
      var side = i % 2 === 0 ? 1 : -1; // alternate left/right foot
      var rad = (p.angle * Math.PI) / 180;
      var perpX = -Math.sin(rad);
      var perpY = Math.cos(rad);

      var footX = p.x + perpX * STANCE_WIDTH * side;
      var footY = p.y + perpY * STANCE_WIDTH * side;

      // Sprite is drawn forefoot-up; rotate by (angle + 90) so the
      // forefoot leads in the direction of travel, and mirror every
      // other print so it reads as alternating feet.
      var rotation = p.angle + 90;

      var foot = document.createElement('div');
      foot.className = 'footstep';
      foot.style.left = footX + 'px';
      foot.style.top = footY + 'px';
      foot.style.width = FOOT_SIZE.w + 'px';
      foot.style.height = FOOT_SIZE.h + 'px';
      foot.style.transform =
        'rotate(' + rotation + 'deg) scaleX(' + side + ')';

      var mark = document.createElement('div');
      mark.className = 'footstep-mark';
      mark.style.animationDuration = life + 'ms';
      mark.style.animationDelay = i * stagger + 'ms';
      mark.innerHTML = FOOT_SVG;

      foot.appendChild(mark);
      trailEl.appendChild(foot);
    });

    var totalTime = (path.length - 1) * stagger + life + 200;
    var cleanupId = setTimeout(function () {
      trailEl.remove();
      activeTrails--;
      var idx = pendingCleanups.indexOf(cleanupId);
      if (idx !== -1) pendingCleanups.splice(idx, 1);
    }, totalTime);
    pendingCleanups.push(cleanupId);
  }

  // Checks frequently (not just once per trail) so a new trail starts
  // walking almost the instant a slot frees up — no dead gaps where
  // nothing is on screen.
  function loop() {
    if (activeTrails < MAX_TRAILS) spawnTrail();
    setTimeout(loop, rand(500, 1100));
  }

  // If the window/tab is resized, any trail already walking is holding
  // stale pixel coordinates from the old viewport size and could end up
  // outside the new one. Simplest reliable fix: clear them out — the
  // loop above immediately regenerates fresh trails sized to the new
  // viewport, so there's no visible gap.
  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!container) return;
      // Cancel every trail's own pending removal timeout first — otherwise
      // those stale callbacks fire later and each does an extra
      // `activeTrails--`, driving the count negative and causing the loop
      // below to spawn new trails on almost every tick until it claws back
      // up (worse with every subsequent resize).
      pendingCleanups.forEach(function (id) { clearTimeout(id); });
      pendingCleanups = [];
      var trails = container.querySelectorAll('.footstep-trail');
      trails.forEach(function (t) { t.remove(); });
      activeTrails = 0;
    }, 150);
  }

  function init() {
    container = document.createElement('div');
    container.className = 'footsteps-layer';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);

    window.addEventListener('resize', onResize);

    // First trail walks in right away; the second follows a beat later
    // so they don't sync up, then the loop keeps things continuous.
    spawnTrail();
    setTimeout(spawnTrail, rand(700, 1400));
    setTimeout(loop, 1500);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
