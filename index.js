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

// ========== URL CORRIGÉE ==========
const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    // CORRECTION: magicgamestore (pas magicgamesstore) et avec /api/
    return 'https://magicgamestore.onrender.com/api';
})();

console.log('🌐 API URL:', API_URL); // Pour déboguer

// ===========================================
// INITIALISATION
// ===========================================
document.addEventListener("DOMContentLoaded", () => {
    // Appliquer le mode sauvegardé
    if (mode === 'abonnements') {
        showAbonnements();
    } else {
        showTarifs();
    }
    
    // Initialiser les écouteurs
    initEventListeners();
});

// ===========================================
// FONCTIONS DE SWITCH
// ===========================================
function showTarifs() {
    abonnements.style.display = 'none';
    abonnements.classList.remove('active', 'fade-in');
    
    // Animation titre
    heroTitle.classList.remove('fade-in');
    void heroTitle.offsetWidth;
    heroTitle.innerHTML = 'VENTE UC<br>PUBG MOBILE';
    heroTitle.classList.add('fade-in');
    
    // Afficher tarifs
    tarifs.style.display = 'block';
    tarifs.classList.add('active', 'fade-in');
    
    // Changer le texte du bouton
    aboLink.innerHTML = '<i class="fa-solid fa-cart-plus"></i> ABONNEMENT';
    mode = 'uc';
    localStorage.setItem('mode', mode);
    
    console.log('✅ Mode UC activé');
}

function showAbonnements() {
    tarifs.style.display = 'none';
    tarifs.classList.remove('active', 'fade-in');
    
    // Animation titre
    heroTitle.classList.remove('fade-in');
    void heroTitle.offsetWidth;
    heroTitle.innerHTML = 'ABONNEMENT<br>PUBG MOBILE';
    heroTitle.classList.add('fade-in');
    
    // Afficher abonnements
    abonnements.style.display = 'block';
    abonnements.classList.add('active', 'fade-in');
    
    // Changer le texte du bouton
    aboLink.innerHTML = '<i class="fa-solid fa-dollar-sign"></i> ACHAT UC';
    mode = 'abonnements';
    localStorage.setItem('mode', mode);
    
    console.log('✅ Mode Abonnement activé');
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
}

function closeAllModals() {
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Vider les inputs
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
    
    if (pubgId.length !== 11 || !/^\d+$/.test(pubgId)) {
        showToast('ID PUBG doit être 11 chiffres', 'error');
        return false;
    }
    
    return true;
}

// ===========================================
// ENVOI COMMANDE AU BACKEND
// ===========================================
function submitOrder() {
    const pubgId = pubgIdInput?.value.trim();
    const pseudo = pseudoInput?.value.trim();
    const pack = OrderPack?.textContent;
    const price = OrderPrice?.textContent;
    const reference = referenceInput?.value.trim();
    const paymentMethod = 'MVola';
    
    if (!pubgId || !pseudo || !reference) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (pubgId.length !== 11 || !/^\d+$/.test(pubgId)) {
        showToast('ID PUBG doit être 11 chiffres', 'error');
        return;
    }
    
    // Désactiver le bouton
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Envoi...';
    confirmBtn.classList.add('loading');
    
    console.log('📤 Envoi commande à:', `${API_URL}/order`);
    console.log('📦 Données:', { pubgId, pseudo, pack, price, paymentMethod, reference });
    
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
            reference
        })
    })
    .then(async res => {
        console.log('📥 Réponse status:', res.status);
        const text = await res.text();
        console.log('📥 Réponse texte:', text);
        
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('Réponse non-JSON: ' + text.substring(0, 100));
        }
    })
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
            const pack = btn.dataset.pack;
            const price = btn.dataset.price;
            
            OrderPack.textContent = pack;
            OrderPrice.textContent = price;
            
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
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Fermer en cliquant hors modale
    window.addEventListener('click', (e) => {
        if (e.target === modalInfo || e.target === modalPay) {
            closeAllModals();
        }
    });
}

// ===========================================
// EXPOSER LES FONCTIONS GLOBALES
// ===========================================
window.copyNumber = copyNumber;
