/* ══════════════════════════════════════════════════════════════════════
   BOUTIQUE — comportements
   Trois choses seulement : la galerie, les cases dépliantes, et les
   révélations au défilement. Tout le reste est du CSS.

   ⚠️ CONVERSION SHOPIFY — la galerie deviendra product.media, les cases
      des blocks de section, et le bouton d'achat un {% form 'product' %}.
      La mécanique ci-dessous ne change pas.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Galerie ───────────────────────────────────────────────────────
     La vignette cliquée devient la grande vue. aria-current porte
     l'état : un cadre plus clair ne dit rien à qui n'y voit pas.

     Trois sortes de vignettes, dans cet ordre de priorité :
       — data-video : la grande vue devient un <video> ;
       — une <img>  : elle devient cette image ;
       — ni l'un ni l'autre : le nom de l'écran, en attendant sa capture.

     Les vidéos ne sont posées qu'AU CLIC. Écrites d'emblée dans la page,
     leurs quelques mégaoctets partiraient au chargement, avant même
     qu'on sache si le visiteur les regardera. */
  var vue = document.querySelector('[data-gal-vue]');
  var minis = document.querySelectorAll('[data-gal-mini]');
  minis.forEach(function (m) {
    m.addEventListener('click', function () {
      minis.forEach(function (o) { o.setAttribute('aria-current', 'false'); });
      m.setAttribute('aria-current', 'true');
      if (!vue) return;

      var leg  = m.querySelector('span');
      var nom  = leg ? leg.textContent : '';
      var img  = m.querySelector('img');
      var film = m.getAttribute('data-video');

      /* Le cadre de téléphone n'est posé que pour la vue mobile : c'est
         lui qui donne l'échelle. Sans lui, l'enregistrement d'un écran de
         téléphone n'est qu'une bande verticale dont on ne sait pas si
         elle fait 6 pouces ou 27.
         Pas de contrôles natifs dans le téléphone : la barre de lecture
         s'afficherait À L'INTÉRIEUR de l'écran, comme si elle faisait
         partie de la boutique. La vidéo tourne en boucle, elle n'en a
         pas besoin. */
      /* Trois cadres possibles pour la grande vue : le format d'une
         capture (par défaut), celui d'un téléphone, celui d'un coffret.
         On efface les deux modificateurs avant d'en poser un — sinon
         celui du coffret resterait accroché à la vue suivante. */
      vue.classList.remove('gal-vue--boite');

      if (film) {
        var poster = img ? ' poster="' + img.getAttribute('src') + '"' : '';
        var tel = m.hasAttribute('data-tel');
        vue.classList.toggle('gal-vue--tel', tel);
        var lecteur = '<video src="' + film + '"' + poster +
                      ' autoplay muted loop playsinline' +
                      (tel ? '' : ' controls') + '></video>';
        vue.innerHTML = tel
          ? '<div class="tel"><div class="tel-ecran">' + lecteur + '</div></div>'
          : lecteur;
      } else if (img) {
        vue.classList.remove('gal-vue--tel');
        vue.classList.toggle('gal-vue--boite', m.hasAttribute('data-boite'));
        vue.innerHTML = '<img src="' + img.getAttribute('src') + '" alt="' + nom + '">';
      } else {
        vue.classList.remove('gal-vue--tel');
        vue.innerHTML = '<em>' + nom + '</em>';
      }
    });
  });

  /* ── Cases dépliantes ─────────────────────────────────────────────
     Indépendantes : ouvrir la description ne referme pas la licence.
     On compare souvent deux réponses côte à côte. */
  document.querySelectorAll('.acc-b').forEach(function (b) {
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', function () {
      var ouvert = b.parentElement.classList.toggle('on');
      b.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
  });

  /* ── Révélations ─────────────────────────────────────────────────── */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
})();

/* ══════════════════════════════════════════════════════════════════════
   MENU RIDEAU — d'après « Curved Menu » (files 8)

   Une seule timeline GSAP, jouée en avant pour ouvrir et rembobinée pour
   fermer. C'est le point qui règle les saccades : deux animations
   séparées, chacune avec ses délais, ne repartent jamais exactement en
   sens inverse. Un ruban rembobiné, si.

   Trois mouvements en parallèle :
     1. le panneau entre par la droite ;
     2. le bord courbe se redresse (attribut « d » du tracé SVG) ;
     3. les liens rattrapent le panneau, l'un après l'autre.

   ⚠️ Aucun preventDefault sur les liens : c'est px.js qui intercepte les
      clics et pose le voile. Reprendre la navigation ici couperait la
      transition de page.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof gsap === 'undefined') return;

  var bouton = document.getElementById('mbtn');
  var menu   = document.getElementById('menu');
  var trace  = document.getElementById('menu-trace');
  if (!bouton || !menu || !trace) return;

  var liens = Array.prototype.slice.call(menu.querySelectorAll('.menu-l'));
  var puces = menu.querySelectorAll('.menu-dot');

  /* Les deux dessins du bord gauche, dans le repère du viewBox (100×1000).
     Fermé, le point de contrôle part à -100 : le bord se creuse vers la
     page. Ouvert, il revient à 100 : le bord devient droit. */
  var COURBE = 'M100 0 L200 0 L200 1000 L100 1000 Q-100 500 100 0';
  var DROIT  = 'M100 0 L200 0 L200 1000 L100 1000 Q100 500 100 0';
  trace.setAttribute('d', COURBE);

  /* La largeur du panneau plus les 100 px du bord courbe : sans eux, la
     courbe resterait visible au bord de l'écran, menu fermé.
     Passée en fonction et non en nombre — GSAP la relit à chaque
     invalidate(), donc au redimensionnement. */
  function dehors() { return menu.offsetWidth + 100; }

  var tl = gsap.timeline({
    paused: true,
    defaults: { duration: 0.8, ease: 'power3.inOut' },
    onReverseComplete: function () {
      menu.classList.remove('on');
      menu.setAttribute('aria-hidden', 'true');
    }
  });

  tl.fromTo(menu,  { x: dehors }, { x: 0 }, 0)
    .fromTo(trace, { attr: { d: COURBE } }, { attr: { d: DROIT }, duration: 1 }, 0)
    .fromTo(liens, { x: 80 }, { x: 0, stagger: 0.05 }, 0);

  function ouvert() { return !tl.reversed() && tl.progress() > 0; }

  /* ── La pastille ────────────────────────────────────────────────────
     Elle marque la page où l'on se trouve, et rien d'autre. Elle ne suit
     PAS le curseur : un repère qui bouge dès qu'on regarde ailleurs
     n'est plus un repère. Le survol se dit autrement — le lien pâlit,
     c'est du CSS et ça n'efface pas la position courante. */
  function pastille(cible) {
    liens.forEach(function (l) {
      gsap.to(l.querySelector('.menu-dot'), {
        scale: l.dataset.href === cible ? 1 : 0,
        duration: 0.3, ease: 'power2.out'
      });
    });
  }

  /* La page courante se déduit de l'adresse : ouvert depuis le disque
     (file://) comme depuis un serveur, c'est le nom du fichier qui
     compte. Une adresse qui finit par « / » vaut la page d'accueil. */
  var ici = location.pathname.split('/').pop() || 'index.html';

  function ouvrir() {
    /* Un drapeau sur <body> : le panneau et le sac du panier ne sont pas
       dans le même parent, aucun sélecteur de frère ne peut les relier.
       La classe sur la racine, elle, est lisible de partout. */
    document.body.classList.add('menu-on');
    menu.classList.add('on');
    menu.setAttribute('aria-hidden', 'false');
    bouton.classList.add('on');
    bouton.setAttribute('aria-expanded', 'true');
    bouton.setAttribute('aria-label', 'Close menu');
    tl.play();
    pastille(ici);
  }

  function fermer() {
    document.body.classList.remove('menu-on');
    bouton.classList.remove('on');
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-label', 'Open menu');
    gsap.to(puces, { scale: 0, duration: 0.3 });
    tl.reverse();
  }

  bouton.addEventListener('click', function () {
    if (ouvert()) fermer(); else ouvrir();
  });

  /* Un lien vers une ancre d'une AUTRE page reste une traversée ; sur la
     page elle-même, il redevient une simple ancre. Sans ça, px.js
     rechargerait la page entière pour descendre de deux écrans. */
  liens.forEach(function (l) {
    var a = l.querySelector('a');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    var d = h.indexOf('#');
    if (d > 0 && h.slice(0, d).split('/').pop() === ici) a.setAttribute('href', h.slice(d));
  });

  /* Un clic sur un lien : deux cas.
     — Une ancre, un courriel, un onglet neuf : rien ne change de page,
       il faut donc refermer le panneau pour de bon.
     — Une vraie traversée : px.js pose le voile et la page suivante
       arrive avec son propre panneau fermé. On éteint seulement le
       bouton, sans rembobiner — l'animation de fermeture se jouerait
       derrière le voile, pour personne. */
  menu.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || a.target === '_blank' ||
        /^(mailto|tel):/.test(href)) { fermer(); return; }
    document.body.classList.remove('menu-on');
    bouton.classList.remove('on');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ouvert()) fermer();
  });

  /* Au redimensionnement, la largeur du panneau change avec le min() du
     CSS. invalidate() fait relire dehors() ; le tracé, lui, n'a rien à
     recalculer — son viewBox s'étire tout seul. */
  window.addEventListener('resize', function () {
    if (ouvert()) return;
    tl.invalidate();
    gsap.set(menu, { x: dehors() });
  });
})();

/* ══════════════════════════════════════════════════════════════════════
   LE SIGLE QUI SUIT LE CURSEUR

   Deux mouvements sur la même source : un déplacement, et une bascule
   en trois dimensions. Le déplacement seul donnerait un autocollant qui
   glisse ; c'est l'inclinaison qui fait croire à un objet posé devant la
   page.

   quickTo plutôt qu'un tween par événement : la souris envoie des
   dizaines de messages par seconde, et créer autant de tweens les
   empilerait. quickTo réutilise le même et se contente de changer sa
   destination — le sigle rattrape le curseur avec du retard, et c'est ce
   retard qui donne le poids.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof gsap === 'undefined') return;

  var sigle = document.querySelector('[data-parallaxe]');
  if (!sigle) return;

  /* Sans curseur, il n'y a rien à suivre : sur un écran tactile le sigle
     resterait figé au centre, ce qui est très bien. Et un visiteur qui a
     demandé moins d'animations ne veut pas d'un logo qui bouge. */
  if (!window.matchMedia) return;
  if (matchMedia('(hover: none)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var COURSE = 26;  /* pixels de débattement, coin à coin */
  var BASCULE = 7;  /* degrés d'inclinaison au bord de l'écran */

  var vers = { duration: 0.9, ease: 'power3' };
  var x  = gsap.quickTo(sigle, 'x',         vers);
  var y  = gsap.quickTo(sigle, 'y',         vers);
  var rx = gsap.quickTo(sigle, 'rotationX', vers);
  var ry = gsap.quickTo(sigle, 'rotationY', vers);

  window.addEventListener('mousemove', function (e) {
    /* −1 au bord gauche, +1 au bord droit. Rapporter la position à la
       fenêtre et non au sigle : sinon le mouvement s'inverserait dès que
       le curseur passe de l'autre côté de lui. */
    var dx = (e.clientX / innerWidth  - 0.5) * 2;
    var dy = (e.clientY / innerHeight - 0.5) * 2;

    x(dx * COURSE);
    y(dy * COURSE);
    /* rotationX est inversé : pousser le curseur vers le bas doit
       coucher le haut du sigle vers l'arrière, pas vers l'avant. */
    ry(dx * BASCULE);
    rx(-dy * BASCULE);
  });

  /* Une arrivée discrète — le sigle se pose, il n'apparaît pas. */
  gsap.from(sigle, { opacity: 0, scale: 0.94, duration: 1.1,
                     ease: 'power3.out', delay: 0.15 });
})();


/* ══════════════════════════════════════════════════════════════════════
   LE NOM, AJUSTÉ À LA LARGEUR

   RENDERFLOW doit toucher les deux bords de son panneau : dans le menu,
   du I d'Instagram au m de l'adresse mail ; dans le tiroir, du C de Cart
   au e de Close.

   Pourquoi pas une taille en CSS ? La police d'affichage est
   « Helvetica Neue, Helvetica, Arial » — trois métriques pour trois
   machines. Un font-size en dur cadre juste sur le Mac où on l'a réglé,
   et laisse un trou ou déborde ailleurs. On mesure donc le mot une fois,
   et on en déduit la taille : la relation est linéaire, un seul calcul
   suffit.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  var mots = document.querySelectorAll('[data-ajuster]');
  if (!mots.length) return;

  var regle = document.createRange();

  function ajuster(mot) {
    var st = getComputedStyle(mot);
    var dispo = mot.clientWidth
              - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
    if (!(dispo > 0)) return;

    /* Mesure à 100 px : assez grand pour que l'arrondi au pixel de la
       mesure ne pèse plus rien une fois ramené à l'échelle. */
    var pose = mot.style.fontSize;
    mot.style.fontSize = '100px';
    regle.selectNodeContents(mot);
    var avance = regle.getBoundingClientRect().width / 100;
    /* letter-spacing s'applique AUSSI après la dernière lettre. En
       tracking négatif — .logo-mot est à -.05em — la boîte d'avance se
       referme donc en deçà de l'encre. Sans lui rendre ce retrait, le
       mot s'arrêterait visiblement avant le bord droit. */
    var traine = (parseFloat(getComputedStyle(mot).letterSpacing) || 0) / 100;
    mot.style.fontSize = pose;

    if (!(avance > 0)) return;
    mot.style.fontSize = (dispo / (avance - traine)) + 'px';
  }

  function tout() { Array.prototype.forEach.call(mots, ajuster); }

  tout();
  window.addEventListener('resize', tout);
  /* Si une police de repli cède la place à la vraie après coup, les
     métriques changent sous le mot déjà posé : on repasse. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(tout);
})();
