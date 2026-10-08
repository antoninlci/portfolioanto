#!/usr/bin/env python3
"""Build the bilingual site: SEO head blocks, hreflang pairs, and the French pages.

Run from anywhere:  python3 scripts/build-i18n.py

The English pages under the repo root are the source of truth for markup. This
script rewrites their <head> SEO block in place (idempotent), then regenerates
every French page under /fr/ by applying the translation tables below. Re-run it
after editing any English page, otherwise the two languages drift apart.
"""
import posixpath
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.antoninleclei.com"
IMAGE = f"{SITE}/og-image.jpg"

# ── Page map ────────────────────────────────────────────────────────────────
# en / fr are file paths; en_url / fr_url are the live URLs (trailingSlash: true).
PAGES = [
    {
        "en": "index.html", "fr": "fr/index.html",
        "en_url": "/", "fr_url": "/fr/",
        "name_en": "Home", "name_fr": "Accueil",
        "title_en": "Antonin Le Cleï | Designer & Developer Building with AI",
        "desc_en": "Designer and developer building with AI. I design, code and ship websites, web apps, SaaS and AI automations — from the first screen to a live product.",
        "title_fr": "Antonin Le Cleï | Designer & développeur qui construit avec l'IA",
        "desc_fr": "Designer et développeur qui construit avec l'IA. Je conçois, code et mets en ligne des sites, applications web, SaaS et automatisations IA, du premier écran au produit.",
    },
    {
        "en": "projects/index.html", "fr": "fr/realisations/index.html",
        "en_url": "/projects/", "fr_url": "/fr/realisations/",
        "name_en": "Projects", "name_fr": "Réalisations",
        "title_en": "Projects & Case Studies | Antonin Le Cleï",
        "desc_en": "Selected projects and case studies by Antonin Le Cleï — Renderflow, his own Shopify theme store, client websites and a real estate investment model.",
        "title_fr": "Réalisations & études de cas | Antonin Le Cleï",
        "desc_fr": "Projets et études de cas d'Antonin Le Cleï — Renderflow, sa propre boutique de thèmes Shopify, des sites clients et un modèle d'investissement immobilier.",
    },
    {
        "en": "projects/fin210/index.html", "fr": "fr/realisations/fin210/index.html",
        "en_url": "/projects/fin210/", "fr_url": "/fr/realisations/fin210/",
        "name_en": "Real Estate Investment Financing", "name_fr": "Financement d'investissement immobilier",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "title_en": "Real Estate Investment Financing Case Study | FINA 210",
        "desc_en": "A $2.685M multi-residential acquisition in Montreal's Plateau: three-scenario DCF, 11.73% levered IRR and a limited partnership structure. JMSB, Concordia.",
        "title_fr": "Financement d'investissement immobilier | Étude de cas",
        "desc_fr": "Acquisition d'un multilogement de 2,685 M$ sur le Plateau à Montréal : DCF à trois scénarios, TRI avec levier de 11,73 % et montage en société en commandite.",
    },
    {
        "en": "experiences/index.html", "fr": "fr/experiences/index.html",
        "en_url": "/experiences/", "fr_url": "/fr/experiences/",
        "name_en": "Experience", "name_fr": "Expériences",
        "title_en": "Experience | Antonin Le Cleï, Designer & Developer",
        "desc_en": "The professional path of Antonin Le Cleï — agency work, web design and development, and AI-assisted automation.",
        "title_fr": "Expériences | Antonin Le Cleï, designer & développeur",
        "desc_fr": "Le parcours professionnel d'Antonin Le Cleï — travail en agence, design et développement web, et automatisations assistées par IA.",
    },
    {
        "en": "experiences/digitad/index.html", "fr": "fr/experiences/digitad/index.html",
        "en_url": "/experiences/digitad/", "fr_url": "/fr/experiences/digitad/",
        "name_en": "Digitad Internship", "name_fr": "Stage chez Digitad",
        "parent_en": ("Experience", "/experiences/"), "parent_fr": ("Expériences", "/fr/experiences/"),
        "title_en": "Web Design Internship at Digitad, Montreal | Antonin Le Cleï",
        "desc_en": "Web design intern at Digitad, a Montreal marketing agency: Webflow and Shopify builds, client wireframes and AI-assisted integration automations.",
        "title_fr": "Stage en web design chez Digitad, Montréal | Antonin Le Cleï",
        "desc_fr": "Stage en web design chez Digitad, agence de marketing à Montréal : intégration Webflow et Shopify, wireframes clients et automatisations assistées par IA.",
    },
    # ── Archive case studies. Copy is still placeholder, so these stay out of
    # the index until the real write-ups land (flip noindex to False then).
    {
        "en": "projects/concordia/index.html", "fr": "fr/realisations/concordia/index.html",
        "en_url": "/projects/concordia/", "fr_url": "/fr/realisations/concordia/",
        "name_en": "Concordia Project", "name_fr": "Projet Concordia",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "title_en": "Concordia Journalism Site — Web Design Case Study",
        "desc_en": "A three-article journalism site built for a fellow Concordia student in Montreal: the brief, the layout plan, and the revisions that shaped the final build.",
        "title_fr": "Site de journalisme Concordia — étude de cas web design",
        "desc_fr": "Un site de journalisme à trois articles conçu pour un étudiant de Concordia à Montréal : le brief, le plan de mise en page et les retours jusqu'à la version finale.",
    },
    {
        "en": "projects/cincta/index.html", "fr": "fr/realisations/cincta/index.html",
        "en_url": "/projects/cincta/", "fr_url": "/fr/realisations/cincta/",
        "name_en": "Cincta", "name_fr": "Cincta",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "title_en": "Cincta — Jewelry E-commerce Site & 3D Logo | Case Study",
        "desc_en": "An online jewelry brand's storefront and logo: modelled and animated in 3D in Blender, integrated live in the page, and built from an approved site plan.",
        "title_fr": "Cincta — boutique de bijoux et logo 3D | Étude de cas",
        "desc_fr": "La boutique en ligne et le logo d'une marque de bijoux : modélisé et animé en 3D sous Blender, intégré en direct dans la page, à partir d'un plan de site validé.",
    },
    {
        "en": "projects/kh-nail-bar/index.html", "fr": "fr/realisations/kh-nail-bar/index.html",
        "en_url": "/projects/kh-nail-bar/", "fr_url": "/fr/realisations/kh-nail-bar/",
        "name_en": "Kh Nail Bar", "name_fr": "Kh Nail Bar",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "title_en": "Kh Nail Bar — Nail Artist Portfolio & Booking Site",
        "desc_en": "A Montreal nail artist's portfolio and booking site, designed with no brief: a light palette and a KH logo both drawn from her Instagram.",
        "title_fr": "Kh Nail Bar — portfolio et prise de rendez-vous",
        "desc_fr": "Le portfolio et le site de réservation d'une nail artist montréalaise, conçu sans brief : palette claire et logo KH repris de son Instagram.",
    },
    {
        "en": "projects/stingers/index.html", "fr": "fr/realisations/stingers/index.html",
        "en_url": "/projects/stingers/", "fr_url": "/fr/realisations/stingers/",
        "name_en": "Stingers", "name_fr": "Stingers",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "title_en": "Stingers — Concordia Varsity Roster Redesign Concept",
        "desc_en": "An unsolicited redesign of Concordia's Stingers basketball roster — player listing, positions and team colours, built as a concept and never shipped.",
        "title_fr": "Stingers — refonte du roster de Concordia (concept)",
        "desc_fr": "Une refonte spontanée du roster de basketball des Stingers de Concordia : effectif, postes et couleurs de l'équipe, restée à l'état de concept.",
    },
    {
        "en": "projects/cutsinnit/index.html", "fr": "fr/realisations/cutsinnit/index.html",
        "en_url": "/projects/cutsinnit/", "fr_url": "/fr/realisations/cutsinnit/",
        "name_en": "CutsInnit", "name_fr": "CutsInnit",
        "parent_en": ("Projects", "/projects/"), "parent_fr": ("Réalisations", "/fr/realisations/"),
        "title_en": "CutsInnit — Barber Portfolio & Online Booking Site",
        "desc_en": "A Montreal barber's portfolio, price list and booking site: clients browse the cuts, then pick a slot from his real availability without picking up the phone.",
        "title_fr": "CutsInnit — portfolio de barbier et réservation en ligne",
        "desc_fr": "Le portfolio, les tarifs et la réservation en ligne d'un barbier montréalais : on parcourt les coupes, puis on choisit un créneau sur ses disponibilités réelles.",
    },
    {
        "en": "documents/index.html", "fr": "fr/documents/index.html",
        "en_url": "/documents/", "fr_url": "/fr/documents/",
        "name_en": "CV & Documents", "name_fr": "CV & documents",
        "title_en": "CV & Documents | Antonin Le Cleï, Designer & Developer",
        "desc_en": "Download the resume of Antonin Le Cleï in French and English — designer and developer building websites, web apps and AI automations.",
        "title_fr": "CV & documents | Antonin Le Cleï, designer & développeur",
        "desc_fr": "Téléchargez le CV d'Antonin Le Cleï en français et en anglais — designer et développeur : sites, applications web et automatisations IA.",
    },
]

# EN page URL -> FR page URL, used to rewrite internal links inside /fr/ pages.
LINK_MAP = {p["en_url"]: p["fr_url"] for p in PAGES}


# ── Small HTML helpers ──────────────────────────────────────────────────────
def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def chars(word):
    """Rebuild the per-character .nav-char stack used by animated labels."""
    out, i = [], 0
    for ch in word:
        if ch == " ":
            out.append('<span class="nav-char-space"></span>')
            continue
        d = "0s" if i == 0 else f".{i * 2:02d}s"
        out.append(
            '<span class="nav-char">'
            f'<span class="nav-char-top" style="transition-delay:{d}">{ch}</span>'
            f'<span class="nav-char-bot" style="transition-delay:{d}">{ch}</span>'
            "</span>"
        )
        i += 1
    return "".join(out)


def swap_text(html, tag, anchor, new, required=True):
    """Replace the inner text of the first <tag> whose text contains `anchor`."""
    pat = re.compile(r"(<" + tag + r"\b[^>]*>)([^<]*" + re.escape(anchor) + r"[^<]*)(</" + tag + r">)", re.S)
    out, n = pat.subn(lambda m: m.group(1) + new + m.group(3), html, count=1)
    if required and n != 1:
        raise SystemExit(f"swap_text miss: <{tag}> {anchor!r}")
    return out


def swap_nav_label(html, section, word):
    pat = re.compile(
        r'(<li class="nav-item" data-section="' + section + r'">.*?<span class="nav-label">)(.*?)'
        r'(</span>\s*<span class="nav-progress-bar">)', re.S)
    out, n = pat.subn(lambda m: m.group(1) + chars(word) + m.group(3), html, count=1)
    if n != 1:
        raise SystemExit(f"nav label miss: {section}")
    return out


def swap_char_run(html, anchor_class, word):
    """Replace the animated label of a hero CTA, keeping its trailing arrow.

    The label is a run of nested .nav-char spans, so it cannot be matched with a
    repeated non-greedy group — that only ever consumes the first character and
    leaves the rest of the English word behind. Rebuild the anchor body instead:
    everything from the first .nav-char up to the arrow span is the label.
    """
    pat = re.compile(r'(<a\b[^>]*class="[^"]*' + anchor_class + r'[^"]*"[^>]*>)(.*?)(</a>)', re.S)

    def rebuild(m):
        inner = m.group(2)
        start = inner.find('<span class="nav-char">')
        arrow = inner.find('<span style="font-size:28px">')
        if start < 0 or arrow < 0:
            raise SystemExit(f"char run shape changed: {anchor_class}")
        return m.group(1) + inner[:start] + chars(word) + " " + inner[arrow:] + m.group(3)

    out, n = pat.subn(rebuild, html, count=1)
    if n != 1:
        raise SystemExit(f"char run miss: {anchor_class}")
    return out


# ── <head>: rebuild the SEO block ───────────────────────────────────────────
STRIP = [
    r"<title>.*?</title>\s*",
    r'<meta\s+name="description"[^>]*>\s*',
    r'<meta\s+name="author"[^>]*>\s*',
    r'<meta\s+name="robots"[^>]*>\s*',
    r'<link\s+rel="canonical"[^>]*>\s*',
    r'<link\s+rel="alternate"\s+hreflang[^>]*>\s*',
    r'<meta\s+property="og:[^"]*"[^>]*>\s*',
    r'<meta\s+name="twitter:[^"]*"[^>]*>\s*',
    r"<!-- Open Graph -->\s*",
    r"<!-- Twitter -->\s*",
    r'<script type="application/ld\+json" data-seo>.*?</script>\s*',
]


def build_head(page, lang):
    title = page[f"title_{lang}"]
    desc = page[f"desc_{lang}"]
    url = SITE + page[f"{lang}_url"]
    locale = "fr_CA" if lang == "fr" else "en_CA"
    alt_locale = "en_CA" if lang == "fr" else "fr_CA"

    crumbs = []
    home_name = "Accueil" if lang == "fr" else "Home"
    home_url = SITE + ("/fr/" if lang == "fr" else "/")
    crumbs.append((home_name, home_url))
    parent = page.get(f"parent_{lang}")
    if parent:
        crumbs.append((parent[0], SITE + parent[1]))
    if page[f"{lang}_url"] not in ("/", "/fr/"):
        crumbs.append((page[f"name_{lang}"], url))

    items = ",\n      ".join(
        '{"@type":"ListItem","position":%d,"name":"%s","item":"%s"}' % (i + 1, esc(n), u)
        for i, (n, u) in enumerate(crumbs)
    )
    ld = ""
    if len(crumbs) > 1:
        ld = (
            '  <script type="application/ld+json" data-seo>\n'
            '  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[\n'
            f"      {items}\n  ]}}\n  </script>\n"
        )

    return (
        f"  <title>{esc(title)}</title>\n"
        f'  <meta name="description" content="{esc(desc)}" />\n'
        '  <meta name="author" content="Antonin Le Cleï" />\n'
        + ('  <meta name="robots" content="noindex, follow" />\n' if page.get("noindex")
           else '  <meta name="robots" content="index, follow" />\n')
        + f'  <link rel="canonical" href="{url}" />\n'
        f'  <link rel="alternate" hreflang="en-ca" href="{SITE}{page["en_url"]}" />\n'
        f'  <link rel="alternate" hreflang="en" href="{SITE}{page["en_url"]}" />\n'
        f'  <link rel="alternate" hreflang="fr-ca" href="{SITE}{page["fr_url"]}" />\n'
        f'  <link rel="alternate" hreflang="fr" href="{SITE}{page["fr_url"]}" />\n'
        f'  <link rel="alternate" hreflang="x-default" href="{SITE}{page["en_url"]}" />\n\n'
        "  <!-- Open Graph -->\n"
        '  <meta property="og:type" content="website" />\n'
        '  <meta property="og:site_name" content="Antonin Le Cleï" />\n'
        f'  <meta property="og:locale" content="{locale}" />\n'
        f'  <meta property="og:locale:alternate" content="{alt_locale}" />\n'
        f'  <meta property="og:title" content="{esc(title)}" />\n'
        f'  <meta property="og:description" content="{esc(desc)}" />\n'
        f'  <meta property="og:url" content="{url}" />\n'
        f'  <meta property="og:image" content="{IMAGE}" />\n\n'
        "  <!-- Twitter -->\n"
        '  <meta name="twitter:card" content="summary_large_image" />\n'
        f'  <meta name="twitter:title" content="{esc(title)}" />\n'
        f'  <meta name="twitter:description" content="{esc(desc)}" />\n'
        f'  <meta name="twitter:image" content="{IMAGE}" />\n'
        + ld
    )


def apply_head(html, page, lang):
    for pat in STRIP:
        html = re.sub(pat, "", html, flags=re.S)
    anchor = re.search(r'<meta name="viewport"[^>]*>\n', html)
    if not anchor:
        raise SystemExit("no viewport meta")
    at = anchor.end()
    return html[:at] + build_head(page, lang) + html[at:]


# ── Language switcher ───────────────────────────────────────────────────────
def switcher(page, lang):
    en_cur = ' aria-current="true"' if lang == "en" else ""
    fr_cur = ' aria-current="true"' if lang == "fr" else ""
    t_en = "Français" if lang == "en" else "View this site in English"
    t_fr = "Voir le site en français" if lang == "en" else "Français"
    label = "Language" if lang == "en" else "Langue"
    return (
        f'        <div class="ui-lang" role="group" aria-label="{label}">\n'
        f'          <a href="{page["en_url"]}"{en_cur} hreflang="en" title="{t_en}">EN</a>\n'
        '          <span class="ui-lang-sep">/</span>\n'
        f'          <a href="{page["fr_url"]}"{fr_cur} hreflang="fr" title="{t_fr}">FR</a>\n'
        "        </div>\n"
    )


CLOCK = re.compile(r'<span class="ui-date" id="clockDate">[^<]*</span>\n')


def apply_switcher(html, page, lang):
    html = re.sub(r' *<div class="ui-lang"[^>]*>.*?</div>\n', "", html, flags=re.S)
    m = CLOCK.search(html)
    if not m:
        raise SystemExit("no clock block")
    at = m.end()
    return html[:at] + switcher(page, lang) + html[at:]


# ── Link normalisation ──────────────────────────────────────────────────────
def to_absolute(html, page_dir):
    """Rewrite relative href/src to root-absolute so /fr/ pages resolve."""
    def fix(m):
        pre, url, post = m.group(1), m.group(2), m.group(3)
        if re.match(r"^(https?:|mailto:|tel:|#|/|data:)", url):
            return m.group(0)
        trailing = url.endswith("/")
        full = posixpath.normpath(posixpath.join("/" + page_dir, url))
        if trailing and not full.endswith("/"):
            full += "/"
        return pre + full + post

    html = re.sub(r'(<[^>]*?\b(?:href|src)=")([^"]+)(")', fix, html)
    # /foo/index.html and /foo are both /foo/ under trailingSlash: true
    html = re.sub(r'((?:href|src)="/[^"]*?)index\.html(")', r"\1\2", html)
    html = re.sub(r'href="(/(?:projects|experiences|documents)(?:/[a-z0-9]+)?)"', r'href="\1/"', html)
    return html


def map_links(html):
    """Point internal page links at their French counterparts."""
    def fix(m):
        pre, url, post = m.group(1), m.group(2), m.group(3)
        return pre + LINK_MAP.get(url, url) + post
    return re.sub(r'(<a[^>]*?\bhref=")([^"]+)(")', fix, html)


# ── Shared UI copy ──────────────────────────────────────────────────────────
COMMON = [
    ('aria-label="Open menu"', 'aria-label="Ouvrir le menu"'),
    ('aria-label="Main navigation"', 'aria-label="Navigation principale"'),
    ("Loading document…", "Chargement du document…"),
    ("✕ &nbsp;Close", "✕ &nbsp;Fermer"),
    ('data-cursor-marquee-text="View more →"', 'data-cursor-marquee-text="En savoir plus →"'),
    (">View more<", ">En savoir plus<"),
]

BACK_WORDS = {"BACK": "RETOUR"}


BACK_ANCHOR = re.compile(
    r'(<a\b[^>]*class="[^"]*(?:projects-back|exp-back|documents-back|proj-back)[^"]*"[^>]*>)(.*?)(</a>)',
    re.S)


def translate_common(html):
    for a, b in COMMON:
        html = html.replace(a, b)

    # The animated BACK link is a run of nested .nav-char spans that reaches the
    # end of the anchor, so rebuild everything after the arrow rather than
    # trying to match the nesting.
    def back(m):
        inner = m.group(2)
        cut = inner.find('<span class="nav-char">')
        if cut < 0:
            return m.group(0)
        return m.group(1) + inner[:cut] + chars("RETOUR") + m.group(3)

    return BACK_ANCHOR.sub(back, html, count=1)


# ── Per-page French copy ────────────────────────────────────────────────────
def fr_home(h):
    h = swap_nav_label(h, "info", "INFOS")
    h = swap_nav_label(h, "work", "RÉALISATIONS")
    h = swap_nav_label(h, "archive", "ARCHIVES")
    h = swap_nav_label(h, "contact", "CONTACT")
    h = swap_char_run(h, "hero-projects-cta", "PROJETS")
    h = swap_char_run(h, "hero-experiences-cta", "EXPÉRIENCES")
    for a, b in [
        ('<span class="mobile-menu-num">01</span> INFO', '<span class="mobile-menu-num">01</span> INFOS'),
        ('<span class="mobile-menu-num">02</span> WORK', '<span class="mobile-menu-num">02</span> RÉALISATIONS'),
        ('<span class="mobile-menu-num">03</span> ARCHIVE', '<span class="mobile-menu-num">03</span> ARCHIVES'),
    ]:
        h = h.replace(a, b)
    h = h.replace(
        """Websites, web apps and AI automations,
designed and built end to end.
Products that look sharp, load fast
and keep working for you and you only.""",
        """Sites, applis web et automatisations IA,
conçus et développés de A à Z.
Des produits soignés, rapides,
qui travaillent pour vous, et vous seul.""")
    h = h.replace("[SCROLL TO EXPLORE]", "[DÉFILEZ POUR EXPLORER]")
    h = h.replace('aria-hidden="true">About</h2>', 'aria-hidden="true">À propos</h2>')
    h = h.replace('<span id="portal-about">About</span>', '<span id="portal-about">À propos</span>')
    h = swap_text(h, "p", "Designer and developer building with AI", "Designer et développeur qui construit avec l'IA. Je conçois, code et mets en ligne des sites, des applications web et des automatisations — du premier écran au produit en ligne — pour des fondateurs, des petites entreprises et des agences.")
    h = swap_text(h, "h3", "Websites & Storefronts", "Sites & boutiques en ligne")
    h = swap_text(h, "p", "I design and build premium sites", "Je conçois et développe des sites haut de gamme en Webflow, Shopify et code sur mesure, avec des animations GSAP et de la 3D quand elles servent la marque. Le SEO, les métadonnées et la performance font partie du travail, pas d'une retouche à la fin.")
    h = swap_text(h, "h3", "Web Apps & SaaS", "Applications web & SaaS")
    h = swap_text(h, "p", "I turn an idea into a working product", "Je transforme une idée en produit qui fonctionne : interface, base de données, comptes, paiements. J'ai créé et je vends ma propre boutique de thèmes Shopify, Renderflow, et je développe avec Claude, Codex, Supabase et GitHub.")
    h = swap_text(h, "h3", "AI Automation", "Automatisation IA")
    h = swap_text(h, "p", "I find the repetitive work", "Je repère le travail répétitif d'une entreprise et je le confie à des automatisations et des agents IA construits avec n8n et Claude : gestion des prospects, contenu, rapports, outils internes. Moins de travail manuel, des réponses plus rapides.")
    h = swap_text(h, "h2", "03 — Archive", "03 — Archives")
    h = h.replace('aria-label="Concordia Project"', 'aria-label="Projet Concordia"')
    h = swap_text(h, "h3", "Concordia Project", "Projet Concordia")
    for a, b in [("[ APRIL 2026 ]", "[ AVRIL 2026 ]"), ("[ MARCH 2026 ]", "[ MARS 2026 ]"),
                 ("[ FEBRUARY 2026 ]", "[ FÉVRIER 2026 ]"), ("[ JANUARY 2026 ]", "[ JANVIER 2026 ]")]:
        h = h.replace(a, b)
    h = swap_text(h, "span", "Let's", "Collaborons")
    h = h.replace("<em>collaborate.</em>", "<em>ensemble.</em>")
    h = h.replace("© 2026 Antonin Le Cleï — All rights reserved", "© 2026 Antonin Le Cleï — Tous droits réservés")
    h = h.replace("More Documents →", "Plus de documents →")
    # ProfilePage JSON-LD describes the French page now
    h = h.replace('"url": "https://www.antoninleclei.com/",\n    "mainEntity"',
                  '"url": "https://www.antoninleclei.com/fr/",\n    "mainEntity"')
    h = h.replace('"jobTitle": "Designer & Developer",',
                  '"jobTitle": "Designer & développeur",')
    h = h.replace('"knowsAbout": ["Web Design", "Web Development", "Web Applications", "SaaS", "AI Automation", "n8n", "Supabase", "Webflow", "Shopify", "GSAP Animation", "SEO"]',
                  '"knowsAbout": ["Web design", "Développement web", "Applications web", "SaaS", "Automatisation IA", "n8n", "Supabase", "Webflow", "Shopify", "Animation GSAP", "SEO"]')
    return h


def fr_projects(h):
    h = swap_text(h, "p", "Projects", "Réalisations")
    h = h.replace("● IN PROGRESS", "● EN COURS")
    h = h.replace("Montreal &nbsp;·&nbsp; 2026", "Montréal &nbsp;·&nbsp; 2026")
    h = swap_text(h, "p", "AI voice agents that handle inbound calls",
                  "Des agents vocaux IA qui prennent les appels entrants des entreprises — sans intervention humaine.")
    h = swap_text(h, "p", "Multi-residential income property analysis",
                  "Analyse d'un immeuble à revenus multilogements.")
    h = h.replace("View Project", "Voir le projet")
    h = h.replace('data-cursor-marquee-text="View Project"', 'data-cursor-marquee-text="Voir le projet"')
    return h


def fr_fin210(h):
    h = h.replace("Real Estate", "Financement d'investissement").replace("Investment Financing", "immobilier")
    for a, b in [(">Course<", ">Cours<"), (">Team<", ">Équipe<"), (">Year<", ">Année<"),
                 ("John Molson School", "John Molson School"), ("FINA 210 — Finance", "FINA 210 — Finance")]:
        h = h.replace(a, b)
    h = swap_text(h, "p", "For this project, my two partners and I",
                  "Pour ce projet, mes deux coéquipiers et moi avons agi comme une équipe "
                  "d'investissement immobilier présentant une transaction réelle devant un jury de "
                  "professeurs. Nous avons sélectionné un immeuble à revenus multilogements situé au "
                  "4874–4896 rue Drolet, dans le Plateau-Mont-Royal à Montréal — un prix demandé de "
                  "2 685 000 $, entièrement loué et ne nécessitant aucune rénovation. L'objectif : "
                  "déterminer si l'acquisition générait un rendement ajusté au risque suffisant pour "
                  "les investisseurs en capitaux propres, et bâtir un dossier d'investissement solide "
                  "de A à Z.")
    h = swap_text(h, "p", "I led the financial modelling work",
                  "J'ai dirigé le volet modélisation financière. Nous avons construit sous Excel un "
                  "modèle DCF complet à trois scénarios — pessimiste, de base et optimiste — chacun "
                  "avec ses propres hypothèses de croissance des revenus, d'indexation des charges, de "
                  "conditions hypothécaires et de taux de capitalisation à la sortie. J'ai calculé les "
                  "TRI et VAN avec et sans levier pour chaque scénario, je les ai comparés à des taux "
                  "de rendement minimaux dérivés du CMPC et du coût des capitaux propres, puis j'ai "
                  "soumis le modèle à des tests de résistance face à une détérioration réaliste du "
                  "marché. Dans le scénario de base, l'investissement dégage un TRI avec levier de "
                  "11,73 % contre un seuil exigé de 8,27 %, soit une VAN avec levier positive de "
                  "+165 008 $.")
    h = swap_text(h, "p", "Beyond the numbers, we conducted",
                  "Au-delà des chiffres, nous avons mené une analyse rigoureuse du sous-marché du "
                  "Plateau-Mont-Royal — taux d'inoccupation, loyers moyens du marché, transactions "
                  "comparables et taux de capitalisation, mises en chantier et indicateurs "
                  "macroéconomiques, dont la trajectoire des taux du FOMC et l'inflation des loyers "
                  "mesurée par l'IPC canadien. Nous avons profilé en détail le locataire type du "
                  "quartier : niveaux de revenus, répartition par âge, scolarité et modes "
                  "d'occupation — autant d'éléments qui ont directement nourri nos hypothèses de "
                  "croissance des revenus et nos provisions pour inoccupation.")
    h = swap_text(h, "p", "We structured the deal as a limited partnership",
                  "Nous avons structuré la transaction en société en commandite avec une hypothèque de "
                  "premier rang à 65 %, 17,5 % de capitaux propres du commandité (notre équipe) et "
                  "17,5 % de capitaux propres de commanditaires externes — une capitalisation totale "
                  "de 2 738 700 $. Nous avons défini les conditions offertes aux investisseurs, "
                  "modélisé le paiement forfaitaire de l'année 5 et présenté le cadre complet "
                  "d'identification et d'atténuation des risques. Le livrable final : un deck "
                  "d'investisseurs de 21 diapositives et un rapport écrit en 10 sections, tous deux "
                  "téléchargeables ci-dessous.")
    return h


def fr_experiences(h):
    h = swap_text(h, "p", "05 — Experiences", "05 — Expériences")
    h = swap_text(h, "h1", "Experiences", "Expériences")
    h = swap_text(h, "p", "Scroll or drag to spin", "Faites défiler ou glissez pour faire tourner →")
    h = swap_text(h, "h3", "Internship in Web Design", "Stage en web design")
    h = swap_text(h, "p", "June 2026", "Juin 2026")
    h = h.replace(">Role title<", ">Intitulé du poste<").replace(">Company · Location<", ">Entreprise · Lieu<")
    return h


def fr_digitad(h):
    h = swap_text(h, "p", "Experience — Internship", "Expérience — Stage", required=False)
    h = h.replace("Experience — Internship", "Expérience — Stage")
    h = h.replace(">Internship in<", ">Stage en<").replace(">Web Design<", ">web design<")
    for a, b in [(">Company<", ">Entreprise<"), (">Role<", ">Poste<"), (">Date<", ">Date<"),
                 (">Location<", ">Lieu<"), ("Web Design Intern", "Stagiaire en web design"),
                 ("June 2026", "Juin 2026"), ("What I did", "Ce que j'ai fait"),
                 ("Tools &amp; skills", "Outils & compétences"), (">Outcome<", ">Résultat<"),
                 (">Gallery<", ">Galerie<"), ("Website Creation — Webflow", "Création de site — Webflow"),
                 ("Offsite Team Building", "Team building hors site"),
                 ("Website Integration — Shopify", "Intégration de site — Shopify"),
                 ("Wireframes / AI Automation", "Wireframes / automatisation IA")]:
        h = h.replace(a, b)
    h = swap_text(h, "p", "During my internship at Digitad",
                  "Durant mon stage chez Digitad, une agence de marketing montréalaise, je me suis "
                  "concentré sur l'intégration de contenu et sur la création d'automatisations rendant "
                  "cette intégration plus rapide et plus fiable sur l'ensemble des sites clients.")
    h = swap_text(h, "p", "I conceptualized wireframes",
                  "J'ai conçu des wireframes et je les ai présentés directement aux clients, avant de "
                  "les transformer en maquettes finalisées. J'ai imaginé et développé des sites complets "
                  "sur Webflow et Shopify, intégré du contenu dans les sites clients et mis en place des "
                  "flux d'intégration automatisés — transformant un processus manuel et répétitif en "
                  "chaîne de production fluide. J'ai travaillé avec toute la stack de l'agence pour "
                  "livrer des pages rapidement, sans sacrifier la qualité.")
    h = swap_text(h, "p", "I sharpened my command of AI-assisted",
                  "J'ai affûté ma maîtrise des workflows assistés par IA et des outils no-code et de "
                  "gestion de projet de l'agence :")
    h = swap_text(h, "p", "The automations cut down integration time",
                  "Les automatisations ont fortement réduit le temps d'intégration, permettant à "
                  "l'équipe de se concentrer sur le design et la stratégie. J'en suis ressorti à l'aise "
                  "avec la production assistée par IA, le développement no-code et la gestion de projet "
                  "en agence.")
    return h


def fr_documents(h):
    h = swap_text(h, "p", "Documents", "Documents")
    h = h.replace("Français &nbsp;·&nbsp; 2026", "Français &nbsp;·&nbsp; 2026")
    h = h.replace("English &nbsp;·&nbsp; 2026", "Anglais &nbsp;·&nbsp; 2026")
    h = h.replace(">View <", ">Voir <")
    h = h.replace('data-name="Curriculum Vitae — FR"', 'data-name="Curriculum Vitae — FR"')
    return h


def fr_archive(h):
    """Shared copy of the five archive case studies (still scaffolding)."""
    for a, b in [
        (">Type<", ">Type<"), (">Year<", ">Année<"), (">Date<", ">Date<"), (">Role<", ">Rôle<"),
        (">Web Design<", ">Web design<"), ("Design &amp; Build", "Design & développement"),
        ("— Student Web Design", "— web design étudiant"), ("— Brand & Web", "— marque & web"),
        ("— Web Design", "— web design"),
        ("Concordia Project", "Projet Concordia"),
        ("April 2026", "Avril 2026"), ("March 2026", "Mars 2026"),
        ("February 2026", "Février 2026"), ("January 2026", "Janvier 2026"),
        ("Case study</span>", "Étude de cas</span>"),
        ("Scroll and click inside the frame — it is the real site. Links and forms that would leave it are disabled.",
         "Fais défiler et clique dans le cadre — c'est le vrai site. Les liens et formulaires qui en sortiraient sont désactivés."),
        ("Scroll and click inside the frame — it is the real site. Links, forms and checkout are disabled.",
         "Fais défiler et clique dans le cadre — c'est le vrai site. Les liens, formulaires et le paiement sont désactivés."),
        ("Open full screen ↗", "Ouvrir en plein écran ↗"),
        ("— interactive site demo", "— démo interactive du site"),
        (">Coming <", ">Bientôt <"), ("<em>Soon</em>", "<em>disponible</em>"),
        ("Full write-up &amp; project details — launching shortly.",
         "Article complet & détails du projet — bientôt en ligne."),
        ("WRITE THE INTRO HERE — what the project is, who it was for, and what\n"
         "            problem it solved. Replace this paragraph.",
         "ÉCRIS L'INTRO ICI — ce qu'est le projet, pour qui, et le problème résolu.\n"
         "            Remplace ce paragraphe."),
        ("WRITE THE PROCESS HERE — the approach, the tools, the decisions that\n"
         "            shaped the result. Replace this paragraph.",
         "ÉCRIS LE PROCESSUS ICI — l'approche, les outils, les décisions qui ont\n"
         "            façonné le résultat. Remplace ce paragraphe."),
    ]:
        h = h.replace(a, b)
    return h


def fr_concordia(h):
    h = fr_archive(h)
    h = h.replace(
        """I was living in residence at Concordia University in Montreal when a friend
            studying journalism asked me to build him a website for his work. He wanted a
            proper home for his articles rather than scattered documents, and he came to me
            to design and build it.""",
        """Je vivais en résidence à l'Université Concordia, à Montréal, quand un ami étudiant
            en journalisme m'a demandé de lui créer un site pour son travail. Il voulait un
            vrai espace pour ses articles plutôt que des documents éparpillés, et il est venu
            me voir pour le concevoir et le développer.""")
    h = h.replace(
        """He set the brief: three pages, one for each of three articles, held together in
            a single site. I started by showing him a basic plan of the structure and layout
            so we agreed on the shape before anything was built. He came back with the
            changes he wanted, and I applied them directly, working through his notes until
            the site matched what he had in mind.""",
        """Il a posé le cadre : trois pages, une par article, réunies dans un même site. J'ai
            commencé par lui présenter un plan de base de la structure et de la mise en page,
            pour valider la forme avant de construire quoi que ce soit. Il est revenu avec les
            changements qu'il souhaitait, que j'ai appliqués directement, en reprenant ses
            retours jusqu'à ce que le site corresponde à ce qu'il avait en tête.""")
    return h


def fr_cincta(h):
    h = fr_archive(h)
    h = h.replace(
        """Cincta is an online jewelry brand that came to me for two things: their
            storefront and their logo. I modelled the logo in 3D in Blender and animated it,
            then integrated that animation straight into the page so it runs live in the
            browser rather than playing as a video. Listing products stayed on my side —
            whenever they had pieces to add, one or five at a time, they sent them over and
            I put them in.""",
        """Cincta est une marque de bijoux en ligne qui m'a contacté pour deux choses : leur
            boutique et leur logo. J'ai modélisé le logo en 3D sous Blender et je l'ai animé,
            puis j'ai intégré cette animation directement dans la page pour qu'elle tourne en
            direct dans le navigateur plutôt que d'être lue comme une vidéo. La mise en ligne
            des articles restait de mon côté : dès qu'ils avaient des pièces à ajouter, une ou
            cinq à la fois, ils me les envoyaient et je les intégrais.""")
    h = h.replace(
        """I opened with a site plan I had already built for an earlier e-commerce project.
            They liked the structure, so I quoted the website and the logo together. Once the
            plan was approved, I built the store from it.""",
        """J'ai commencé par leur présenter un plan de site que j'avais déjà réalisé pour un
            précédent projet e-commerce. La structure leur a plu, j'ai donc chiffré le site et
            le logo ensemble. Une fois le plan validé, j'ai construit la boutique à partir de
            celui-ci.""")
    return h


def fr_kh_nail_bar(h):
    h = fr_archive(h)
    h = h.replace(
        """While I was in Montreal, friends put me in touch with a nail artist who wanted a
            site of her own: somewhere to show her work as a portfolio, and somewhere clients
            could book an appointment with her directly. I built the site around her pieces,
            with booking as the thing every page leads to.""",
        """Pendant que j'étais à Montréal, des amis m'ont mis en contact avec une nail artist
            qui voulait son propre site : un endroit pour présenter son travail comme un
            portfolio, et où ses clientes pourraient prendre rendez-vous directement. J'ai
            construit le site autour de ses créations, la prise de rendez-vous étant le point
            d'arrivée de chaque page.""")
    h = h.replace(
        """There was no site plan and no brief on this one — I designed as I saw fit, and
            she took it or she didn't. She gave me no colour direction either, so I worked
            from the one signal I had: her Instagram, which reads clean and pared back. I
            took that as the palette and kept the site light. Her KH mark came from the same
            place — I pulled it from her profile, upscaled it, and made it the main logo of
            the site.""",
        """Ici, ni plan de site ni brief : j'ai conçu comme je l'entendais, à elle d'adhérer
            ou non. Elle ne m'avait donné aucune indication de couleurs non plus, alors je
            suis parti du seul signal disponible : son Instagram, à l'esthétique épurée. J'en
            ai tiré la palette et gardé un site clair. Son sigle KH vient du même endroit —
            je l'ai récupéré sur son profil, mis à l'échelle, et j'en ai fait le logo
            principal du site.""")
    return h


def fr_stingers(h):
    h = fr_archive(h)
    h = h.replace(
        """The Stingers are Concordia's varsity teams, and this one never shipped. While I
            was studying there I approached them and offered to redesign their sports site.
            Rather than pitch it in the abstract, I rebuilt the basketball roster first so
            they could see what I meant. They liked the work but had no time to take it on,
            so it stayed a concept.""",
        """Les Stingers sont les équipes universitaires de Concordia, et ce projet n'a jamais
            vu le jour. Pendant mes études là-bas, je les ai contactés en leur proposant de
            refondre leur site sportif. Plutôt que de le présenter dans l'abstrait, j'ai
            d'abord refait le roster de l'équipe de basketball pour montrer concrètement où je
            voulais aller. Ils ont apprécié le travail mais n'avaient pas le temps de le
            mettre en place : c'est resté un concept.""")
    h = h.replace(
        """I finished it on my own terms anyway. I took the player images from Concordia's
            existing basketball roster, rebuilt the listing with positions and player
            details, and set the whole thing in the team's own colours. It is a single page
            rather than a full site — but the roster was the part I most wanted to rethink.""",
        """Je l'ai terminé quand même, à ma façon. J'ai repris les photos des joueurs sur le
            roster de basketball existant de Concordia, reconstruit l'effectif avec les postes
            et les informations de chaque joueur, et posé le tout dans les couleurs de
            l'équipe. C'est une page unique plutôt qu'un site complet — mais le roster était
            la partie que je voulais le plus repenser.""")
    return h


def fr_cutsinnit(h):
    h = fr_archive(h)
    h = h.replace(
        """A friend from my residence ran a barber business out of it, cutting clients from
            across Montreal. He asked me for a portfolio of his work — somewhere people could
            see the cuts he offers and the prices, understand exactly what he does, and find
            him online in the first place.""",
        """Un ami de ma résidence y tenait son activité de barbier et coupait des clients de
            tout Montréal. Il m'a demandé un portfolio de son travail — un endroit où l'on
            puisse voir ses coupes et ses tarifs, comprendre exactement ce qu'il propose, et
            surtout le trouver sur Internet.""")
    h = h.replace(
        """The site answers that in one run: the work first, then the services and their
            prices, then booking. Rather than send people to a phone number, I built booking
            into the page against a set schedule — press Book and his actual availability
            comes up, so a client picks a slot and is done.""",
        """Le site répond à ça d'une traite : les réalisations d'abord, puis les prestations
            et leurs tarifs, puis la réservation. Plutôt que de renvoyer vers un numéro de
            téléphone, j'ai intégré la prise de rendez-vous à la page, adossée à un agenda
            défini — on appuie sur Book, ses disponibilités réelles s'affichent, le client
            choisit un créneau et c'est réglé.""")
    return h


TRANSLATORS = {
    "index.html": fr_home,
    "projects/concordia/index.html": fr_concordia,
    "projects/cincta/index.html": fr_cincta,
    "projects/kh-nail-bar/index.html": fr_kh_nail_bar,
    "projects/stingers/index.html": fr_stingers,
    "projects/cutsinnit/index.html": fr_cutsinnit,
    "projects/index.html": fr_projects,
    "projects/fin210/index.html": fr_fin210,
    "experiences/index.html": fr_experiences,
    "experiences/digitad/index.html": fr_digitad,
    "documents/index.html": fr_documents,
}


# ── Build ───────────────────────────────────────────────────────────────────
def main():
    for page in PAGES:
        src = ROOT / page["en"]
        html = src.read_text(encoding="utf-8")
        page_dir = posixpath.dirname(page["en"])

        # 1. English page, patched in place
        en = apply_head(html, page, "en")
        en = apply_switcher(en, page, "en")
        src.write_text(en, encoding="utf-8")

        # 2. French page
        fr = to_absolute(en, page_dir)
        fr = fr.replace('<html lang="en">', '<html lang="fr">')
        fr = apply_head(fr, page, "fr")
        fr = translate_common(fr)
        fr = TRANSLATORS[page["en"]](fr)
        fr = map_links(fr)
        # After map_links: it rewrites every internal link to its French
        # counterpart, which would also drag the switcher's English link over to
        # the French URL and leave no way back.
        fr = apply_switcher(fr, page, "fr")

        out = ROOT / page["fr"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(fr, encoding="utf-8")
        print(f"  {page['en']:<32} -> {page['fr']}")

    # 3. Sitemap with hreflang alternates
    urls = []
    for page in PAGES:
        if page.get("noindex"):
            continue  # keep placeholder pages out of the sitemap too
        prio = "1.0" if page["en_url"] == "/" else "0.8"
        for lang in ("en", "fr"):
            loc = SITE + page[f"{lang}_url"]
            alts = "".join(
                f'\n    <xhtml:link rel="alternate" hreflang="{h}" href="{SITE}{page[k]}" />'
                for h, k in (("en", "en_url"), ("fr", "fr_url"), ("x-default", "en_url"))
            )
            urls.append(
                f"  <url>\n    <loc>{loc}</loc>{alts}\n"
                f"    <changefreq>monthly</changefreq>\n    <priority>{prio}</priority>\n  </url>"
            )
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(urls) + "\n</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    print(f"  sitemap.xml -> {len(urls)} urls")


if __name__ == "__main__":
    main()
