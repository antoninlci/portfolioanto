/* ============================================================
   3D CARDS TORNADO  (Osmo) — Experiences carousel
   Standalone page (experiences) — gsap + Observer + ScrollTrigger.
   ============================================================ */
(function () {
  "use strict";
  if (typeof window.gsap === "undefined") return;
  var gsap = window.gsap;
  if (!window.Observer || !window.ScrollTrigger) return;

  gsap.registerPlugin(Observer, ScrollTrigger);

  function init3DCardsTornado() {
    const containers = gsap.utils.toArray('[data-3d-tornado-init]');
    if (!containers.length) return;

    const rotationAngle = 30;      // rotation angle (spacing)
    const cardYSpacing = 0.3;      // vertical card offset
    const edgeOffset = 2;          // vertical edge offset
    const orbitDepth = 35;         // width/depth of the tornado orbit
    const autoSpeed = 0.0012;      // automatic rotation speed (slower)
    const scrollSpeed = 0.015;     // scroll/drag speed
    const dragMultiplier = 5;      // extra sensitivity for drag gestures
    const scrollEase = 0.1;        // speed lerp
    const maxSpeed = 0.2;          // maximum speed
    const edgeScale = 0.5;         // edge scale distance
    const edgeEase = gsap.parseEase("power2.inOut");
    const minScale = 1;            // smallest scale for distant cards
    const defaultBackDarkness = 0.75;  // darkening applied to cards in back
    const backBlur = 0.5;          // blur applied to cards in back

    containers.forEach((container) => {
      const list = container.querySelector('[data-3d-tornado-list]');
      // Sur fond clair, assombrir les cartes du fond à 75 % les rend presque
      // noires : la page peut demander moins via data-back-darkness.
      const backDarkness = parseFloat(container.dataset.backDarkness) || defaultBackDarkness;
      const originalCards = gsap.utils.toArray('[data-3d-tornado-item]', list).map((card) => card.cloneNode(true));
      if (!list || !originalCards.length) return;

      let inputObserver;
      let resizeTimer;

      const state = {
        amount: 0,
        progress: 0,
        velocity: autoSpeed,
        direction: 1,
        cardHeight: 0,
        cardGap: 0,
        em: 16,
        isActive: false,
        blockDrag: false,
        hovering: false,
        cards: []
      };

      function getCardAmount() {
        const containerHalfHeight = container.offsetHeight * 0.5;
        const edgeOffsetDistance = state.cardHeight * edgeOffset;
        const fadeDistance = state.cardHeight * edgeScale;
        const neededDistance = containerHalfHeight + edgeOffsetDistance + fadeDistance;
        const cardsPerSide = Math.ceil(neededDistance / state.cardGap) + 1;
        const neededAmount = cardsPerSide * 2 + 1;
        const batchCount = Math.ceil(neededAmount / originalCards.length);
        return originalCards.length * batchCount;
      }

      function buildCards() {
        list.innerHTML = "";
        const measureCard = originalCards[0].cloneNode(true);
        list.appendChild(measureCard);
        state.cardHeight = measureCard.offsetHeight;
        state.cardGap = state.cardHeight * cardYSpacing;
        state.em = parseFloat(getComputedStyle(measureCard).fontSize);
        state.amount = getCardAmount();
        list.innerHTML = "";

        for (let i = 0; i < state.amount; i++) {
          const card = originalCards[i % originalCards.length].cloneNode(true);
          card.dataset.index = i;
          list.appendChild(card);
        }
        state.cards = gsap.utils.toArray('[data-3d-tornado-item]', list);
      }

      function getEdgeScale(y) {
        const containerHalfHeight = container.offsetHeight * 0.5;
        const edgeOffsetDistance = state.cardHeight * edgeOffset;
        const fadeDistance = state.cardHeight * edgeScale;
        const distanceFromCenter = Math.abs(y);
        const fadeStart = containerHalfHeight + edgeOffsetDistance;
        const progress = gsap.utils.clamp(0, 1, (fadeStart - distanceFromCenter) / fadeDistance);
        return edgeEase(progress);
      }

      function render() {
        const radius = orbitDepth * state.em;

        state.cards.forEach((card) => {
          const startIndex = parseFloat(card.dataset.index);
          const loopIndex = ((startIndex + state.progress) % state.amount + state.amount) % state.amount;
          const index = loopIndex > state.amount * 0.5 ? loopIndex - state.amount : loopIndex;
          const angleDeg = index * rotationAngle;
          const angleRad = angleDeg * Math.PI / 180;
          const center = 1 - Math.min(Math.abs(index) / (state.amount * 0.5), 1);
          const y = index * state.cardGap;
          const baseScale = minScale + center * (1 - minScale);
          const scale = baseScale * getEdgeScale(y);
          const backAmount = gsap.utils.clamp(0, 1, (1 - Math.cos(angleRad)) * 0.5);
          const brightness = 1 - backAmount * backDarkness;
          const blur = backAmount * backBlur;

          gsap.set(card, {
            xPercent: -50,
            yPercent: -50,
            x: Math.sin(angleRad) * radius,
            y,
            z: (Math.cos(angleRad) - 1) * radius,
            rotateY: angleDeg,
            scale,
            filter: `brightness(${brightness}) blur(${blur}em)`,
            autoAlpha: 1,
            zIndex: Math.round(center * 1000)
          });
        });
      }

      function tick() {
        if (!state.isActive) return;
        // Survoler une carte arrête la rotation : sinon elle glisse sous le
        // curseur pendant qu'on vise.
        const targetVelocity = state.hovering ? 0 : autoSpeed * state.direction;
        state.velocity = gsap.utils.interpolate(state.velocity, targetVelocity, scrollEase);
        state.progress += state.velocity;
        render();
      }

      function handleInput(self) {
        if (!state.isActive) return;
        const isWheel = self.event.type === 'wheel';
        if (!isWheel && state.blockDrag) return;   // no drag while pointer is on the icon
        const delta = isWheel ? self.deltaY : Math.abs(self.deltaX) > Math.abs(self.deltaY) ? self.deltaX * dragMultiplier : self.deltaY * dragMultiplier;
        if (!delta) return;
        state.direction = delta > 0 ? 1 : -1;
        state.velocity += delta * scrollSpeed / 100;
        state.velocity = gsap.utils.clamp(-maxSpeed, maxSpeed, state.velocity);
      }

      function setActive(isActive) {
        state.isActive = isActive;
        if (!inputObserver) return;
        if (isActive) { inputObserver.enable(); } else { inputObserver.disable(); }
      }

      function rebuild() {
        buildCards();
        render();
      }

      rebuild();

      inputObserver = Observer.create({
        target: window,
        type: 'wheel,touch,pointer',
        preventDefault: false,
        lockAxis: true,
        onChange: handleInput,
        onPress: (self) => {
          const t = self.event && self.event.target;
          // On ne fait tourner qu'en glissant hors des cartes : un appui sur
          // une carte est un clic, jamais le début d'un glisser.
          state.blockDrag = !!(t && t.closest && t.closest('[data-cursor-marquee-text], .exp-card'));
          if (!state.blockDrag) container.style.cursor = 'grabbing';
        },
        onRelease: () => { state.blockDrag = false; container.style.cursor = 'grab'; }
      });

      // Clic sur une carte : un seul appui ouvre l'expérience. À la souris, on
      // part dès l'appui — la carte tourne, et attendre le relâchement laisse
      // le temps à une autre carte de passer dessous. Au doigt, on attend le
      // relâchement pour ne pas ouvrir une carte quand on voulait balayer.
      // Le clic natif qui suit est annulé (écouteur en capture sur window,
      // donc avant celui de transition.js sur document), sinon on naviguerait
      // deux fois. Cmd/Ctrl-clic garde le comportement normal du navigateur.
      const tapSlop = 10;
      let press = null;

      function open(card) {
        if (!card.matches('a[href]')) return;
        opening = true;
        card.click();   // passe par transition.js, comme un vrai lien
        opening = false;
      }
      let opening = false;

      container.addEventListener('pointerover', (e) => {
        state.hovering = !!(e.target.closest && e.target.closest('.exp-card'));
      });
      container.addEventListener('pointerleave', () => { state.hovering = false; });

      container.addEventListener('pointerdown', (e) => {
        press = null;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        const card = e.target.closest && e.target.closest('.exp-card');
        if (!card) return;
        if (e.pointerType === 'mouse') { open(card); return; }
        press = { x: e.clientX, y: e.clientY, card };
      });
      window.addEventListener('pointerup', (e) => {
        const p = press;
        press = null;
        if (e.pointerType !== 'mouse') state.hovering = false;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) <= tapSlop) open(p.card);
      });
      window.addEventListener('click', (e) => {
        if (opening || e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (e.target.closest && e.target.closest('.cards-tornado .exp-card')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);

      ScrollTrigger.create({
        trigger: container,
        start: "top bottom",
        end: "bottom top",
        onEnter: () => setActive(true),
        onEnterBack: () => setActive(true),
        onLeave: () => setActive(false),
        onLeaveBack: () => setActive(false)
      });

      setActive(ScrollTrigger.isInViewport(container));
      gsap.ticker.add(tick);

      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          rebuild();
          ScrollTrigger.refresh();
        }, 150);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', init3DCardsTornado);
  } else {
    init3DCardsTornado();
  }
})();
