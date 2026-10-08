/**
 * ============================================================
 *  ANTONIN LE CLEÏ — app.js v3
 *
 *  Δ Changes:
 *  ① Cursor: mousemove-based state machine (dot / bar / grow)
 *     Applies bar to ALL non-clickable text on the page.
 *  ② scrollToTop link: Lenis smooth scroll to top on click
 *  ③ About-transition: 3-phase scrubbed ScrollTrigger timeline
 *     Phase 1 — Band grows (scaleY) + dark word appears
 *     Phase 2 — Band holds at full screen
 *     Phase 3 — Band fades + ghost word appears on dark bg
 *  ④ Clock, nav, all other animations unchanged
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  if (typeof gsap === 'undefined' || typeof Lenis === 'undefined') {
    console.error('GSAP or Lenis not loaded.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ─────────────────────────────────────────────────────────
  // 0. HEADER/NAV LIGHT-MODE TOGGLE ON HERO
  // ─────────────────────────────────────────────────────────
  const uiHeader = document.querySelector('.ui-header');
  const uiNav    = document.querySelector('.ui-nav');
  if (uiHeader && uiNav) {
    ScrollTrigger.create({
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      onEnter:     () => { uiHeader.classList.add('on-light'); uiNav.classList.add('on-light'); },
      onLeave:     () => { uiHeader.classList.remove('on-light'); uiNav.classList.remove('on-light'); },
      onEnterBack: () => { uiHeader.classList.add('on-light'); uiNav.classList.add('on-light'); },
      onLeaveBack: () => { uiHeader.classList.add('on-light'); uiNav.classList.add('on-light'); },
    });
    // Set initial state
    uiHeader.classList.add('on-light');
    uiNav.classList.add('on-light');
  }


  // ─────────────────────────────────────────────────────────
  // 0b. MOBILE MENU
  // ─────────────────────────────────────────────────────────
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

  if (mobileMenuBtn && mobileMenuOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuBtn.classList.toggle('active');
      mobileMenuOverlay.classList.toggle('open');
    });

    mobileMenuOverlay.querySelectorAll('.mobile-menu-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuBtn.classList.remove('active');
        mobileMenuOverlay.classList.remove('open');
      });
    });

    // Sync on-light state with menu button
    if (uiHeader) {
      const syncMenuBtn = () => {
        if (uiHeader.classList.contains('on-light')) {
          mobileMenuBtn.classList.add('on-light');
        } else {
          mobileMenuBtn.classList.remove('on-light');
        }
      };
      syncMenuBtn();
      new MutationObserver(syncMenuBtn).observe(uiHeader, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // ─────────────────────────────────────────────────────────
  // 1. LOADER
  // ─────────────────────────────────────────────────────────
  initLoader();

  function initLoader() {
    const loader    = document.getElementById('loader');
    const loaderBar = document.getElementById('loaderBar');
    const loaderPct = document.getElementById('loaderPercent');

    loader.style.display = 'none';
    runHeroEntrance();
  }

  // ─────────────────────────────────────────────────────────
  // 2. LENIS — smooth scroll
  // ─────────────────────────────────────────────────────────
  const lenis = new Lenis({
    duration: 1.3,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    mouseMultiplier: 1.1,
    touchMultiplier: 8,
  });

  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links — scroll to section using Lenis native element targeting.
  // We call ScrollTrigger.refresh() first so all pin-spacer positions are
  // up-to-date, then let Lenis compute the final scroll offset itself.
  document.querySelectorAll('a[href^="#"]:not(#scrollToTop)').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id      = a.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      if (!section) return;

      ScrollTrigger.refresh();

      lenis.scrollTo(section, {
        offset:   0,
        duration: 1.4,
        easing:   t => 1 - Math.pow(1 - t, 4),
      });
    });
  });

  // ─────────────────────────────────────────────────────────
  // Δ SCROLL-TO-TOP — Name link in header
  // ─────────────────────────────────────────────────────────
  const scrollToTopEl = document.getElementById('scrollToTop');
  if (scrollToTopEl) {
    scrollToTopEl.addEventListener('click', e => {
      e.preventDefault();
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', background: '#000',
        opacity: '0', zIndex: '9999', pointerEvents: 'none',
      });
      document.body.appendChild(overlay);
      gsap.timeline()
        .to(overlay, { opacity: 1, duration: 0.4, ease: 'power2.in' })
        .call(() => {
          lenis.stop();
          window.scrollTo(0, 0);
          ScrollTrigger.refresh();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              lenis.start();
              gsap.to(overlay, {
                opacity: 0, duration: 0.4, ease: 'power2.out',
                onComplete: () => overlay.remove(),
              });
            });
          });
        });
    });
  }

  // ─────────────────────────────────────────────────────────
  // Δ 3. CURSOR — State machine via mousemove
  //
  //  States:
  //  'dot'  → 7×7px circle    (default — on empty areas)
  //  'bar'  → 2×22px rect     (on non-clickable text)
  //  'grow' → 11×11px circle  (on links, buttons, cards)
  //
  //  Uses mousemove (not mouseenter/leave) to avoid state
  //  conflicts when cursor moves between overlapping elements.
  // ─────────────────────────────────────────────────────────
  const cursorEl  = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursorDot');

  // Move cursor element to exact mouse position (no lag)
  document.addEventListener('mousemove', e => {
    gsap.set(cursorEl, { x: e.clientX, y: e.clientY });
    updateCursorState(e.target);
  });

  document.addEventListener('mouseleave', () => {
    gsap.to(cursorDot, { opacity: 0, duration: 0.2 });
  });
  document.addEventListener('mouseenter', () => {
    gsap.to(cursorDot, { opacity: 1, duration: 0.2 });
  });

  // ── Cursor state definitions ──────────────────────────────
  const STATES = {
    dot: {
      width: 7, height: 7, borderRadius: '50%',
      duration: 0.2, ease: 'power3.out',
    },
    bar: {
      width: 2, height: 22, borderRadius: '1px',
      duration: 0.18, ease: 'power3.out',
    },
    barLarge: {
      width: 3, height: 44, borderRadius: '1px',
      duration: 0.18, ease: 'power3.out',
    },
    grow: {
      width: 11, height: 11, borderRadius: '50%',
      duration: 0.2, ease: 'power3.out',
    },
  };

  let activeCursorState = 'dot';

  // Tags we treat as "text" (cursor → bar)
  const TEXT_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
                              'TD', 'TH', 'SPAN', 'LI', 'BLOCKQUOTE']);

  // Selectors for interactive elements (cursor → grow)
  const CLICKABLE_SELECTOR = 'a, button, .project-card, .hero-thumb, .nav-link, label';

  function getDesiredState(target) {
    // Walk up from target — first match wins
    let el = target;
    while (el && el !== document.documentElement) {
      // Clickable always takes priority
      if (el.matches && el.matches(CLICKABLE_SELECTOR)) return 'grow';
      // Text elements (that are not wrappers of links)
      if (TEXT_TAGS.has(el.tagName)) {
        // If this text element is inside a link, treat as clickable
        if (el.closest(CLICKABLE_SELECTOR)) return 'grow';
        // Large bar only on "Let's collaborate." text
        if (el.classList && el.classList.contains('contact-title-line')) return 'barLarge';
        // Skip contact-title h2 itself — only its children trigger bar
        if (el.classList && el.classList.contains('contact-title')) return 'dot';
        return 'bar';
      }
      el = el.parentElement;
    }
    return 'dot';
  }

  function updateCursorState(target) {
    const desired = getDesiredState(target);
    if (desired === activeCursorState) return; // No change — skip GSAP call
    activeCursorState = desired;
    gsap.to(cursorDot, STATES[desired]);
  }

  // ─────────────────────────────────────────────────────────
  // 4. CLOCK — time + date, month names follow <html lang>
  // ─────────────────────────────────────────────────────────
  const MONTHS_BY_LANG = {
    en: ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
         'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'],
    fr: ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN',
         'JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'],
  };
  const MONTHS = MONTHS_BY_LANG[document.documentElement.lang] || MONTHS_BY_LANG.en;

  const timeEl = document.getElementById('clockTime');
  const dateEl = document.getElementById('clockDate');

  function updateClock() {
    const now  = new Date();
    let   h    = now.getHours();
    const m    = String(now.getMinutes()).padStart(2, '0');
    const ap   = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    timeEl.textContent = `${String(h).padStart(2, '0')}:${m} ${ap}`;
    dateEl.textContent = `${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()} [FR]`;
  }

  updateClock();
  // Sync to next full minute then repeat every 60s
  const msToNextMin = (60 - new Date().getSeconds()) * 1000;
  setTimeout(() => { updateClock(); setInterval(updateClock, 60000); }, msToNextMin);

  // ─────────────────────────────────────────────────────────
  // 5. NAV — Active state + progress per section
  //
  //  Uses Lenis scroll event + exact math + clamping.
  //  getDocTop() walks offsetParent chain → true document position.
  //  Formula: pct = clamp(0, (scrollY - sectionTop) / sectionHeight * 100, 100)
  // ─────────────────────────────────────────────────────────

  function getDocTop(el) {
    let top = 0, node = el;
    while (node) { top += node.offsetTop; node = node.offsetParent; }
    return top;
  }

  const navSections = ['info', 'work', 'archive', 'contact'].map(id => ({
    id,
    section: document.getElementById(id),
    navEl:   document.querySelector(`[data-section="${id}"]`),
    fill:    document.querySelector(`[data-section="${id}"] .nav-progress-fill`),
  })).filter(s => s.section && s.navEl && s.fill);

  lenis.on('scroll', ({ scroll }) => {
    navSections.forEach(({ section, navEl, fill }) => {
      const top    = getDocTop(section);
      const height = section.offsetHeight;

      const raw = ((scroll - top) / height) * 100;
      const pct = Math.max(0, Math.min(100, raw));

      fill.style.width = pct + '%';

      if (scroll >= top && scroll < top + height) {
        navEl.classList.add('active');
      } else {
        navEl.classList.remove('active');
        fill.style.width = '0%';
      }
    });
  });

  // ─────────────────────────────────────────────────────────
  // 6. HERO ENTRANCE
  // ─────────────────────────────────────────────────────────
  function runHeroEntrance() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    tl.from('.hero-title-line', { yPercent: 110, opacity: 0, stagger: 0.1, duration: 1.4 }, 0);

    // Texte d'intro : découpé et animé en CSS dès le HTML (voir index.html).

    tl.from('.hero-scroll-cta', { opacity: 0, y: 8, duration: 0.6 }, 1.1);
    tl.from('.hero-thumb', { clipPath: 'inset(0 0 100% 0)', stagger: 0.08, duration: 0.95 }, 0.5);
    tl.from('.ui-header', { opacity: 0, y: -10, duration: 0.7 }, 0.1);
    tl.from('.nav-item',  { opacity: 0, x: -12, stagger: 0.05, duration: 0.55 }, 0.2);
  }

  // ─────────────────────────────────────────────────────────
  // 7. PORTAL OPENING
  // ─────────────────────────────────────────────────────────
  const portalTL = gsap.timeline({
    scrollTrigger: {
      trigger:      '#hero',
      pin:          true,
      // Conteneur d'épinglage fourni dans le HTML : sans lui, GSAP déplace
      // #hero dans un nouveau div, ce qui force à redessiner tout le haut de
      // page après le JS et retardait la mesure d'affichage (LCP).
      pinSpacer:    '.hero-pin-spacer',
      pinSpacing:   true,
      scrub:        1,
      start:        'top top',
      end:          '+=150%',
      anticipatePin: 1,
      // onLeave intentionally absent — portal stays visible through the
      // GSAP spacer zone so the user never sees the white hero.
      // The portal is hidden only when #info reaches the viewport (below).
      onEnterBack: () => {
        // Scrolling back into the hero pin zone — restore portal
        gsap.set('#hero-portal', { autoAlpha: 1 });
      },
    }
  });

  portalTL
    .fromTo('#hero-portal',
      { clipPath: 'inset(50% 0 50% 0)' },
      { clipPath: 'inset(0% 0 0% 0)', ease: 'none' }
    )
    .fromTo('#portal-about',
      { opacity: 0 },
      { opacity: 1, ease: 'power2.in' },
      '<'
    );

  // ─────────────────────────────────────────────────────────
  // 7b. PORTAL HANDOFF — hide portal when #info reaches viewport top
  //
  //  At this exact moment the sticky #about-bg is visually identical
  //  to #portal-about → the transition is invisible.
  //  body bg is also set to #121212 so the nav column matches #info.
  // ─────────────────────────────────────────────────────────
  ScrollTrigger.create({
    trigger:     '#info',
    start:       'top top',
    onEnter:     () => {
      gsap.set('#hero-portal', { autoAlpha: 0 });
      gsap.set('body', { backgroundColor: '#121212' });
    },
    onLeaveBack: () => {
      // Scrolling back above #info — portal must cover the spacer again
      gsap.set('#hero-portal', { autoAlpha: 1 });
      gsap.set('body', { backgroundColor: 'var(--bg)' });
    },
  });

  // ─────────────────────────────────────────────────────────
  // 8. WATERMARK FADE — #about-bg fades as content scrolls over it
  // ─────────────────────────────────────────────────────────
  const aboutBgEl = document.getElementById('about-bg');
  if (aboutBgEl) {
    gsap.to(aboutBgEl, {
      opacity: 0.06,
      ease: 'power1.inOut',
      scrollTrigger: {
        trigger: '.about-content',
        start:   'top 75%',
        end:     'top 20%',
        scrub:   1,
      }
    });
  }

  document.querySelectorAll('.about-img').forEach(img => {
    const speed  = parseFloat(img.dataset.speed) || 1;
    const offset = (1 - speed) * 75;

    gsap.fromTo(img,
      { yPercent: offset * -1 },
      {
        yPercent: offset, ease: 'none',
        scrollTrigger: { trigger: '#info', start: 'top bottom', end: 'bottom top', scrub: 1.4 }
      }
    );

    gsap.fromTo(img,
      { clipPath: 'inset(100% 0 0 0)' },
      {
        clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: img, start: 'top 84%', toggleActions: 'play none none none' }
      }
    );
  });

  const aboutBio = document.querySelector('.about-bio');
  if (aboutBio) {
    gsap.set(aboutBio, { y: 22 });
    gsap.to(aboutBio, {
      opacity: 1, y: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: aboutBio, start: 'top 80%' }
    });
  }

  document.querySelectorAll('.service-desc').forEach(el => {
    gsap.set(el, { y: 10 });
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.8, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  document.querySelectorAll('.service-item').forEach((item, i) => {
    gsap.from(item, {
      opacity: 0, x: -20, duration: 0.7, ease: 'expo.out', delay: i * 0.07,
      scrollTrigger: { trigger: item, start: 'top 86%' }
    });
  });

  // ─────────────────────────────────────────────────────────
  // 9. COUNTERS
  // ─────────────────────────────────────────────────────────
  document.querySelectorAll('.stat-number[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(obj, {
        val: target, duration: 1.5, ease: 'expo.out',
        onUpdate: () => { el.textContent = Math.floor(obj.val); }
      })
    });
  });

  // ─────────────────────────────────────────────────────────
  // 10. WORK — Gilroy pinned full-page stacking
  //
  //  Each .work-panel is a full-screen layer (glow + video + text).
  //  Panel 0 is visible. Panel 1+ clip in from bottom, covering
  //  everything beneath (background, video, text — the whole page).
  // ─────────────────────────────────────────────────────────
  const workPin    = document.querySelector('.work-pin');
  const workPanels = gsap.utils.toArray('.work-panel');
  const numPanels  = workPanels.length;

  if (workPin && numPanels > 1) {

    // Initial state: panel 0 fully visible, rest clipped from below
    workPanels.forEach((panel, i) => {
      gsap.set(panel, {
        clipPath: i === 0 ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
        zIndex: i + 1,
      });
      // All curtains start closed
      const curtain = panel.querySelector('.work-curtain');
      if (curtain) gsap.set(curtain, { xPercent: 0 });
    });

    // Panel 0 (Stingers): hover curtain reveal
    const stingersWrap = workPanels[0].querySelector('.work-media-wrap');
    const firstCover = workPanels[0].querySelector('.work-cover-img');
    const firstCurtain = workPanels[0].querySelector('.work-curtain');
    const firstVideo = workPanels[0].querySelector('.work-media-wrap video');

    if (stingersWrap && firstCover && firstCurtain && firstVideo) {
      gsap.set(firstCurtain, { xPercent: -100 });
      gsap.set(firstCover, { clipPath: 'inset(0% 0% 0% 0%)' });
      let hoverTL = null;

      stingersWrap.addEventListener('mouseenter', () => {
        if (hoverTL) hoverTL.kill();
        firstVideo.currentTime = 0;
        firstVideo.play();
        hoverTL = gsap.timeline();
        hoverTL.set(firstCover, { clipPath: 'inset(0% 0% 0% 0%)' });
        hoverTL.fromTo(firstCurtain,
          { xPercent: -100 },
          { xPercent: 100, duration: 0.4, ease: 'power2.inOut' }
        );
        hoverTL.to(firstCover, {
          clipPath: 'inset(0% 0% 0% 100%)',
          duration: 0.4,
          ease: 'power2.inOut',
        }, '<');
      });

      stingersWrap.addEventListener('mouseleave', () => {
        if (hoverTL) hoverTL.kill();
        hoverTL = gsap.timeline();
        hoverTL.fromTo(firstCurtain,
          { xPercent: 100 },
          { xPercent: -100, duration: 0.4, ease: 'power2.inOut' }
        );
        hoverTL.to(firstCover, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.4,
          ease: 'power2.inOut',
        }, '<');
      });
    }

    // Panel 1 (CutsInnit): hover curtain reveal (same as Stingers)
    const cutsinnitWrap = workPanels[1].querySelector('.work-media-wrap');
    const cutsinnitCover = workPanels[1].querySelector('.work-cover-img');
    const cutsinnitCurtain = workPanels[1].querySelector('.work-curtain');
    const cutsinnitVideo = workPanels[1].querySelector('.work-media-wrap video');

    if (cutsinnitWrap && cutsinnitCover && cutsinnitCurtain && cutsinnitVideo) {
      gsap.set(cutsinnitCurtain, { xPercent: -100 });
      gsap.set(cutsinnitCover, { clipPath: 'inset(0% 0% 0% 0%)' });
      let cutsinnitHoverTL = null;

      cutsinnitWrap.addEventListener('mouseenter', () => {
        if (cutsinnitHoverTL) cutsinnitHoverTL.kill();
        cutsinnitVideo.currentTime = 0;
        cutsinnitVideo.play();
        cutsinnitHoverTL = gsap.timeline();
        cutsinnitHoverTL.set(cutsinnitCover, { clipPath: 'inset(0% 0% 0% 0%)' });
        cutsinnitHoverTL.fromTo(cutsinnitCurtain,
          { xPercent: -100 },
          { xPercent: 100, duration: 0.4, ease: 'power2.inOut' }
        );
        cutsinnitHoverTL.to(cutsinnitCover, {
          clipPath: 'inset(0% 0% 0% 100%)',
          duration: 0.4,
          ease: 'power2.inOut',
        }, '<');
      });

      cutsinnitWrap.addEventListener('mouseleave', () => {
        if (cutsinnitHoverTL) cutsinnitHoverTL.kill();
        cutsinnitHoverTL = gsap.timeline();
        cutsinnitHoverTL.fromTo(cutsinnitCurtain,
          { xPercent: 100 },
          { xPercent: -100, duration: 0.4, ease: 'power2.inOut' }
        );
        cutsinnitHoverTL.to(cutsinnitCover, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.4,
          ease: 'power2.inOut',
        }, '<');
      });
    }

    // Panel 2 (Cincta): hover curtain reveal (same as Stingers & CutsInnit)
    const cinctaWrap = workPanels[2] && workPanels[2].querySelector('.work-media-wrap');
    const cinctaCover = workPanels[2] && workPanels[2].querySelector('.work-cover-img');
    const cinctaCurtain = workPanels[2] && workPanels[2].querySelector('.work-curtain');
    const cinctaVideo = workPanels[2] && workPanels[2].querySelector('.work-media-wrap video');

    if (cinctaWrap && cinctaCover && cinctaCurtain && cinctaVideo) {
      gsap.set(cinctaCurtain, { xPercent: -100 });
      gsap.set(cinctaCover, { clipPath: 'inset(0% 0% 0% 0%)' });
      let cinctaHoverTL = null;

      cinctaWrap.addEventListener('mouseenter', () => {
        if (cinctaHoverTL) cinctaHoverTL.kill();
        cinctaVideo.currentTime = 0;
        cinctaVideo.play();
        cinctaHoverTL = gsap.timeline();
        cinctaHoverTL.set(cinctaCover, { clipPath: 'inset(0% 0% 0% 0%)' });
        cinctaHoverTL.fromTo(cinctaCurtain,
          { xPercent: -100 },
          { xPercent: 100, duration: 0.4, ease: 'power2.inOut' }
        );
        cinctaHoverTL.to(cinctaCover, {
          clipPath: 'inset(0% 0% 0% 100%)',
          duration: 0.4,
          ease: 'power2.inOut',
        }, '<');
      });

      cinctaWrap.addEventListener('mouseleave', () => {
        if (cinctaHoverTL) cinctaHoverTL.kill();
        cinctaHoverTL = gsap.timeline();
        cinctaHoverTL.fromTo(cinctaCurtain,
          { xPercent: 100 },
          { xPercent: -100, duration: 0.4, ease: 'power2.inOut' }
        );
        cinctaHoverTL.to(cinctaCover, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.4,
          ease: 'power2.inOut',
        }, '<');
      });
    }

    // Build master timeline
    const workTL = gsap.timeline();

    for (let i = 0; i < numPanels - 1; i++) {
      // Hold on current project before transitioning
      workTL.to({}, { duration: 0.3 });

      // Full panel clips in from bottom → covers everything
      workTL.to(workPanels[i + 1], {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1,
        ease: 'none',
      });

      // Hold on new project
      if (i < numPanels - 2) {
        workTL.to({}, { duration: 0.3 });
      }
    }

    // Pin and scrub
    ScrollTrigger.create({
      trigger:    '#work',
      pin:        workPin,
      pinSpacing: true,
      scrub:      0.8,
      start:      'top top',
      end:        `+=${numPanels * 120}%`,
      animation:  workTL,
    });
  }

  // ─────────────────────────────────────────────────────────
  // Δ HERO THUMBNAILS — Fade-navigate to work panels
  // ─────────────────────────────────────────────────────────
  document.querySelectorAll('.hero-thumb[data-project]').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const targetIndex = parseInt(thumb.dataset.project, 10);
      const workSection = document.getElementById('work');
      if (!workSection) return;

      // Calculate the scroll position for the target panel
      const workST = ScrollTrigger.getAll().find(
        st => st.trigger === workSection || st.vars.trigger === '#work'
      );
      if (!workST) return;

      // Calculate scroll position proportionally for each panel index
      const totalPanels = gsap.utils.toArray('.work-panel').length;
      const targetScroll = targetIndex === 0
        ? workST.start
        : workST.start + (workST.end - workST.start) * (targetIndex / (totalPanels - 1));

      // Jump to the panel behind the shutters — same transition as a page nav.
      const jump = () => {
        lenis.stop();
        window.scrollTo(0, targetScroll);
        ScrollTrigger.refresh();
        requestAnimationFrame(() => requestAnimationFrame(() => lenis.start()));
      };

      if (window.pageTransition) window.pageTransition.coverThen(jump);
      else jump();
    });
  });

  // Vidéos Work et Archive : preload="none" dans le HTML pour ne rien
  // télécharger au premier affichage. Quand on approche de leur section, on
  // charge au moins leurs métadonnées pour que la lecture démarre vite.
  if ('IntersectionObserver' in window) {
    const warm = new IntersectionObserver((entries) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        warm.unobserve(target);
        target.querySelectorAll('video[preload="none"]').forEach(v => { v.preload = 'auto'; });
      });
    }, { rootMargin: '100% 0px' });
    ['work', 'archive'].forEach(id => { const el = document.getElementById(id); if (el) warm.observe(el); });
  }

  // Freeze glow background videos at frame 0
  document.querySelectorAll('.work-panel-glow video').forEach(v => {
    v.currentTime = 0;
    v.pause();
  });

  // Reset body bg after work section
  ScrollTrigger.create({
    trigger: '#archive', start: 'top 55%',
    onEnter: () => gsap.to('body', { backgroundColor: '#0a0a0a', duration: 0.7 })
  });

  // ─────────────────────────────────────────────────────────
  // 11. ARCHIVE — Timeline progress (smooth lerp) + entry reveals
  // ─────────────────────────────────────────────────────────
  const archiveLineFill = document.querySelector('.archive-line-fill');
  const archiveTimeline = document.querySelector('.archive-timeline');

  if (archiveLineFill && archiveTimeline) {
    let archiveTarget = 0;
    let archiveCurrent = 0;

    ScrollTrigger.create({
      trigger: archiveTimeline,
      start: 'top 30%',
      end: 'bottom 20%',
      onUpdate: (self) => {
        archiveTarget = self.progress * 100;
      }
    });

    // Collect dots and compute their relative positions within the timeline
    const archiveDots = archiveTimeline.querySelectorAll('.archive-dot');

    // Smooth lerp loop — runs every frame for ultra-fluid motion
    function archiveLerp() {
      archiveCurrent += (archiveTarget - archiveCurrent) * 0.06;
      if (Math.abs(archiveTarget - archiveCurrent) < 0.01) archiveCurrent = archiveTarget;
      archiveLineFill.style.height = archiveCurrent + '%';

      // Activate dots when the fill reaches them
      const timelineRect = archiveTimeline.getBoundingClientRect();
      const timelineH = archiveTimeline.offsetHeight;
      archiveDots.forEach(dot => {
        const dotTop = dot.getBoundingClientRect().top - timelineRect.top + 6;
        const dotPct = (dotTop / timelineH) * 100;
        if (archiveCurrent >= dotPct) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      requestAnimationFrame(archiveLerp);
    }
    requestAnimationFrame(archiveLerp);
  }

  document.querySelectorAll('.archive-entry').forEach((entry, i) => {
    gsap.from(entry, {
      opacity: 0, y: 30, duration: 0.8, ease: 'expo.out', delay: i * 0.05,
      scrollTrigger: { trigger: entry, start: 'top 85%' }
    });
  });

  // Archive videos — bg frozen at frame 1 (blurred), popup plays on hover
  document.querySelectorAll('.archive-entry-card').forEach(card => {
    const bgVideo = card.querySelector('.archive-card-bg video');
    const popupVideo = card.querySelector('.archive-card-video-popup video');
    if (bgVideo) {
      bgVideo.currentTime = 0;
      bgVideo.pause();
    }
    if (popupVideo) popupVideo.pause();

    card.addEventListener('mouseenter', () => {
      if (popupVideo) {
        popupVideo.currentTime = 0;
        popupVideo.play();
      }
    });
    card.addEventListener('mouseleave', () => {
      if (popupVideo) popupVideo.pause();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 12. CONTACT
  // ─────────────────────────────────────────────────────────
  document.querySelectorAll('.contact-title-line').forEach((line, i) => {
    gsap.from(line, {
      yPercent: 100, opacity: 0, duration: 1.1, ease: 'expo.out', delay: i * 0.1,
      scrollTrigger: { trigger: '#contact', start: 'top 70%' }
    });
  });

  gsap.from('.contact-email', {
    opacity: 0, y: 20, duration: 0.9, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact-email', start: 'top 85%' }
  });

  gsap.from('.social-link', {
    opacity: 0, y: 10, stagger: 0.06, duration: 0.6, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact-socials', start: 'top 90%' }
  });

  gsap.from('.site-footer', {
    opacity: 0, duration: 0.8, ease: 'expo.out',
    scrollTrigger: { trigger: '.site-footer', start: 'top 95%' }
  });

  // ─────────────────────────────────────────────────────────
  // 13. MAGNETIC — contact email
  // ─────────────────────────────────────────────────────────
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r  = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width  / 2);
      const dy = e.clientY - (r.top  + r.height / 2);
      gsap.to(el, { x: dx * 0.28, y: dy * 0.28, duration: 0.3, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });

  // ─────────────────────────────────────────────────────────
  // 14. SECTION EYEBROWS
  // ─────────────────────────────────────────────────────────
  gsap.utils.toArray('.section-eyebrow').forEach(el => {
    gsap.from(el, {
      opacity: 0, y: 10, duration: 0.6, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // ─────────────────────────────────────────────────────────
  // 15. (Reserved)
  // ─────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────
  // REFRESH
  // ─────────────────────────────────────────────────────────
  window.addEventListener('load', () => ScrollTrigger.refresh());
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
  });

});
