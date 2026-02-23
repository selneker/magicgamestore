// ===========================================
// SÉLECTION DES ÉLÉMENTS
// ===========================================
const tarifs = document.getElementById("tarifs");
const abonnements = document.getElementById("abonnements");
const aboLink = document.getElementById("aboLink");
const heroTitle = document.getElementById("heroTitle");
let mode = localStorage.getItem('mode') || 'uc';

// Modales
const modalInfo = document.getElementById('modalInfo');
const modalPay = document.getElementById('modalPay');
const OrderPack = document.getElementById('OrderPack');
const OrderPrice = document.getElementById('OrderPrice');

// Boutons modales
const acheterBtns = document.querySelectorAll('.acheter');
const closeInfo = document.getElementById('closeInfo');
const closeInfo2 = document.getElementById('closeInfo2');
const closePay = document.getElementById('closePay');
const nextBtn = document.getElementById('next');
const retourBtn = document.getElementById('retour');
const confirmBtn = document.getElementById('confirm');

// Inputs
const pubgIdInput = document.getElementById('pubgIdInput');
const pseudoInput = document.getElementById('pseudoInput');
const referenceInput = document.getElementById('referenceInput');

// Toast
const toast = document.getElementById('toast');

// ========== URL DE L'API ==========
const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return 'https://magicgame.store/api';
})();

console.log('🌐 API URL:', API_URL);

// ===========================================
// INITIALISATION
// ===========================================
document.addEventListener("DOMContentLoaded", () => {
    if (mode === 'abonnements') {
        showAbonnements();
    } else {
        showTarifs();
    }
    initEventListeners();
});

// ===========================================
// FONCTIONS DE SWITCH
// ===========================================
function showTarifs() {
    abonnements.style.display = 'none';
    abonnements.classList.remove('active', 'fade-in');
    
    heroTitle.classList.remove('fade-in');
    void heroTitle.offsetWidth;
    heroTitle.innerHTML = 'VENTE UC<br>PUBG MOBILE';
    heroTitle.classList.add('fade-in');
    
    tarifs.style.display = 'block';
    tarifs.classList.add('active', 'fade-in');
    
    aboLink.innerHTML = '<i class="fa-solid fa-cart-plus"></i> ABONNEMENT';
    mode = 'uc';
    localStorage.setItem('mode', mode);
}

function showAbonnements() {
    tarifs.style.display = 'none';
    tarifs.classList.remove('active', 'fade-in');
    
    heroTitle.classList.remove('fade-in');
    void heroTitle.offsetWidth;
    heroTitle.innerHTML = 'ABONNEMENT<br>PUBG MOBILE';
    heroTitle.classList.add('fade-in');
    
    abonnements.style.display = 'block';
    abonnements.classList.add('active', 'fade-in');
    
    aboLink.innerHTML = '<i class="fa-solid fa-dollar-sign"></i> ACHAT UC';
    mode = 'abonnements';
    localStorage.setItem('mode', mode);
}

// ===========================================
// FONCTIONS MODALES
// ===========================================
function openModal(modal) {
    modal.style.display = 'flex';
    modal.classList.remove('fade-in');
    void modal.offsetWidth;
    modal.classList.add('fade-in');
    document.body.style.overflow = 'hidden';
    
    // Si c'est la modale de paiement, initialiser le bouton MVola direct
    if (modal.id === 'modalPay') {
        setTimeout(initMvolaDirectButton, 100);
    }
}

function closeAllModals() {
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    if (pubgIdInput) pubgIdInput.value = '';
    if (pseudoInput) pseudoInput.value = '';
    if (referenceInput) referenceInput.value = '';
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function copyNumber() {
    const number = '0383905692';
    navigator.clipboard.writeText(number).then(() => {
        showToast('Numéro copié !', 'success');
    }).catch(() => {
        showToast('Erreur de copie', 'error');
    });
}

// ===========================================
// VALIDATION
// ===========================================
function validateOrder() {
    const pubgId = pubgIdInput?.value.trim();
    const pseudo = pseudoInput?.value.trim();
    
    if (!pubgId || !pseudo) {
        showToast('Veuillez remplir tous les champs', 'error');
        return false;
    }
    
    return true;
}

// ===========================================
// FONCTIONS DE PAIEMENT DIRECT MVOLA
// ===========================================

/**
 * Génère le code USSD MVola pour un montant donné
 * Format: #111**1*2*0383905692*MONTANT*2*0#
 */
function generateUSSDCode(price) {
    const cleanPrice = price.toString().replace(/[^0-9]/g, '');
    return `#111*1*2*0383905692*${cleanPrice}*2*0#`;
}

/**
 * Initialise le bouton de paiement direct dans la modale
 */
function initMvolaDirectButton() {
    const container = document.getElementById('payBtnContainer');
    if (!container) return;
    
    // Récupérer les infos
    const pack = OrderPack?.textContent || '';
    const priceText = OrderPrice?.textContent || '';
    const priceNumber = priceText.replace(/[^0-9]/g, '');
    
    if (!priceNumber || priceNumber === '0') {
        container.innerHTML = '<p style="color: red;">Erreur de prix</p>';
        return;
    }
    
    // Générer le code USSD
    const ussdCode = generateUSSDCode(priceNumber);
    
    // Créer le bouton (SANS afficher le code)
    container.innerHTML = `
        <a href="tel:${ussdCode}" 
           style="display: block; text-decoration: none; width: 100%;"
           onclick="return handleMvolaDirectClick('${pack}', '${priceText}')">
            <button style="
                background: #00A651;
                color: white;
                border: none;
                padding: 15px 20px;
                border-radius: 5px;
                font-weight: bold;
                font-size: 1.1rem;
                cursor: pointer;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.3s;
            ">
                <i class="fa-solid fa-phone"></i> Payer ${priceText} avec MVola
            </button>
        </a>
    `;
}

/**
 * Fonction appelée quand on clique sur le bouton de paiement direct
 */
window.handleMvolaDirectClick = function(pack, price) {
    // Vérifier que l'ID PUBG et le pseudo sont remplis
    const pubgId = pubgIdInput?.value.trim();
    const pseudo = pseudoInput?.value.trim();
    
    if (!pubgId || !pseudo) {
        alert('❌ Veuillez remplir vos informations (ID PUBG et pseudo)');
        return false;
    }
    
    if (pubgId.length !== 11 || !/^\d+$/.test(pubgId)) {
        alert('❌ L\'ID PUBG doit contenir 11 chiffres');
        return false;
    }
    
    // Message de confirmation
    showToast('📱 Code USSD lancé - Après paiement, entrez la référence reçue', 'success');
    
    // Mettre le focus sur le champ référence après 5 secondes
    setTimeout(() => {
        referenceInput?.focus();
    }, 5000);
    
    return true; // Permet l'ouverture du lien tel:
};

// ===========================================
// ENVOI DE COMMANDE
// ===========================================
function submitOrder() {
    const pubgId = pubgIdInput?.value.trim();
    const pseudo = pseudoInput?.value.trim();
    const pack = OrderPack?.textContent;
    const price = OrderPrice?.textContent;
    const reference = referenceInput?.value.trim();
    const paymentMethod = 'MVola';
    
    // Validation
    if (!pubgId || !pseudo) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    
    // La référence MVola est obligatoire
    if (!reference) {
        showToast('Veuillez entrer la référence MVola reçue par SMS', 'error');
        referenceInput?.focus();
        return;
    }
    
    // Désactiver le bouton
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Envoi...';
    confirmBtn.classList.add('loading');
    
    console.log('📤 Envoi commande:', { pubgId, pseudo, pack, price, reference });
    
    // Envoyer au backend
    fetch(`${API_URL}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pubgId,
            pseudo,
            pack,
            price,
            paymentMethod,
            reference // La vraie référence MVola de l'utilisateur
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showToast('Erreur : ' + data.error, 'error');
        } else {
            showToast(`✅ Commande #${data.orderId} enregistrée !`, 'success');
            closeAllModals();
        }
    })
    .catch(err => {
        console.error('❌ Erreur:', err);
        showToast('❌ Impossible de contacter le serveur', 'error');
    })
    .finally(() => {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirmer';
        confirmBtn.classList.remove('loading');
    });
}

// ===========================================
// ÉCOUTEURS D'ÉVÉNEMENTS
// ===========================================
function initEventListeners() {
    // Switch abonnements/uc
    if (aboLink) {
        aboLink.addEventListener("click", (e) => {
            e.preventDefault();
            if (mode === 'uc') {
                showAbonnements();
            } else {
                showTarifs();
            }
        });
    }
    
    // Boutons acheter
    acheterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            OrderPack.textContent = btn.dataset.pack;
            OrderPrice.textContent = btn.dataset.price;
            openModal(modalInfo);
        });
    });
    
    // Fermeture modales
    if (closeInfo) closeInfo.addEventListener('click', closeAllModals);
    if (closeInfo2) closeInfo2.addEventListener('click', closeAllModals);
    if (closePay) closePay.addEventListener('click', closeAllModals);
    
    // Passer à l'étape suivante
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (!validateOrder()) return;
            modalInfo.style.display = 'none';
            openModal(modalPay);
        });
    }
    
    // Retour
    if (retourBtn) {
        retourBtn.addEventListener('click', () => {
            modalPay.style.display = 'none';
            openModal(modalInfo);
        });
    }
    
    // Confirmer commande
    if (confirmBtn) {
        confirmBtn.addEventListener('click', submitOrder);
    }
    
    // Fermer modale avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });
    
    // Fermer en cliquant hors modale
    window.addEventListener('click', (e) => {
        if (e.target === modalInfo || e.target === modalPay) closeAllModals();
    });
}

// ===========================================
// FONCTIONS GLOBALES
// ===========================================
window.copyNumber = copyNumber;
