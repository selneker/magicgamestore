// ===========================================
// INDEX.JS - MAGIC GAME STORE
// ===========================================

// ========== SÉLECTION DES ÉLÉMENTS ==========
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

// Boutons
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

// ========== URL API ==========
const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return 'https://magicgame.store/api';
})();

console.log('🌐 API URL:', API_URL);

// ========== STATUT ADMIN - VERSION SIMPLE ==========

function checkAdminStatus() {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    
    if (!dot || !text) return;
    
    // Requête simple pour savoir si admin est en ligne
    fetch(`${API_URL}/admin/status`)
        .then(res => res.json())
        .then(data => {
            if (data.online) {
                dot.className = 'status-dot online';
                text.textContent = 'Admin en ligne';
            } else {
                dot.className = 'status-dot offline';
                text.textContent = 'Admin hors ligne';
            }
        })
        .catch(() => {
            dot.className = 'status-dot offline';
            text.textContent = 'Serveur indisponible';
        });
}

// Vérifie toutes les 10 secondes (pas 2)
setInterval(checkAdminStatus, 10000);
checkAdminStatus(); // Vérifie au chargement

// ========== SAUVEGARDE DE SESSION ==========

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
        expiresAt: Date.now() + (30 * 60 * 1000)
    };
    
    localStorage.setItem('orderState', JSON.stringify(state));
}

function restoreOrderState() {
    const saved = localStorage.getItem('orderState');
    if (!saved) return null;
    
    try {
        const state = JSON.parse(saved);
        if (state.expiresAt && state.expiresAt < Date.now()) {
            localStorage.removeItem('orderState');
            return null;
        }
        return state;
    } catch {
        return null;
    }
}

function clearOrderState() {
    localStorage.removeItem('orderState');
}

// ========== INITIALISATION ==========
document.addEventListener("DOMContentLoaded", () => {
    if (mode === 'abonnements') {
        showAbonnements();
    } else {
        showTarifs();
    }
    
    const savedState = restoreOrderState();
    
    if (savedState && savedState.pack) {
        OrderPack.textContent = savedState.pack;
        OrderPrice.textContent = savedState.price;
        
        if (pubgIdInput) pubgIdInput.value = savedState.pubgId || '';
        if (pseudoInput) pseudoInput.value = savedState.pseudo || '';
        if (referenceInput) referenceInput.value = savedState.reference || '';
        
        showToast('🔄 Reprise de votre commande', 'info');
        
        setTimeout(() => {
            if (savedState.currentModal === 'pay') {
                openModal(modalPay);
            } else if (savedState.currentModal === 'info') {
                openModal(modalInfo);
            }
        }, 500);
    }
    
    initEventListeners();
});

// ========== SWITCH UC / ABONNEMENTS ==========

function showTarifs() {
    abonnements.style.display = 'none';
    abonnements.classList.remove('active', 'fade-in');
    
    // Animation du titre
    heroTitle.classList.remove('fade-in');
    void heroTitle.offsetWidth; // Force le reflow
    heroTitle.innerHTML = 'VENTE UC<br>PUBG MOBILE';
    heroTitle.classList.add('fade-in');
    
    // Animation des tarifs
    tarifs.style.display = 'block';
    tarifs.classList.remove('fade-in');
    void tarifs.offsetWidth; // Force le reflow
    tarifs.classList.add('active', 'fade-in');
    
    aboLink.innerHTML = '<i class="fa-solid fa-cart-plus"></i> ABONNEMENT';
    mode = 'uc';
    localStorage.setItem('mode', mode);
}

function showAbonnements() {
    tarifs.style.display = 'none';
    tarifs.classList.remove('active', 'fade-in');
    
    // Animation du titre
    heroTitle.classList.remove('fade-in');
    void heroTitle.offsetWidth;
    heroTitle.innerHTML = 'ABONNEMENT<br>PUBG MOBILE';
    heroTitle.classList.add('fade-in');
    
    // Animation des abonnements
    abonnements.style.display = 'block';
    abonnements.classList.remove('fade-in');
    void abonnements.offsetWidth;
    abonnements.classList.add('active', 'fade-in');
    
    aboLink.innerHTML = '<i class="fa-solid fa-dollar-sign"></i> ACHAT UC';
    mode = 'abonnements';
    localStorage.setItem('mode', mode);
}

// ========== MODALES ==========

function openModal(modal) {
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    setTimeout(saveOrderState, 100);
    
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
    if (referenceInput) {
        referenceInput.value = '';
        referenceInput.style.border = '';
        referenceInput.style.backgroundColor = '';
    }
    
    const helpText = document.getElementById('refHelp');
    if (helpText) helpText.remove();
    
    clearOrderState();
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

function copyNumber() {
    const number = '0383905692';
    navigator.clipboard.writeText(number)
        .then(() => showToast('Numéro copié !', 'success'))
        .catch(() => showToast('Erreur de copie', 'error'));
}

// ========== VALIDATION ==========

function validateOrder() {
    const pubgId = pubgIdInput?.value.trim();
    const pseudo = pseudoInput?.value.trim();
    
    if (!pubgId || !pseudo) {
        showToast('Veuillez remplir tous les champs', 'error');
        return false;
    }
    
    saveOrderState();
    return true;
}

function validatePubgId(pubgId) {
    if (!pubgId) return { valid: false, message: 'ID PUBG requis' };
    if (!/^\d+$/.test(pubgId)) return { valid: false, message: 'ID PUBG ne doit contenir que des chiffres' };
    if (pubgId.length < 5) return { valid: false, message: 'ID PUBG trop court (min 5)' };
    if (pubgId.length > 20) return { valid: false, message: 'ID PUBG trop long (max 20)' };
    return { valid: true };
}

// ========== PAIEMENT MVOLA ==========

function generateUSSDCode(price) {
    const cleanPrice = price.toString().replace(/[^0-9]/g, '');
    return `#111*1*2*0383905692*${cleanPrice}*2*0#`;
}

function initMvolaDirectButton() {
    const container = document.getElementById('payBtnContainer');
    if (!container) return;
    
    const priceText = OrderPrice?.textContent || '';
    const priceNumber = priceText.replace(/[^0-9]/g, '');
    
    if (!priceNumber || priceNumber === '0') {
        container.innerHTML = '<p style="color: red;">Erreur de prix</p>';
        return;
    }
    
    const ussdCode = generateUSSDCode(priceNumber);
    
    container.innerHTML = `
        <a href="tel:${ussdCode}" 
           style="display: block; text-decoration: none; width: 100%;">
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
                box-shadow: 0 4px 10px rgba(0,166,81,0.3);
            ">
                <i class="fa-solid fa-phone"></i> Payer ${priceText} avec MVola
            </button>
        </a>
    `;
}

// ========== ENVOI DE COMMANDE ==========

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
        showToast('Veuillez entrer la référence MVola', 'error');
        referenceInput.style.border = '2px solid #f44336';
        referenceInput.focus();
        
        setTimeout(() => {
            referenceInput.style.border = '';
        }, 3000);
        return;
    }
    
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Envoi...';
    confirmBtn.classList.add('loading');
    
    fetch(`${API_URL}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubgId, pseudo, pack, price, paymentMethod, reference })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showToast('Erreur : ' + data.error, 'error');
        } else {
            showToast(`✅ Commande #${data.orderId} enregistrée !`, 'success');
            clearOrderState();
            closeAllModals();
        }
    })
    .catch(() => showToast('❌ Impossible de contacter le serveur', 'error'))
    .finally(() => {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirmer';
        confirmBtn.classList.remove('loading');
    });
}

// ========== ÉCOUTEURS ==========

function initEventListeners() {
    if (aboLink) {
        aboLink.addEventListener("click", (e) => {
            e.preventDefault();
            mode === 'uc' ? showAbonnements() : showTarifs();
        });
    }
    
    acheterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            OrderPack.textContent = btn.dataset.pack;
            OrderPrice.textContent = btn.dataset.price;
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

// ========== FONCTIONS GLOBALES ==========
window.copyNumber = copyNumber;