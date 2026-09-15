/* ══════════════════════════════════════════════════════════════════════
   LE PANIER

   Un magasin de données minuscule, dans localStorage, et deux vues qui
   le lisent : le tiroir et la page panier. Rien de plus.

   ── Pourquoi localStorage et pas une variable ──
   Le site est fait de pages séparées. Une variable JavaScript meurt au
   premier changement de page, et le panier serait vidé entre la fiche
   produit et la page de paiement — c'est-à-dire exactement au moment où
   il compte. localStorage survit à la navigation ET à la fermeture de
   l'onglet.

   ── Le format ──
   Une liste d'articles : { id, nom, prix, image, url, qte }.
   Le prix est un ENTIER, en centimes. Jamais un flottant : 0,1 + 0,2 ne
   fait pas 0,3 en binaire, et trois articles à 89,90 € finiraient par
   afficher un total à un centime près faux. On divise seulement pour
   l'affichage.

   ⚠️ CONVERSION SHOPIFY — sur la vraie boutique, c'est Shopify qui tient
      le panier (/cart/add.js, /cart/change.js) et le total est calculé
      par le serveur. Ce fichier ne sert qu'à l'aperçu local ; la
      mécanique de l'écran, elle, est la même.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CLE = 'rf-panier';
  var DEVISE = '€';

  /* ── Le magasin ──────────────────────────────────────────────────── */
  function lire() {
    try {
      var brut = localStorage.getItem(CLE);
      var liste = brut ? JSON.parse(brut) : [];
      return Array.isArray(liste) ? liste : [];
    } catch (e) {
      /* Stockage refusé (navigation privée sur certains navigateurs) ou
         contenu abîmé : on repart d'un panier vide plutôt que de casser
         la page. */
      return [];
    }
  }

  function ecrire(liste) {
    try { localStorage.setItem(CLE, JSON.stringify(liste)); } catch (e) {}
    peindre();
  }

  function somme(liste) {
    return liste.reduce(function (t, a) { return t + a.prix * a.qte; }, 0);
  }

  function compte(liste) {
    return liste.reduce(function (n, a) { return n + a.qte; }, 0);
  }

  function argent(centimes) {
    var v = (centimes / 100).toFixed(2).replace('.', ',');
    /* Un entier rond s'écrit sans décimales : « €89 » se lit mieux que
       « €89,00 » sur une page qui ne vend qu'un article. */
    return DEVISE + v.replace(',00', '');
  }

  /* ── Les opérations ──────────────────────────────────────────────── */
  function ajouter(article) {
    var liste = lire();
    var deja = null;
    liste.forEach(function (a) { if (a.id === article.id) deja = a; });
    if (deja) deja.qte += (article.qte || 1);
    else liste.push({
      id: article.id, nom: article.nom, prix: article.prix,
      image: article.image || '', url: article.url || '',
      qte: article.qte || 1
    });
    ecrire(liste);
  }

  function changer(id, delta) {
    var liste = lire().map(function (a) {
      if (a.id === id) a.qte += delta;
      return a;
    }).filter(function (a) { return a.qte > 0; });
    ecrire(liste);
  }

  function retirer(id) {
    ecrire(lire().filter(function (a) { return a.id !== id; }));
  }

  /* ── Le rendu ────────────────────────────────────────────────────── */
  function ligne(a, compact) {
    var img = a.image
      ? '<img src="' + a.image + '" alt="" loading="lazy">'
      : '';
    return '' +
      '<div class="tl" data-tl="' + a.id + '">' +
        '<a class="tl-img" href="' + (a.url || '#') + '">' + img + '</a>' +
        '<div>' +
          '<a href="' + (a.url || '#') + '"><span class="tl-nom">' + a.nom + '</span></a>' +
          '<p class="tl-var mono">' + argent(a.prix) + '</p>' +
          '<div class="tl-bas">' +
            '<span class="qte">' +
              '<button type="button" data-qte="-1" aria-label="Remove one">−</button>' +
              '<span>' + a.qte + '</span>' +
              '<button type="button" data-qte="1" aria-label="Add one">+</button>' +
            '</span>' +
            '<span class="tl-prix">' + argent(a.prix * a.qte) + '</span>' +
          '</div>' +
          (compact ? '' : '<a class="tl-x mono" href="#" data-retirer>Remove</a>') +
        '</div>' +
      '</div>';
  }

  function peindre() {
    var liste = lire();
    var n = compte(liste);

    /* Le compteur de la barre, sur toutes les pages. */
    document.querySelectorAll('[data-panier-compteur]').forEach(function (el) {
      el.classList.toggle('on', n > 0);
      var b = el.querySelector('b');
      if (b) b.textContent = n;
    });

    document.querySelectorAll('[data-panier-n]').forEach(function (el) {
      el.textContent = '(' + n + ')';
    });

    document.querySelectorAll('[data-panier-total]').forEach(function (el) {
      el.textContent = argent(somme(liste));
    });

    /* Les listes : le tiroir en version compacte, la page en version
       complète avec le lien « Remove ». */
    document.querySelectorAll('[data-panier-lignes]').forEach(function (el) {
      var compact = el.hasAttribute('data-compact');
      el.innerHTML = liste.map(function (a) { return ligne(a, compact); }).join('');
    });

    document.querySelectorAll('[data-panier-vide]').forEach(function (el) {
      el.hidden = n > 0;
    });
    document.querySelectorAll('[data-panier-pied]').forEach(function (el) {
      el.hidden = n === 0;
    });
    document.querySelectorAll('[data-panier-plein]').forEach(function (el) {
      el.hidden = n === 0;
    });
  }

  /* ── Le tiroir ───────────────────────────────────────────────────── */
  var tiroir = document.getElementById('tiroir');
  var voile  = document.getElementById('tiroir-voile');

  function ouvrir() {
    if (!tiroir) return;
    voile.hidden = false;
    /* Une image d'attente avant de poser la classe : un élément qui
       passe de hidden à visible ET change de transform dans la même
       image n'anime pas, il apparaît. */
    requestAnimationFrame(function () {
      voile.classList.add('on');
      tiroir.classList.add('on');
    });
    tiroir.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function fermer() {
    if (!tiroir) return;
    voile.classList.remove('on');
    tiroir.classList.remove('on');
    tiroir.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(function () { if (!tiroir.classList.contains('on')) voile.hidden = true; }, 500);
  }

  if (voile) voile.addEventListener('click', fermer);
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-panier-fermer]')) { e.preventDefault(); fermer(); }
    if (e.target.closest('[data-panier-ouvrir]')) { e.preventDefault(); ouvrir(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && tiroir && tiroir.classList.contains('on')) fermer();
  });

  /* ── Les boutons d'ajout ─────────────────────────────────────────── */
  document.querySelectorAll('[data-ajouter]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      ajouter({
        id:    b.getAttribute('data-id')    || b.getAttribute('data-nom'),
        nom:   b.getAttribute('data-nom')   || 'Item',
        prix:  parseInt(b.getAttribute('data-prix'), 10) || 0,
        image: b.getAttribute('data-image') || '',
        url:   b.getAttribute('data-url')   || ''
      });
      ouvrir();
    });
  });

  /* ── Les commandes des lignes ────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var tl = e.target.closest('[data-tl]');
    if (!tl) return;
    var id = tl.getAttribute('data-tl');

    var q = e.target.closest('[data-qte]');
    if (q) { e.preventDefault(); changer(id, parseInt(q.getAttribute('data-qte'), 10)); return; }

    if (e.target.closest('[data-retirer]')) { e.preventDefault(); retirer(id); }
  });

  /* Une autre fenêtre a touché au panier : on se remet à jour. */
  window.addEventListener('storage', function (e) { if (e.key === CLE) peindre(); });

  peindre();

  /* Rendu accessible aux autres scripts — la page de paiement en a besoin. */
  window.Panier = { lire: lire, somme: somme, compte: compte, argent: argent, vider: function () { ecrire([]); } };
})();
