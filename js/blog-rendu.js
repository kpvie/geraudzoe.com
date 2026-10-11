// blog-rendu.js — transforme un article (texte simple) en HTML sécurisé.
// Tout le texte est échappé avant la mise en forme : aucun HTML saisi n'est exécuté.
(function (global) {
  const POLICES = {
    sora: '"Sora","Inter",sans-serif',
    inter: '"Inter",sans-serif',
    playfair: '"Playfair Display",Georgia,serif',
    lora: '"Lora",Georgia,serif',
  };
  const MODELES = ["editorial", "magazine", "minimal"];
  const TAILLES = ["normale", "grande"];
  const FONDS = ["blanc", "creme", "sombre"];

  function echapper(texte) {
    return String(texte)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normaliserStyle(brut) {
    const s = brut && typeof brut === "object" ? brut : {};
    return {
      modele: MODELES.includes(s.modele) ? s.modele : "editorial",
      police: POLICES[s.police] ? s.police : "sora",
      taille: TAILLES.includes(s.taille) ? s.taille : "normale",
      fond: FONDS.includes(s.fond) ? s.fond : "blanc",
      accent: /^#[0-9a-fA-F]{6}$/.test(s.accent || "") ? s.accent : "#2e5cff",
    };
  }

  // Gras (**texte**), italique (*texte*) et liens ([texte](https://...))
  function mettreEnForme(texteEchappe) {
    return texteEchappe
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function ligneEnHtml(ligne) {
    return mettreEnForme(echapper(ligne));
  }

  function rendreContenu(texte) {
    return String(texte || "")
      .replace(/\r/g, "")
      .split(/\n\s*\n/)
      .map((bloc) => bloc.trim())
      .filter(Boolean)
      .map((bloc) => {
        const lignes = bloc.split("\n");
        if (/^### /.test(bloc)) return "<h3>" + ligneEnHtml(bloc.slice(4)) + "</h3>";
        if (/^## /.test(bloc)) return "<h2>" + ligneEnHtml(bloc.slice(3)) + "</h2>";
        if (lignes.every((l) => /^>\s?/.test(l))) {
          return "<blockquote>" + lignes.map((l) => ligneEnHtml(l.replace(/^>\s?/, ""))).join("<br>") + "</blockquote>";
        }
        if (lignes.every((l) => /^-\s/.test(l))) {
          return "<ul>" + lignes.map((l) => "<li>" + ligneEnHtml(l.slice(2)) + "</li>").join("") + "</ul>";
        }
        if (lignes.every((l) => /^\d+\.\s/.test(l))) {
          return "<ol>" + lignes.map((l) => "<li>" + ligneEnHtml(l.replace(/^\d+\.\s/, "")) + "</li>").join("") + "</ol>";
        }
        return "<p>" + lignes.map(ligneEnHtml).join("<br>") + "</p>";
      })
      .join("\n");
  }

  function formaterDate(secondes) {
    return new Date(secondes * 1000).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function rendreArticle(article, urlImage) {
    const s = normaliserStyle(article.style);
    const date = article.publie_le ? formaterDate(article.publie_le) : "Aperçu";
    const image = urlImage
      ? '<figure class="bl-image"><img src="' + echapper(urlImage) + '" alt="' + echapper(article.titre) + '"></figure>'
      : "";
    const entete =
      '<header class="bl-entete"><span class="bl-date">' + date + "</span><h1>" + echapper(article.titre || "") + "</h1>" +
      (article.resume ? '<p class="bl-resume">' + echapper(article.resume) + "</p>" : "") +
      "</header>";
    const haut = s.modele === "magazine" ? '<div class="bl-haut">' + entete + image + "</div>" : entete + image;

    return (
      '<article class="bl bl-' + s.modele + " bl-fond-" + s.fond + " bl-taille-" + s.taille +
      (urlImage ? "" : " bl-sans-image") +
      '" style="--bl-accent:' + s.accent + ";--bl-police:" + POLICES[s.police] + '">' +
      haut + '<div class="bl-corps">' + rendreContenu(article.contenu) + "</div></article>"
    );
  }

  global.BlogRendu = { rendreArticle, rendreContenu, echapper, formaterDate, normaliserStyle };
})(window);