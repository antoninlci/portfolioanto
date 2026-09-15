/* ══════════════════════════════════════════════════════════════════════
   LES AVIS — maquette locale

   ⚠️ Les avis sont enregistrés dans localStorage, donc dans le navigateur
      du visiteur. PERSONNE D'AUTRE NE LES VOIT. Ce fichier existe pour
      décider du dessin, pas pour recueillir de vrais retours.

   Pourquoi un thème ne peut pas faire mieux : il n'a pas de base de
   données. Il reçoit une page, il l'affiche, il s'arrête. Stocker un
   texte envoyé par un visiteur, vérifier qu'il a acheté, filtrer le
   spam, relancer par courriel — tout cela demande un serveur.

   Sur la vraie boutique, deux voies, toutes deux prêtes dans le thème :
     · les métaobjets « avis » saisis dans l'admin — gratuit, sans
       application, et c'est ce qui convient au début ;
     · une application (Judge.me) qui collecte et relance toute seule.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CLE = 'rf-avis';
  var forme = document.querySelector('[data-avis-form]');
  var liste = document.querySelector('[data-avis-liste]');
  if (!liste) return;

  function lire() {
    try {
      var b = localStorage.getItem(CLE);
      var l = b ? JSON.parse(b) : [];
      return Array.isArray(l) ? l : [];
    } catch (e) { return []; }
  }

  function ecrire(l) {
    try { localStorage.setItem(CLE, JSON.stringify(l)); } catch (e) {}
    peindre();
  }

  /* Une étoile, remplie au pourcentage. La dernière d'une note de 4,6 est
     à 60 % — l'arrondir à pleine est un mensonge de huit pour cent. */
  function etoile(part, cle) {
    var id = 'g' + cle;
    return '<svg class="etoile" viewBox="0 0 20 20" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '">' +
      '<stop offset="' + part + '%" stop-color="currentColor"/>' +
      '<stop offset="' + part + '%" stop-color="transparent"/>' +
      '</linearGradient></defs>' +
      '<path d="M10 1.6l2.5 5.4 5.9.7-4.4 4 1.2 5.8L10 14.6 4.8 17.5 6 11.7 1.6 7.7l5.9-.7z" ' +
      'fill="url(#' + id + ')" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  }

  function etoiles(note, prefixe) {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      var part = 0;
      if (note >= i) part = 100;
      else if (note > i - 1) part = Math.round((note - (i - 1)) * 100);
      out += etoile(part, prefixe + '-' + i);
    }
    return out;
  }

  function propre(t) {
    /* Le texte du visiteur est réinséré en HTML : sans échappement, un
       « <script> » dans un avis s'exécuterait. Ici c'est local, mais
       cette page sert de modèle — l'habitude se prend maintenant. */
    return String(t || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function carte(a, i) {
    var d = new Date(a.date);
    var quand = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    return '' +
      '<article class="av">' +
        '<div class="av-tete">' +
          '<span class="etoiles" role="img" aria-label="' + a.note + ' / 5">' +
            etoiles(a.note, 'c' + i) + '</span>' +
          '<time class="av-date mono">' + quand + '</time>' +
        '</div>' +
        '<p class="av-texte">' + propre(a.texte) + '</p>' +
        '<p class="av-nom mono">' + propre(a.nom) + '</p>' +
      '</article>';
  }

  function peindre() {
    var l = lire();
    liste.innerHTML = l.map(carte).join('');

    var vide = document.querySelector('[data-avis-vide]');
    var tete = document.querySelector('[data-avis-tete]');
    if (vide) vide.hidden = l.length > 0;
    if (tete) tete.hidden = l.length === 0;
    if (l.length === 0) return;

    var total = l.reduce(function (t, a) { return t + a.note; }, 0);
    var moy = total / l.length;

    var m = document.querySelector('[data-avis-moyenne]');
    if (m) m.textContent = moy.toFixed(1);

    var e = document.querySelector('[data-avis-etoiles]');
    if (e) { e.innerHTML = etoiles(moy, 'moy'); e.setAttribute('aria-label', moy.toFixed(1) + ' / 5'); }

    var c = document.querySelector('[data-avis-compte]');
    if (c) c.textContent = l.length + (l.length === 1 ? ' review' : ' reviews');
  }

  if (forme) {
    forme.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(forme);
      var texte = (d.get('texte') || '').toString().trim();
      var nom = (d.get('nom') || '').toString().trim();
      if (!texte || !nom) return;

      var l = lire();
      /* Le plus récent en premier : c'est celui qu'on vient d'écrire, et
         c'est aussi celui qui décrit la version actuelle du produit. */
      l.unshift({
        nom: nom,
        note: parseInt(d.get('note'), 10) || 5,
        texte: texte,
        date: Date.now()
      });
      ecrire(l);

      forme.reset();
      var cinq = forme.querySelector('#n5');
      if (cinq) cinq.checked = true;

      var merci = document.querySelector('[data-avis-merci]');
      if (merci) {
        merci.hidden = false;
        setTimeout(function () { merci.hidden = true; }, 5000);
      }
      liste.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  peindre();
})();
