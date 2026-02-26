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
// SAUVEGARDE DE SESSION AMÉLIORÉE
// ===========================================

/**
 * Sauvegarde l'état complet de la commande
 */
function saveOrderState() {
    const state = {
        pack: OrderPack?.textContent || '',
        price: OrderPrice?.textContent || '',
        pubgId: pubgIdInput?.value.trim() || '',
        pseudo: pseudoInput?.value.trim() || '',
        reference: referenceInput?.value.trim() || '',
        currentModal: modalInfo.style.display === 'flex' ? 'info' : 
                      modalPay.style.display === 'flex' ? 'pay' : 'none',
        timestamp: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
    
    localStorage.setItem('orderState', JSON.stringify(state));
    console.log('💾 État sauvegardé:', state.currentModal);
}

/**
 * Restaure l'état sauvegardé
 */
function restoreOrderState() {
    const saved = localStorage.getItem('orderState');
    
    if (!saved) return null;
    
    try {
        const state = JSON.parse(saved);
        
        // Vérifier l'expiration
        if (state.expiresAt && state.expiresAt < Date.now()) {
            console.log('⏰ État expiré');
            localStorage.removeItem('orderState');
            return null;
        }
        
        console.log('🔄 État restauré:', state.currentModal);
        return state;
        
    } catch (error) {
        console.error('❌ Erreur restauration:', error);
        localStorage.removeItem('orderState');
        return null;
    }
}

/**
 * Efface l'état sauvegardé
 */
function clearOrderState() {
    localStorage.removeItem('orderState');
    console.log('🗑️ État effacé');
}

// ===========================================
// INITIALISATION
// ===========================================
document.addEventListener("DOMContentLoaded", () => {
    // Appliquer le mode sauvegardé (UC ou Abonnements)
    if (mode === 'abonnements') {
        showAbonnements();
    } else {
        showTarifs();
    }
    
    // Restaurer l'état sauvegardé
    const savedState = restoreOrderState();
    
    if (savedState && savedState.pack) {
        // Restaurer les valeurs
        OrderPack.textContent = savedState.pack;
        OrderPrice.textContent = savedState.price;
        
        if (pubgIdInput) pubgIdInput.value = savedState.pubgId || '';
        if (pseudoInput) pseudoInput.value = savedState.pseudo || '';
        if (referenceInput) referenceInput.value = savedState.reference || '';
        
        // Afficher une notification
        showToast('🔄 Reprise de votre commande', 'info');
        
        // Ouvrir la bonne modale
        setTimeout(() => {
            if (savedState.currentModal === 'pay') {
                // Aller directement à la modale de paiement
                openModal(modalPay);
            } else if (savedState.currentModal === 'info') {
                // Ouvrir la modale d'information
                openModal(modalInfo);
            }
        }, 500);
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
    // Fermer l'autre modale d'abord
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
    
    // Ouvrir la modale demandée
    modal.style.display = 'flex';
    modal.classList.remove('fade-in');
    void modal.offsetWidth;
    modal.classList.add('fade-in');
    document.body.style.overflow = 'hidden';
    
    // Sauvegarder l'état après ouverture
    setTimeout(saveOrderState, 100);
    
    // Si c'est la modale de paiement, initialiser le bouton MVola direct
    if (modal.id === 'modalPay') {
        setTimeout(initMvolaDirectButton, 100);
    }
}

function closeAllModals() {
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Vider les inputs
    if (pubgIdInput) pubgIdInput.value = '';
    if (pseudoInput) pseudoInput.value = '';
    if (referenceInput) referenceInput.value = '';
    
    // Effacer l'état sauvegardé
    clearOrderState();
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
    
    // Sauvegarder après validation
    saveOrderState();
    
    return true;
}

// ===========================================
// FONCTIONS DE VALIDATION ID PUBG
// ===========================================

/**
 * Valide un ID PUBG (5-20 chiffres)
 */
function validatePubgId(pubgId) {
    if (!pubgId) return { valid: false, message: 'ID PUBG requis' };
    if (!/^\d+$/.test(pubgId)) return { valid: false, message: 'ID PUBG ne doit contenir que des chiffres' };
    if (pubgId.length < 5) return { valid: false, message: 'ID PUBG trop court (minimum 5 chiffres)' };
    if (pubgId.length > 20) return { valid: false, message: 'ID PUBG trop long (maximum 20 chiffres)' };
    return { valid: true };
}

// ===========================================
// FONCTIONS DE PAIEMENT DIRECT MVOLA AMÉLIORÉES
// ===========================================

/**
 * Génère le code USSD MVola pour un montant donné
 */
function generateUSSDCode(price) {
    const cleanPrice = price.toString().replace(/[^0-9]/g, '');
    // Version raw et encodée
    const rawCode = `#111*1*2*0383905692*${cleanPrice}*2*0#`;
    const encodedCode = encodeURIComponent(rawCode);
    return { raw: rawCode, encoded: encodedCode };
}

/**
 * Affiche une boîte de dialogue avec le code à composer
 */
function showManualCodeDialog(ussdCode, amount) {
    // Créer une modale temporaire
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 25px;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        z-index: 10001;
        text-align: center;
        max-width: 300px;
        width: 90%;
    `;
    
    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #00A651;">📞 Paiement MVola</h3>
        <p style="margin-bottom: 15px;">Composez ce code sur votre téléphone :</p>
        <div style="
            background: #f5f5f5;
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 1.2rem;
            font-weight: bold;
            margin: 15px 0;
            word-break: break-all;
        ">${ussdCode}</div>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 20px;">
            Montant: <strong>${amount} Ar</strong>
        </p>
        <div style="display: flex; gap: 10px;">
            <button onclick="copyToClipboardManual('${ussdCode}')" style="
                flex: 1;
                background: #2196F3;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
            ">
                📋 Copier
            </button>
            <button onclick="this.parentElement.parentElement.remove()" style="
                flex: 1;
                background: #ddd;
                color: #333;
                border: none;
                padding: 12px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
            ">
                Fermer
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Fonction de copie pour la modale manuelle
window.copyToClipboardManual = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Code copié ! Ouvrez votre application téléphone et composez-le.');
    }).catch(() => {
        alert('❌ Erreur de copie');
    });
};

/**
 * Initialise le bouton de paiement direct dans la modale
 */
function initMvolaDirectButton() {
    const container = document.getElementById('payBtnContainer');
    if (!container) return;
    
    const pack = OrderPack?.textContent || '';
    const priceText = OrderPrice?.textContent || '';
    const priceNumber = priceText.replace(/[^0-9]/g, '');
    
    if (!priceNumber || priceNumber === '0') {
        container.innerHTML = '<p style="color: red;">Erreur de prix</p>';
        return;
    }
    
    const { raw } = generateUSSDCode(priceNumber);
    
    // Créer un bouton au lieu d'un lien
    container.innerHTML = `
        <button onclick="handleMvolaDirectClick('${pack}', '${priceText}')" style="
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
            box-shadow: 0 4px 10px rgba(0,166,81,0.3);
        ">
            <i class="fa-solid fa-phone"></i> Payer ${priceText} avec MVola
        </button>
        <p style="font-size: 0.7rem; color: #999; margin-top: 5px; text-align: center;">
            Code: ${raw}
        </p>
    `;
}

/**
 * Fonction appelée quand on clique sur le bouton de paiement direct
 */
window.handleMvolaDirectClick = function(pack, price) {
    const pubgId = pubgIdInput?.value.trim();
    const pseudo = pseudoInput?.value.trim();
    
    if (!pubgId || !pseudo) {
        alert('❌ Veuillez remplir vos informations (ID PUBG et pseudo)');
        return false;
    }
    
    const validation = validatePubgId(pubgId);
    if (!validation.valid) {
        alert('❌ ' + validation.message);
        return false;
    }
    
    // Récupérer le montant
    const priceText = OrderPrice?.textContent || price;
    const priceNumber = priceText.replace(/[^0-9]/g, '');
    const { raw, encoded } = generateUSSDCode(priceNumber);
    
    // Détection du type d'appareil
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    console.log('📱 Appareil détecté:', isAndroid ? 'Android' : isIOS ? 'iOS' : 'Autre');
    console.log('📞 Code USSD:', raw);
    
    // Afficher une notification
    showToast('📱 Préparation du paiement MVola...', 'info');
    
    // Différentes méthodes selon l'appareil
    if (isAndroid) {
        // Pour Android: utiliser l'intent tel: avec le code encodé
        const intentUrl = `tel:${encoded}`;
        window.location.href = intentUrl;
        
        // Fallback si l'intent ne fonctionne pas
        setTimeout(() => {
            if (confirm('📞 Le code ne s\'est pas lancé automatiquement?\n\nVoulez-vous voir le code à composer manuellement?')) {
                showManualCodeDialog(raw, priceNumber);
            }
        }, 2000);
        
    } else if (isIOS) {
        // Pour iOS: afficher directement la boîte de dialogue
        showManualCodeDialog(raw, priceNumber);
    } else {
        // Pour les autres: essayer le lien direct
        window.location.href = `tel:${raw}`;
        setTimeout(() => {
            showManualCodeDialog(raw, priceNumber);
        }, 2000);
    }
    
    // Mettre le focus sur la référence après 10 secondes
    setTimeout(() => {
        referenceInput?.focus();
        showToast('💰 Entrez la référence reçue par SMS', 'success');
    }, 10000);
    
    return false; // Empêcher le comportement par défaut
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
    
    if (!pubgId || !pseudo) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (!reference) {
        showToast('Veuillez entrer la référence MVola reçue par SMS', 'error');
        referenceInput?.focus();
        return;
    }
    
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Envoi...';
    confirmBtn.classList.add('loading');
    
    console.log('📤 Envoi commande:', { pubgId, pseudo, pack, price, reference });
    
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
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showToast('Erreur : ' + data.error, 'error');
        } else {
            showToast(`✅ Commande #${data.orderId} enregistrée !`, 'success');
            clearOrderState(); // Effacer après achat réussi
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

// ========== VÉRIFICATION STATUT ADMIN AMÉLIORÉE ==========
async function checkAdminStatus() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (!statusDot || !statusText) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/status`, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        const data = await response.json();
        
        if (data.online) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Admin en ligne';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Admin hors ligne';
        }
    } catch (error) {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Serveur indisponible';
    }
}

// Version avec long polling (mise à jour instantanée)
async function longPollingStatus() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (!statusDot || !statusText) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/status/poll`, {
            method: 'GET',
            cache: 'no-cache'
        });
        
        const data = await response.json();
        
        if (data.online) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Admin en ligne';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Admin hors ligne';
        }
        
        // Relancer immédiatement pour la prochaine mise à jour
        longPollingStatus();
        
    } catch (error) {
        console.log('🔄 Reconnexion long polling...');
        // En cas d'erreur, attendre 2 secondes et réessayer
        setTimeout(longPollingStatus, 2000);
    }
}

// Démarrer le long polling au chargement
document.addEventListener('DOMContentLoaded', () => {
    longPollingStatus();
    
    // Garder aussi le polling normal comme fallback
    setInterval(checkAdminStatus, 30000);
});

// ===========================================
// ÉCOUTEURS D'ÉVÉNEMENTS
// ===========================================
function initEventListeners() {
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
    
    acheterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pack = btn.dataset.pack;
            const price = btn.dataset.price;
            
            OrderPack.textContent = pack;
            OrderPrice.textContent = price;
            
            openModal(modalInfo);
        });
    });
    
    if (closeInfo) closeInfo.addEventListener('click', closeAllModals);
    if (closeInfo2) closeInfo2.addEventListener('click', closeAllModals);
    if (closePay) closePay.addEventListener('click', closeAllModals);
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (!validateOrder()) return;
            modalInfo.style.display = 'none';
            openModal(modalPay);
        });
    }
    
    if (retourBtn) {
        retourBtn.addEventListener('click', () => {
            modalPay.style.display = 'none';
            openModal(modalInfo);
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', submitOrder);
    }
    
    // Sauvegarder l'état à chaque changement dans les inputs
    if (pubgIdInput) pubgIdInput.addEventListener('input', saveOrderState);
    if (pseudoInput) pseudoInput.addEventListener('input', saveOrderState);
    if (referenceInput) referenceInput.addEventListener('input', saveOrderState);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modalInfo || e.target === modalPay) closeAllModals();
    });
}

// ===========================================
// FONCTIONS GLOBALES
// ===========================================
window.copyNumber = copyNumber;