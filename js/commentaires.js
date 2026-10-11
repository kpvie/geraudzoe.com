/**
 * ============WIDGET DE COMMENTAIRES — fichier unique,...======================
 */

(function () {
  // oooooooooiiiioioioioio
  const URL_API = "https://commentaires-api.kpoviessigeraude.workers.dev";

  const conteneur = document.getElementById("gz-commentaires");
  if (!conteneur) return; // widget absent de cette page, ...

  const pageId = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "") || "page-inconnue";

  // --- Injection du CSS, une seule fois même si le script est chargé
  //     plusieurs fois par erreur ---
  if (!document.getElementById("gz-commentaires-styles")) {
    const style = document.createElement("style");
    style.id = "gz-commentaires-styles";
    style.textContent = `
      .gz-commentaires-section { max-width: 720px; margin: 60px auto; padding: 0 20px; font-family: "Inter", sans-serif; }
      .gz-commentaires-titre { font-family: "Sora", "Inter", sans-serif; font-size: 1.5rem; margin-bottom: 24px; color: #10131a; }
      .gz-commentaires-liste { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
      .gz-commentaires-item { background: #f7f8fa; border: 1px solid rgba(16,19,26,0.09); border-radius: 12px; padding: 16px 18px; }
      .gz-commentaires-auteur { font-weight: 700; font-size: 0.92rem; color: #10131a; margin-bottom: 4px; }
      .gz-commentaires-date { font-weight: 400; color: #6b7280; font-size: 0.8rem; margin-left: 8px; }
      .gz-commentaires-texte { color: #4b5563; font-size: 0.95rem; line-height: 1.55; white-space: pre-wrap; }
      .gz-commentaires-vide { color: #6b7280; font-size: 0.92rem; font-style: italic; }
      .gz-commentaires-formulaire { display: flex; flex-direction: column; gap: 12px; background: #ffffff; border: 1px solid rgba(16,19,26,0.09); border-radius: 12px; padding: 20px; }
      .gz-commentaires-formulaire input, .gz-commentaires-formulaire textarea {
        font-family: inherit; font-size: 0.95rem; padding: 10px 12px; border: 1px solid rgba(16,19,26,0.15); border-radius: 8px; width: 100%; box-sizing: border-box;
      }
      .gz-commentaires-formulaire textarea { min-height: 90px; resize: vertical; }
      .gz-commentaires-bouton { align-self: flex-start; background: #2e5cff; color: #fff; border: none; font-weight: 600; font-size: 0.92rem; padding: 10px 22px; border-radius: 8px; cursor: pointer; transition: opacity 0.2s ease; }
      .gz-commentaires-bouton:hover { opacity: 0.9; }
      .gz-commentaires-bouton:disabled { opacity: 0.5; cursor: default; }
      .gz-commentaires-message { font-size: 0.88rem; margin-top: 4px; }
      .gz-commentaires-message.succes { color: #15803d; }
      .gz-commentaires-message.erreur { color: #b91c1c; }
      .gz-commentaires-piege { position: absolute; left: -9999px; opacity: 0; height: 0; }
    `;
    document.head.appendChild(style);
  }

  // --- HTML du widget ---
  conteneur.innerHTML = `
    <section class="gz-commentaires-section">
      <h2 class="gz-commentaires-titre">Commentaires</h2>
      <div class="gz-commentaires-liste" id="gz-liste">
        <p class="gz-commentaires-vide">Chargement des commentaires…</p>
      </div>
      <form class="gz-commentaires-formulaire" id="gz-formulaire">
        <input type="text" id="gz-nom" placeholder="Ton nom" maxlength="60" required>
        <textarea id="gz-texte" placeholder="Ton commentaire..." maxlength="800" required></textarea>
        <input type="text" id="gz-piege" name="site_web" class="gz-commentaires-piege" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button type="submit" class="gz-commentaires-bouton" id="gz-bouton">Publier le commentaire</button>
        <p class="gz-commentaires-message" id="gz-message"></p>
      </form>
    </section>
  `;

  const liste = document.getElementById("gz-liste");
  const formulaire = document.getElementById("gz-formulaire");
  const champNom = document.getElementById("gz-nom");
  const champTexte = document.getElementById("gz-texte");
  const champPiege = document.getElementById("gz-piege");
  const bouton = document.getElementById("gz-bouton");
  const message = document.getElementById("gz-message");

  function formaterDate(horodatageUnix) {
    const date = new Date(horodatageUnix * 1000);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  // IMPORTANT :  j'utilise toujours textContent, jamais innerHTML, pour
  // insérer le nom et le texte des visiteurs. Même si quelqu'un tente
  // de stocker du code malveillant, il s'affiche comme texte inoffensif,
  // il ne peut jamais s'exécuter dans le navigateur des autres visiteurs.....
  function construireCommentaire(item) {
    const bloc = document.createElement("div");
    bloc.className = "gz-commentaires-item";

    const auteur = document.createElement("div");
    auteur.className = "gz-commentaires-auteur";
    auteur.textContent = item.nom;

    const date = document.createElement("span");
    date.className = "gz-commentaires-date";
    date.textContent = formaterDate(item.cree_le);
    auteur.appendChild(date);

    const texte = document.createElement("div");
    texte.className = "gz-commentaires-texte";
    texte.textContent = item.texte;

    bloc.appendChild(auteur);
    bloc.appendChild(texte);
    return bloc;
  }

  async function chargerCommentaires() {
    try {
      const reponse = await fetch(`${URL_API}/commentaires?page=${encodeURIComponent(pageId)}`);
      const donnees = await reponse.json();

      liste.innerHTML = "";
      if (!donnees.commentaires || donnees.commentaires.length === 0) {
        liste.innerHTML = '<p class="gz-commentaires-vide">Aucun commentaire pour le moment. Sois le premier à donner ton avis !</p>';
        return;
      }
      donnees.commentaires.forEach((item) => liste.appendChild(construireCommentaire(item)));
    } catch {
      liste.innerHTML = '<p class="gz-commentaires-vide">Impossible de charger les commentaires pour le moment.</p>';
    }
  }

  formulaire.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();
    const nom = champNom.value.trim();
    const texte = champTexte.value.trim();

    message.textContent = "";
    message.className = "gz-commentaires-message";

    if (!nom || !texte) return;

    bouton.disabled = true;
    bouton.textContent = "Envoi...";

    try {
      const reponse = await fetch(`${URL_API}/commentaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_id: pageId,
          nom,
          texte,
          site_web: champPiege.value, // toujours vide pour un hum
        }),
      });

      const donnees = await reponse.json().catch(() => ({}));

      if (!reponse.ok) {
        throw new Error(donnees.error || "Une erreur est survenue.");
      }

      message.textContent = "Merci ! Votre commentaire va bientôt apparaître. Nous analysons pour détecter les spams et les contenus inappropriés.";
      message.classList.add("succes");
      formulaire.reset();

    } catch (erreur) {
      message.textContent = erreur.message;
      message.classList.add("erreur");
    } finally {
      bouton.disabled = false;
      bouton.textContent = "Publier le commentaire";
    }
  });

  chargerCommentaires();
})();
