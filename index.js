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
    return 'https://magicgame.store/api';
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


// ========== PAIEMENT DIRECT MVOLA ==========
function generateUSSDCode(price, phoneNumber = '0383905692') {
    // Format: #111**1*2*0383905692*MONTANT*2*0#
    // price doit être un nombre sans virgule (ex: 8000)
    
    // Nettoyer le prix (enlever tout ce qui n'est pas chiffre)
    const cleanPrice = price.toString().replace(/[^0-9]/g, '');
    
    // Générer le code USSD
    const ussdCode = `#111**1*2*${phoneNumber}*${cleanPrice}*2*0#`;
    
    return ussdCode;
}

function generateReference() {
    // Générer une référence unique basée sur le timestamp
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `MGS${timestamp}${random}`;
}

function sendPaymentNotification(orderData) {
    // Envoyer la commande au serveur avec une référence générée automatiquement
    fetch(`${API_URL}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...orderData,
            reference: orderData.reference || 'Paiement direct',
            autoGenerated: true
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showToast('Erreur: ' + data.error, 'error');
        } else {
            showToast(`✅ Commande #${data.orderId} enregistrée !`, 'success');
        }
    })
    .catch(err => {
        console.error('Erreur:', err);
        showToast('❌ Erreur lors de l\'envoi', 'error');
    });
}

function initDirectPayment() {
    const payBtnContainer = document.getElementById('payBtnContainer');
    
    if (!payBtnContainer) return;
    
    // Récupérer les infos de la commande
    const pack = document.getElementById('OrderPack')?.textContent || '';
    const priceText = document.getElementById('OrderPrice')?.textContent || '';
    const pubgId = document.getElementById('pubgIdInput')?.value.trim() || '';
    const pseudo = document.getElementById('pseudoInput')?.value.trim() || '';
    
    // Extraire le prix (ex: "8,000 Ar" -> 8000)
    const priceNumber = priceText.replace(/[^0-9]/g, '');
    
    if (!priceNumber || priceNumber === '0') {
        payBtnContainer.innerHTML = '<p style="color: red;">Erreur de prix</p>';
        return;
    }
    
    // Générer le code USSD
    const ussdCode = generateUSSDCode(priceNumber);
    
    // Créer le bouton avec lien tel: direct
    payBtnContainer.innerHTML = `
        <a href="tel:${ussdCode}" 
           style="display: block; text-decoration: none; width: 100%;"
           onclick="handleDirectPaymentClick('${pack}', '${priceText}', '${pubgId}', '${pseudo}')">
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
        <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">
            Code: ${ussdCode}
        </p>
    `;
}

// Fonction appelée quand on clique sur le lien
window.handleDirectPaymentClick = function(pack, price, pubgId, pseudo) {
    console.log('📞 Paiement direct lancé');
    
    // Vérifier que l'ID PUBG et le pseudo sont remplis
    if (!pubgId || !pseudo || pubgId.length !== 11) {
        alert('❌ Veuillez d\'abord remplir vos informations (ID PUBG et pseudo)');
        return false; // Empêche le lien de s'ouvrir
    }
    
    // Générer une référence automatique
    const autoReference = generateReference();
    
    // Préparer les données de la commande
    const orderData = {
        pubgId: pubgId,
        pseudo: pseudo,
        pack: pack,
        price: price,
        paymentMethod: 'MVola (Direct)',
        reference: autoReference
    };
    
    // Envoyer la notification au serveur
    sendPaymentNotification(orderData);
    
    // Afficher un message
    showToast('📱 Code USSD lancé - Entrez votre code secret', 'success');
    
    // Retourner true pour que le lien s'ouvre
    return true;
};

// Modifier la fonction openModal pour initialiser le bouton
function openModal(modal) {
    modal.style.display = 'flex';
    modal.classList.remove('fade-in');
    void modal.offsetWidth;
    modal.classList.add('fade-in');
    document.body.style.overflow = 'hidden';
    
    if (modal.id === 'modalPay') {
        // Récupérer les valeurs des champs
        const pubgId = document.getElementById('pubgIdInput')?.value.trim() || '';
        const pseudo = document.getElementById('pseudoInput')?.value.trim() || '';
        
        // Stocker dans des attributs data pour y accéder plus tard
        modal.setAttribute('data-pubgid', pubgId);
        modal.setAttribute('data-pseudo', pseudo);
        
        // Initialiser le bouton de paiement
        setTimeout(initDirectPayment, 100);
    }
}

// Modifier submitOrder pour gérer le cas avec référence automatique
function submitOrder() {
    const pubgId = pubgIdInput?.value.trim();
    const pseudo = pseudoInput?.value.trim();
    const pack = OrderPack?.textContent;
    const price = OrderPrice?.textContent;
    const reference = referenceInput?.value.trim();
    const paymentMethod = 'MVola';
    
    if (!pubgId || !pseudo) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (pubgId.length !== 11 || !/^\d+$/.test(pubgId)) {
        showToast('ID PUBG doit être 11 chiffres', 'error');
        return;
    }
    
    // Si la référence est vide, demander confirmation
    if (!reference) {
        if (confirm('Aucune référence saisie. Voulez-vous quand même enregistrer la commande ?')) {
            // Procéder sans référence
        } else {
            return;
        }
    }
    
    // Désactiver le bouton
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Envoi...';
    confirmBtn.classList.add('loading');
    
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
            reference: reference || 'Paiement direct sans référence'
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
        console.error('Erreur:', err);
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
