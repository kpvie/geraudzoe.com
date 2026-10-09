/*!
 * consentement.js : bandeau cookies + identifiant visiteur
 *
 * Principe :
 *  - Rien n'est suivi tant que le visiteur n'a pas fait un choix.
 *  - "Nécessaires" : toujours actifs (fonctionnement du site et de l'assistant).
 *  - "Mesure et suivi" : activé seulement si le visiteur accepte. Seul ce
 *    choix autorise la création de l'identifiant visiteur (visiteurId).
 *  - Si le visiteur refuse (ou retire son accord), visiteurId est supprimé.
 *
 * Installation : une seule ligne avant </body> sur CHAQUE page :
 *   <script src="../js/consentement.js" data-politique="../politique-confidentialite.html" defer></script>
 *
 * Lien pour rouvrir les choix (pied de page, par exemple) :
 *   <a href="#" data-ouvrir-cookies>Gérer mes cookies</a>
 *
 * API pour les autres scripts (suivi, assistant, formulaires) :
 *   Consentement.mesureAutorisee()   -> true / false
 *   Consentement.obtenirVisiteurId() -> identifiant, ou null sans consentement
 *   Consentement.surChangement(fn)   -> fn({ mesure }) à chaque changement de choix
 *   Consentement.ouvrir()            -> rouvre le bandeau
 */
(function () {
  "use strict";

  var CLE_CONSENTEMENT = "consentement_v1";
  var CLE_VISITEUR = "visiteurId";
  var VERSION = 1;          // à incrémenter si la politique change : le choix est redemandé
  var DUREE_MOIS = 12;      // durée de validité du choix

  var scriptCourant = document.currentScript;
  var URL_POLITIQUE =
    (scriptCourant && scriptCourant.getAttribute("data-politique")) ||
    "politique-confidentialite.html";

  var ecouteurs = [];

  // ---------- Stockage (tolérant aux navigateurs qui bloquent localStorage) ----------
  function lire() {
    try {
      var brut = localStorage.getItem(CLE_CONSENTEMENT);
      if (!brut) return null;
      var c = JSON.parse(brut);
      if (!c || c.version !== VERSION) return null;
      if (!c.expire || Date.now() > c.expire) return null;
      return c;
    } catch (e) {
      return null;
    }
  }

  function ecrire(mesure) {
    var expire = new Date();
    expire.setMonth(expire.getMonth() + DUREE_MOIS);
    var c = {
      version: VERSION,
      mesure: !!mesure,
      date: new Date().toISOString(),
      expire: expire.getTime(),
    };
    try {
      localStorage.setItem(CLE_CONSENTEMENT, JSON.stringify(c));
    } catch (e) {}
    return c;
  }

  // ---------- Identifiant visiteur ----------
  function genererId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function mesureAutorisee() {
    var c = lire();
    return !!(c && c.mesure);
  }

  function obtenirVisiteurId() {
    if (!mesureAutorisee()) return null;
    try {
      var id = localStorage.getItem(CLE_VISITEUR);
      if (!id) {
        id = genererId();
        localStorage.setItem(CLE_VISITEUR, id);
      }
      return id;
    } catch (e) {
      return null;
    }
  }

  function supprimerVisiteurId() {
    try {
      localStorage.removeItem(CLE_VISITEUR);
    } catch (e) {}
  }

  function appliquerChoix(mesure) {
    ecrire(mesure);
    if (mesure) obtenirVisiteurId();
    else supprimerVisiteurId();
    ecouteurs.forEach(function (fn) {
      try {
        fn({ mesure: !!mesure });
      } catch (e) {}
    });
    window.dispatchEvent(
      new CustomEvent("consentement:change", { detail: { mesure: !!mesure } })
    );
  }

  // ---------- Interface ----------
  var CSS =
    "#bandeau-cookies{position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;justify-content:center;padding:12px;font-family:inherit}" +
    "#bandeau-cookies .cc-boite{width:100%;max-width:760px;background:var(--marine,#0f1f3d);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);padding:20px 22px;max-height:90vh;overflow-y:auto}" +
    "#bandeau-cookies h2{margin:0 0 8px;font-size:1.1rem;line-height:1.3}" +
    "#bandeau-cookies p{margin:0 0 14px;font-size:.92rem;line-height:1.55;color:rgba(255,255,255,.88)}" +
    "#bandeau-cookies a{color:#9db7ff;text-decoration:underline}" +
    "#bandeau-cookies .cc-actions{display:flex;flex-wrap:wrap;gap:10px}" +
    "#bandeau-cookies button{font:inherit;font-weight:600;font-size:.92rem;padding:11px 18px;border-radius:10px;cursor:pointer;border:2px solid var(--accent,#2e5cff);background:var(--accent,#2e5cff);color:#fff;flex:1 1 140px}" +
    "#bandeau-cookies button.cc-secondaire{background:transparent;border-color:rgba(255,255,255,.45)}" +
    "#bandeau-cookies button.cc-lien{flex:0 1 auto;background:transparent;border-color:transparent;text-decoration:underline;color:#9db7ff;padding-left:6px;padding-right:6px}" +
    "#bandeau-cookies button:focus-visible,#bandeau-cookies input:focus-visible{outline:3px solid #ffd166;outline-offset:2px}" +
    "#bandeau-cookies .cc-details{display:none;margin:0 0 16px;border-top:1px solid rgba(255,255,255,.14)}" +
    "#bandeau-cookies .cc-details.ouvert{display:block}" +
    "#bandeau-cookies .cc-ligne{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.1)}" +
    "#bandeau-cookies .cc-ligne strong{display:block;margin-bottom:3px;font-size:.95rem}" +
    "#bandeau-cookies .cc-ligne span{font-size:.85rem;color:rgba(255,255,255,.75);line-height:1.45}" +
    "#bandeau-cookies input[type=checkbox]{width:22px;height:22px;margin-top:2px;flex:none;accent-color:var(--accent,#2e5cff)}" +
    "@media (max-width:480px){#bandeau-cookies{padding:8px}#bandeau-cookies .cc-boite{padding:16px}}";

  function injecterStyle() {
    if (document.getElementById("cc-style")) return;
    var s = document.createElement("style");
    s.id = "cc-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function fermer() {
    var b = document.getElementById("bandeau-cookies");
    if (b) b.remove();
  }

  function ouvrir() {
    fermer();
    injecterStyle();

    var courant = lire();
    var mesureCochee = courant ? courant.mesure : false;

    var racine = document.createElement("div");
    racine.id = "bandeau-cookies";
    racine.setAttribute("role", "dialog");
    racine.setAttribute("aria-modal", "false");
    racine.setAttribute("aria-labelledby", "cc-titre");

    racine.innerHTML =
      '<div class="cc-boite">' +
      '<h2 id="cc-titre">Tes choix sur les cookies</h2>' +
      "<p>Ce site utilise le stockage de ton navigateur. Une partie est nécessaire pour que le site et l'assistant fonctionnent. " +
      "Avec ton accord, j'enregistre aussi ta navigation (pages vues, vidéos lues, questions posées à l'assistant) " +
      "pour améliorer le site et pouvoir te recontacter si tu me laisses tes coordonnées. " +
      'Tu peux changer d\'avis à tout moment. <a href="' +
      URL_POLITIQUE +
      '">Politique de confidentialité</a>.</p>' +
      '<div class="cc-details" id="cc-details">' +
      '<div class="cc-ligne"><div><strong>Nécessaires</strong>' +
      "<span>Fonctionnement du site, mémorisation de ton choix, protection contre les abus de l'assistant. Toujours actifs.</span></div>" +
      '<input type="checkbox" checked disabled aria-label="Cookies nécessaires, toujours actifs"></div>' +
      '<div class="cc-ligne"><div><strong>Mesure et suivi</strong>' +
      "<span>Identifiant visiteur anonyme, pages vues, vidéos lues, questions posées à l'assistant, et lien avec tes coordonnées si tu les fournis.</span></div>" +
      '<input type="checkbox" id="cc-mesure" aria-label="Autoriser la mesure et le suivi"' +
      (mesureCochee ? " checked" : "") +
      "></div></div>" +
      '<div class="cc-actions">' +
      '<button type="button" id="cc-accepter">Tout accepter</button>' +
      '<button type="button" id="cc-refuser">Tout refuser</button>' +
      '<button type="button" class="cc-lien" id="cc-perso" aria-expanded="false" aria-controls="cc-details">Personnaliser</button>' +
      "</div></div>";

    document.body.appendChild(racine);

    var details = racine.querySelector("#cc-details");
    var boutonPerso = racine.querySelector("#cc-perso");
    var boutonAccepter = racine.querySelector("#cc-accepter");
    var boutonRefuser = racine.querySelector("#cc-refuser");
    var caseMesure = racine.querySelector("#cc-mesure");

    var enModePerso = false;

    boutonAccepter.addEventListener("click", function () {
      // En mode "Personnaliser", ce bouton enregistre l'état de la case.
      appliquerChoix(enModePerso ? caseMesure.checked : true);
      fermer();
    });
    boutonRefuser.addEventListener("click", function () {
      appliquerChoix(false);
      fermer();
    });

    boutonPerso.addEventListener("click", function () {
      if (!enModePerso) {
        enModePerso = true;
        details.classList.add("ouvert");
        boutonPerso.setAttribute("aria-expanded", "true");
        boutonAccepter.textContent = "Enregistrer mes choix";
        boutonPerso.style.display = "none";
        caseMesure.focus();
      }
    });
  }

  function init() {
    if (!lire()) ouvrir();
  }

  // Lien "Gérer mes cookies" n'importe où dans la page
  document.addEventListener("click", function (e) {
    var cible = e.target.closest && e.target.closest("[data-ouvrir-cookies]");
    if (cible) {
      e.preventDefault();
      ouvrir();
    }
  });

  window.Consentement = {
    mesureAutorisee: mesureAutorisee,
    obtenirVisiteurId: obtenirVisiteurId,
    surChangement: function (fn) {
      if (typeof fn === "function") ecouteurs.push(fn);
    },
    ouvrir: ouvrir,
  };

  // Si le choix existant autorise la mesure, on s'assure que l'identifiant existe.
  if (mesureAutorisee()) obtenirVisiteurId();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
