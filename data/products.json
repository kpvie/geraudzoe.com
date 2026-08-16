(function () {
  // ⚠️ Remplace par ta VRAIE clé PUBLIQUE KkiaPay (sans risque à exposer ici).
  // Ne mets JAMAIS ta Private Api Key ni ta Secret ici.
  const KKIAPAY_PUBLIC_KEY = 'COLLE_TA_CLE_PUBLIQUE_KKIAPAY_ICI';

  // ⚠️ Remplace par l'URL de ta fonction Netlify une fois déployée.
  // Exemple : https://ton-projet.netlify.app/.netlify/functions/check-status
  const CHECK_STATUS_URL = 'COLLE_ICI_URL_DE_TA_FONCTION_CHECK_STATUS';

  // Mets false une fois que tu es en argent réel (mode Live activé sur KkiaPay)
  const SANDBOX_MODE = true;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let pendingContext = null; // { productId, name, price, currency, formEl, buttonEl }

  // ── Détermine le chemin relatif vers data/products.json selon la page ──
  // (index.html à la racine vs pages dans /produits/)
  function resolveDataPath() {
    const depth = location.pathname.includes('/produits/') ? '../' : '';
    return depth + 'data/products.json';
  }

  // ── 1. Catalogue affiché sur la page d'accueil et /produits/index.html ──
  function initGrid() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    fetch(resolveDataPath())
      .then(res => res.json())
      .then(products => renderGrid(grid, products))
      .catch(err => {
        console.error('[products] Impossible de charger le catalogue :', err);
        grid.innerHTML = '<p>Le catalogue est momentanément indisponible.</p>';
      });
  }

  function renderGrid(grid, products) {
    grid.innerHTML = '';
    const depth = location.pathname.includes('/produits/') ? '' : '';
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <h3>${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <p class="product-price">${formatPrice(p.price, p.currency)}</p>
        <a href="${depth}${p.url}" class="btn primary-btn">Voir le produit</a>
      `;
      grid.appendChild(card);
    });
  }

  function formatPrice(amount, currency) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
  }

  // ── 2. Formulaires d'achat présents sur les pages produit individuelles ──
  function initBuyForms() {
    document.querySelectorAll('.buy-form').forEach(form => {
      form.addEventListener('submit', handleBuySubmit);
    });
  }

  function handleBuySubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;

    // Anti-robot : champ piège, invisible pour un humain, souvent rempli par les bots
    const honeypot = form.querySelector('.hp-field');
    if (honeypot && honeypot.value.trim() !== '') {
      console.warn('[products] Soumission bloquée (honeypot rempli)');
      return;
    }

    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!EMAIL_REGEX.test(email)) {
      showFormMessage(form, 'Merci de saisir une adresse email valide.', true);
      return;
    }

    const productId = form.dataset.productId;
    const name = form.dataset.productName;
    const price = Number(form.dataset.productPrice);
    const currency = form.dataset.productCurrency || 'XOF';

    if (!productId || !price) {
      showFormMessage(form, 'Erreur de configuration du produit. Contactez-nous.', true);
      return;
    }

    // Anti double-clic / double-paiement accidentel
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Ouverture du paiement...';
    }

    pendingContext = { productId, name, price, currency, formEl: form, buttonEl: submitBtn };

    if (typeof openKkiapayWidget !== 'function') {
      showFormMessage(form, "Le module de paiement n'est pas encore chargé, réessayez dans quelques secondes.", true);
      resetButton(submitBtn);
      return;
    }

    openKkiapayWidget({
      amount: price,
      key: KKIAPAY_PUBLIC_KEY,
      sandbox: SANDBOX_MODE,
      data: JSON.stringify({ productId, email })
    });
  }

  function resetButton(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  }

  function showFormMessage(form, message, isError) {
    let box = form.querySelector('.form-message');
    if (!box) {
      box = document.createElement('p');
      box.className = 'form-message';
      form.appendChild(box);
    }
    box.textContent = message;
    box.classList.toggle('form-message-error', !!isError);
  }

  // ── 3. Réaction au paiement (le widget confirme uniquement à l'écran ; ──
  //       la vraie livraison est toujours faite par le webhook côté serveur) ──
  async function handlePaymentSuccess(response) {
    const transactionId = response && response.transactionId;
    if (!transactionId || !pendingContext) return;

    const { formEl, buttonEl } = pendingContext;
    showFormMessage(formEl, 'Paiement reçu, vérification en cours...', false);

    try {
      const res = await fetch(CHECK_STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });
      const result = await res.json();

      if (result.status === 'success') {
        showFormMessage(
          formEl,
          'Merci pour votre achat ! Vérifiez votre boîte email (et vos spams) dans les prochaines minutes.',
          false
        );
        formEl.querySelectorAll('input, button').forEach(el => (el.disabled = true));
      } else {
        showFormMessage(
          formEl,
          'Paiement en cours de traitement. Vous recevrez un email automatiquement dès sa confirmation. ' +
          'Référence : ' + transactionId,
          false
        );
        resetButton(buttonEl);
      }
    } catch (err) {
      console.error('[products] Erreur de vérification :', err);
      showFormMessage(
        formEl,
        'Paiement reçu. En cas de non-réception de votre email sous 30 minutes, contactez-nous avec la référence : ' + transactionId,
        false
      );
      resetButton(buttonEl);
    }
  }

  function handlePaymentFailed() {
    if (!pendingContext) return;
    showFormMessage(pendingContext.formEl, "Le paiement n'a pas abouti. Vous pouvez réessayer.", true);
    resetButton(pendingContext.buttonEl);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initGrid();
    initBuyForms();

    if (typeof addSuccessListener === 'function') {
      addSuccessListener(handlePaymentSuccess);
    }
    if (typeof addFailedListener === 'function') {
      addFailedListener(handlePaymentFailed);
    }
  });
})();
