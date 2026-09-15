/* ══════════════════════════════════════════════════════════════════════
   TRANSITION PIXEL — démonstration 2 de Codrops, telle quelle.

   La classe Overlay ci-dessous est le fichier js/demo2/overlay.js du
   dépôt PixelTransition, recopié SANS modification — seul le mot-clé
   « export » a sauté. Raison : ouvrir une page en file:// interdit les
   modules ES au navigateur, et tes deux pages s'ouvrent par double-clic.
   Importer aurait marché sur un serveur et cassé chez toi.

   Les réglages sont ceux de demo2, au chiffre près :

     grille        9 rangées × 17 colonnes
     couverture    0,25 s · power1.in  · from 'center' · each 0,025
     retrait       0,25 s · power1.out · from 'center' · each 0,025
     échelle       0 → 1,03

   GSAP est chargé depuis son CDN : c'est lui qui calcule le décalage
   « depuis le centre » avec sa fonction de grille, et c'est exactement
   ce qui donne le rond qui s'étale puis se disperse.
   ══════════════════════════════════════════════════════════════════════ */

/* ─── js/demo2/overlay.js, verbatim ──────────────────────────────── */
class Cell {
    DOM = { el: null };
    row;
    column;

    constructor(row, column) {
        this.DOM.el = document.createElement('div');
        gsap.set(this.DOM.el, {willChange: 'opacity, transform'});
        this.row = row;
        this.column = column;
    }
}

class Overlay {
	DOM = { el: null };
    cells = [];
    options = { rows: 10, columns: 10 };

	constructor(DOM_el, customOptions) {
        this.DOM.el = DOM_el;
        this.options = Object.assign({}, this.options, customOptions);
        this.DOM.el.style.setProperty('--columns', this.options.columns);
		this.cells = new Array(this.options.rows);
        for (let i = 0; i < this.options.rows; ++i) {
            this.cells[i] = new Array(this.options.columns);
        }
        for (let i = 0; i < this.options.rows; ++i) {
            for (let j = 0; j < this.options.columns; ++j) {
                const cell = new Cell(i,j);
                this.cells[i][j] = cell;
                this.DOM.el.appendChild(cell.DOM.el);
            }
        }
	}

    show(customConfig = {}) {
        return new Promise((resolve) => {
            const defaultConfig = {
                transformOrigin: '50% 50%',
                duration: 0.5,
                ease: 'none',
                stagger: {
                    grid: [this.options.rows, this.options.columns],
                    from: 0,
                    each: 0.05,
                    ease: 'none'
                }
            };
            const config = Object.assign({}, defaultConfig, customConfig);

            gsap.set(this.DOM.el, {opacity: 1});
            gsap.fromTo(this.cells.flat().map(cell => cell.DOM.el), {
                scale: 0,
                opacity: 0,
                transformOrigin: config.transformOrigin
            }, {
                duration: config.duration,
                ease: config.ease,
                scale: 1.03,
                opacity: 1,
                stagger: config.stagger,
                onComplete: resolve
            });
        });
    }

    hide(customConfig = {}) {
        return new Promise((resolve) => {
            const defaultConfig = {
                transformOrigin: '50% 50%',
                duration: 0.5,
                ease: 'none',
                stagger: {
                    grid: [this.options.rows, this.options.columns],
                    from: 0,
                    each: 0.05,
                    ease: 'none'
                }
            };
            const config = Object.assign({}, defaultConfig, customConfig);

            gsap.fromTo(this.cells.flat().map(cell => cell.DOM.el), {
                transformOrigin: config.transformOrigin
            }, {
                duration: config.duration,
                ease: config.ease,
                scale: 0,
                opacity: 0,
                stagger: config.stagger,
                onComplete: resolve
            });
        });
    }
}

/* ─── branchement sur la navigation ──────────────────────────────── */
(function () {
  'use strict';

  var CLE = 'px-transition';
  var el  = document.querySelector('.px');
  if (!el || typeof gsap === 'undefined') return;

  var overlay = new Overlay(el, { rows: 9, columns: 17 });

  /* Les deux réglages de demo2, recopiés. */
  var COUVRIR = {
    duration: 0.25,
    ease: 'power1.in',
    stagger: { grid: [9, 17], from: 'center', each: 0.025 }
  };
  var DECOUVRIR = {
    duration: 0.25,
    ease: 'power1',
    stagger: { grid: [9, 17], from: 'center', each: 0.025 }
  };

  var occupe = false;

  /* ── Arrivée : le voile est en place, on le disperse ──────────── */
  if (document.documentElement.classList.contains('px-entree')) {
    try { sessionStorage.removeItem(CLE); } catch (e) {}
    /* Les cases sont posées d'emblée, sans animation : la page d'arrivée
       doit être couverte AVANT le premier rendu, pas se couvrir sous les
       yeux du visiteur. */
    gsap.set(el, { opacity: 1 });
    gsap.set(overlay.cells.flat().map(c => c.DOM.el), { scale: 1.03, opacity: 1 });
    requestAnimationFrame(function () {
      el.classList.add('vu');
      overlay.hide(DECOUVRIR).then(function () {
        document.documentElement.classList.remove('px-entree');
        gsap.set(el, { opacity: 0 });
      });
    });
  }

  /* ── Départ : on couvre, puis on change de page ───────────────── */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || occupe) return;

    var href = a.getAttribute('href');
    /* Seules les vraies traversées passent par le voile. */
    if (!href || href.charAt(0) === '#' || a.target === '_blank') return;
    if (/^(mailto|tel|javascript):/.test(href)) return;
    if (a.origin && a.origin !== location.origin) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    e.preventDefault();
    occupe = true;
    el.classList.add('vu');
    try { sessionStorage.setItem(CLE, '1'); } catch (err) {}

    overlay.show(COUVRIR).then(function () { location.href = a.href; });
  });
})();
