// nav-mobile.js
// Wires up the hamburger toggle for the shared top nav. The button,
// `.nav-links` wrapper, and `.nav-backdrop` element already live in each
// page's markup (see nav-mobile.css for how they're styled) — this file
// only handles opening/closing the panel and keeping it accessible:
//
//   - toggling `.nav-open` on <nav class="top"> and `aria-expanded` on
//     the button
//   - closing on: choosing a link, clicking the backdrop, pressing Esc,
//     or resizing back past the mobile breakpoint
//   - moving focus into the panel when it opens, and back to the button
//     when it's closed via keyboard/backdrop (not on link-click, since
//     focus is about to move to the new page anyway)
//   - locking background scroll while the panel is open

(function () {
  function init() {
    var nav = document.querySelector('nav.top');
    if (!nav) return;

    var toggle = nav.querySelector('.nav-toggle');
    var links = nav.querySelector('.nav-links');
    var backdrop = document.querySelector('.nav-backdrop');
    if (!toggle || !links) return;

    var isOpen = false;

    function openMenu() {
      isOpen = true;
      nav.classList.add('nav-open');
      nav.classList.remove('nav-hidden');
      if (document.querySelector('.socials')) {
        document.querySelector('.socials').classList.remove('nav-hidden');
      }
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      if (backdrop) backdrop.classList.add('visible');
      document.body.classList.add('nav-scroll-lock');
      document.addEventListener('keydown', onKeydown);

      var firstLink = links.querySelector('a');
      if (firstLink) firstLink.focus();
    }

    function closeMenu(returnFocus) {
      isOpen = false;
      nav.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      if (backdrop) backdrop.classList.remove('visible');
      document.body.classList.remove('nav-scroll-lock');
      document.removeEventListener('keydown', onKeydown);

      if (returnFocus) toggle.focus();
    }

    function onKeydown(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeMenu(true);
      }
    }

    toggle.addEventListener('click', function () {
      if (isOpen) {
        closeMenu(false);
      } else {
        openMenu();
      }
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        // Don't fight the navigation that's about to happen — just drop
        // the open state/scroll-lock so a bfcache restore of this same
        // page doesn't come back with the menu stuck open.
        closeMenu(false);
      });
    });

    if (backdrop) {
      backdrop.addEventListener('click', function () {
        closeMenu(true);
      });
    }

    // ---------- hide-on-scroll ----------
    // Slide nav.top and .socials out of view while scrolling down, bring
    // them back on scroll-up (or once near the top of the page). Never
    // hides them while the mobile menu is open, so there's nothing weird
    // like the panel or hamburger vanishing mid-interaction.
    var socialsEl = document.querySelector('.socials');
    var lastScrollY = window.scrollY || window.pageYOffset;
    var scrollThreshold = 80; // px scrolled down before the bar starts hiding
    var ticking = false;

    function setHidden(hidden) {
      nav.classList.toggle('nav-hidden', hidden);
      if (socialsEl) socialsEl.classList.toggle('nav-hidden', hidden);
    }

    function handleScroll() {
      var currentY = window.scrollY || window.pageYOffset;

      if (!isOpen) {
        if (currentY > lastScrollY && currentY > scrollThreshold) {
          setHidden(true);
        } else if (currentY < lastScrollY || currentY <= scrollThreshold) {
          setHidden(false);
        }
      }

      lastScrollY = currentY;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    }, { passive: true });

    // If the viewport grows past the mobile breakpoint while the panel
    // is open (rotating a tablet, resizing a desktop window), close it
    // so it can't get stuck open underneath the desktop nav layout.
    var mq = window.matchMedia('(max-width: 700px)');
    function handleBreakpointChange(e) {
      if (!e.matches && isOpen) closeMenu(false);
    }
    if (mq.addEventListener) {
      mq.addEventListener('change', handleBreakpointChange);
    } else if (mq.addListener) {
      // Safari < 14
      mq.addListener(handleBreakpointChange);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
