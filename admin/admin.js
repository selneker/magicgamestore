// ===========================================
// INDEX.JS - MAGIC GAME STORE
// ===========================================

// ========== SÉLECTION DES ÉLÉMENTS ==========
const tarifs = document.getElementById("tarifs");
const abonnements = document.getElementById("abonnements");
const aboLink = document.getElementById("aboLink");
const heroTitle = document.getElementById("heroTitle");
let mode = localStorage.getItem('mode') || 'uc';

// Nouveaux éléments pour le bottom nav
const bottomAchatLink = document.getElementById('bottomAchatLink');
const bottomAbonnementLink = document.getElementById('bottomAbonnementLink');

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

// ========== URL API ==========
const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return 'https://magicgame.store/api';
})();

console.log('🌐 API URL:', API_URL);

// ========== STATUT ADMIN ==========
function checkAdminStatus() {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    
    if (!dot || !text) return;
    
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

setInterval(checkAdminStatus, 10000);
checkAdminStatus();

// ========== TOAST GLOBAL UNIFIÉ ==========
function showGlobalToast(message, type = 'success') {
    // Supprimer l'ancien toast
    const oldToast = document.querySelector('.global-toast');
    if (oldToast) oldToast.remove();
    
    // Créer le nouveau toast
    const toast = document.createElement('div');
    toast.className = `global-toast ${type}`;
    
    // Icône selon le type
    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'info') icon = 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Disparaître après 2 secondes
    setTimeout(() => {
        toast.style.animation = 'toastSlideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Remplacer l'ancienne fonction pour compatibilité
const showToast = showGlobalToast;
window.showToast = showGlobalToast;

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

// ========== VÉRIFIER PRÉ-COMMANDE AU CHARGEMENT ==========
function checkPreorder() {
    const preorder = sessionStorage.getItem('rpPreorder');
    
    if (preorder) {
        try {
            const data = JSON.parse(preorder);
            console.log('📦 Pré-commande détectée:', data);
            
            // Attendre que la page soit complètement chargée
            setTimeout(() => {
                // Chercher le bouton du pack 60 UC
                const packBtn = document.querySelector('[data-pack="60 UC"]');
                
                if (packBtn) {
                    // Simuler un clic sur le bouton
                    packBtn.click();
                    
                    // Afficher une notification
                    if (typeof showGlobalToast === 'function') {
                        showGlobalToast('Pack 60 UC pré-sélectionné !', 'success');
                    }
                    
                    console.log('✅ Pack 60 UC ouvert automatiquement');
                } else {
                    console.error('❌ Bouton 60 UC non trouvé');
                    
                    // Fallback: chercher par le texte
                    const allButtons = document.querySelectorAll('.acheter');
                    for (let btn of allButtons) {
                        if (btn.textContent.includes('60 UC') || btn.dataset.pack === '60 UC') {
                            btn.click();
                            break;
                        }
                    }
                }
                
                // Nettoyer le sessionStorage
                sessionStorage.removeItem('rpPreorder');
                
            }, 1000); // Délai de 1 seconde
            
        } catch (error) {
            console.error('❌ Erreur pré-commande:', error);
            sessionStorage.removeItem('rpPreorder');
        }
    }
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
        
        showToast('Reprise de votre commande', 'info');
        
        setTimeout(() => {
            if (savedState.currentModal === 'pay') {
                openModal(modalPay);
            } else if (savedState.currentModal === 'info') {
                openModal(modalInfo);
            }
        }, 500);
    }
    
    // Vérifier les pré-commandes de la page événements
    checkPreorder();
    
    initEventListeners();
    setupKeyboardHandler();
});

// ========== SWITCH UC / ABONNEMENTS ==========
function showTarifs() {
    abonnements.style.display = 'none';
    abonnements.classList.remove('active', 'fade-in');
    
    heroTitle.classList.remove('fade-in');
    void heroTitle.offsetWidth;
    heroTitle.innerHTML = 'VENTE UC<br>PUBG MOBILE';
    heroTitle.classList.add('fade-in');
    
    tarifs.style.display = 'block';
    tarifs.classList.remove('fade-in');
    void tarifs.offsetWidth;
    tarifs.classList.add('active', 'fade-in');
    
    aboLink.innerHTML = '<i class="material-icons">subscriptions</i> Abonnement';
    
    if (bottomAchatLink) bottomAchatLink.classList.add('active');
    if (bottomAbonnementLink) bottomAbonnementLink.classList.remove('active');
    
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
    abonnements.classList.remove('fade-in');
    void abonnements.offsetWidth;
    abonnements.classList.add('active', 'fade-in');
    
    aboLink.innerHTML = '<i class="fa-solid fa-dollar-sign"></i> Achat UC';
    
    if (bottomAchatLink) bottomAchatLink.classList.remove('active');
    if (bottomAbonnementLink) bottomAbonnementLink.classList.add('active');
    
    mode = 'abonnements';
    localStorage.setItem('mode', mode);
}

// ========== MODALES ==========
function openModal(modal) {
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
    
    modal.style.display = 'flex';
    // Reset animation pour re-déclencher
    const container = modal.querySelector('.modalInfo-container, .modalPay-container');
    if (container) {
        container.classList.remove('closing');
        container.style.animation = 'none';
        requestAnimationFrame(() => {
            container.style.animation = '';
        });
    }
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    setTimeout(saveOrderState, 100);
    
    if (modal.id === 'modalPay') {
        currentMethod = 'mvola';
        setTimeout(() => {
            const methodMvola = document.getElementById('methodMvola');
            const methodOrange = document.getElementById('methodOrange');
            if (methodMvola) methodMvola.classList.add('active');
            if (methodOrange) methodOrange.classList.remove('active');
            
            const methodData = paymentMethods['mvola'];
            document.getElementById('phoneNumber').textContent = methodData.phoneDisplay;
            document.getElementById('phoneName').textContent = methodData.operator;
            
            initPaymentButton();
        }, 100);
    }
}

function closeAllModals() {
    // Animation de sortie avant de masquer
    const activeModal = modalInfo.style.display === 'flex' ? modalInfo : 
                        modalPay.style.display === 'flex' ? modalPay : null;
    
    if (activeModal) {
        const container = activeModal.querySelector('.modalInfo-container, .modalPay-container');
        if (container) {
            container.classList.add('closing');
            setTimeout(() => {
                activeModal.style.display = 'none';
                container.classList.remove('closing');
                _resetModals();
            }, 260);
            return;
        }
    }
    
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
    _resetModals();
}

function _resetModals() {
    document.body.style.overflow = 'auto';
    document.body.classList.remove('modal-open');
    modalInfo.classList.remove('keyboard-up');
    modalPay.classList.remove('keyboard-up');
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

function copyNumber() {
    const methodData = paymentMethods[currentMethod];
    const number = methodData.phone;
    
    navigator.clipboard.writeText(number)
        .then(() => {
            // Toast
            showToast(`Numéro copié !`, 'success');
            
            // Feedback visuel sur le bouton
            const btn = document.querySelector('.btn-copy');
            const numeroEl = document.getElementById('paymentNumber');
            
            if (btn) {
                const original = btn.textContent;
                btn.textContent = '✓ Copié';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 2000);
            }
            
            // Flash sur la carte numéro
            if (numeroEl) {
                numeroEl.classList.add('copied');
                setTimeout(() => numeroEl.classList.remove('copied'), 800);
            }
        })
        .catch(() => showToast('Erreur de copie', 'error'));
}

// ========== GESTION CLAVIER ==========
let activeModalForKeyboard = null;

function setupKeyboardHandler() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;
    
    const inputs = [pubgIdInput, pseudoInput, referenceInput];
    
    inputs.forEach(input => {
        if (!input) return;
        
        input.addEventListener('focus', () => {
            if (modalInfo.style.display === 'flex') {
                activeModalForKeyboard = modalInfo;
            } else if (modalPay.style.display === 'flex') {
                activeModalForKeyboard = modalPay;
            }
            
            if (activeModalForKeyboard) {
                activeModalForKeyboard.classList.add('keyboard-up');
                
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => {
                const activeElement = document.activeElement;
                if (!inputs.includes(activeElement)) {
                    if (modalInfo.style.display === 'flex') {
                        modalInfo.classList.remove('keyboard-up');
                    }
                    if (modalPay.style.display === 'flex') {
                        modalPay.classList.remove('keyboard-up');
                    }
                    activeModalForKeyboard = null;
                }
            }, 200);
        });
    });
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
    if (pubgId.length < 9) return { valid: false, message: 'ID PUBG trop court' };
    if (pubgId.length > 13) return { valid: false, message: 'ID PUBG trop long' };
    return { valid: true };
}

// ========== VARIABLES PAIEMENT ==========
let currentMethod = 'mvola';

// Informations de paiement
const paymentMethods = {
    mvola: {
        name: 'MVola',
        phone: '0383905692',
        phoneDisplay: '038 39 056 92',
        operator: 'Selneker Dino',
        ussdCode: (price) => `#111*1*2*0383905692*${price}*2*0#`
    },
    orange: {
        name: 'Orange Money',
        phone: '0377519833',
        phoneDisplay: '037 75 198 33',
        operator: 'Selneker Dino',
        ussdCode: (price) => `#144*1*1*0377519833*0377519833*${price}*2#`
    }
};

// ========== SÉLECTIONNER MÉTHODE ==========
function selectMethod(method) {
    currentMethod = method;
    
    console.log('✅ Méthode changée en:', currentMethod);
    
    document.getElementById('methodMvola').classList.toggle('active', method === 'mvola');
    document.getElementById('methodOrange').classList.toggle('active', method === 'orange');
    
    const methodData = paymentMethods[method];
    document.getElementById('phoneNumber').textContent = methodData.phoneDisplay;
    document.getElementById('phoneName').textContent = methodData.operator;
    
    initPaymentButton();
}

// ========== INITIALISER BOUTON PAIEMENT ==========
function initPaymentButton() {
    const container = document.getElementById('payBtnContainer');
    if (!container) return;
    
    const priceText = OrderPrice?.textContent || '';
    const priceNumber = priceText.replace(/[^0-9]/g, '');
    
    if (!priceNumber || priceNumber === '0') {
        container.innerHTML = '<p style="color: red;">Erreur de prix</p>';
        return;
    }
    
    const methodData = paymentMethods[currentMethod];
    const ussdCode = methodData.ussdCode(priceNumber);
    const btnClass = currentMethod === 'mvola' ? 'btn-mvola' : 'btn-orange';
    
    container.innerHTML = `
        <a href="tel:${ussdCode}">
            <button class="${btnClass}">
                Payer ${priceText} avec ${methodData.name}
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
    
    const paymentMethod = currentMethod === 'mvola' ? 'MVola' : 'Orange Money';
    
    console.log('📤 Méthode sélectionnée:', currentMethod);
    console.log('📤 PaymentMethod envoyé:', paymentMethod);
    
    if (!pubgId || !pseudo) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (!reference) {
        showToast('Veuillez entrer la référence', 'error');
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
    
    console.log('📤 Envoi commande:', { 
        pubgId, 
        pseudo, 
        pack, 
        price, 
        paymentMethod,
        reference 
    });
    
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
            clearOrderState();
            closeAllModals();
        }
    })
    .catch(() => showToast('Impossible de contacter le serveur', 'error'))
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
    
    if (bottomAchatLink) {
        bottomAchatLink.addEventListener('click', (e) => {
            e.preventDefault();
            showTarifs();
        });
    }
    
    if (bottomAbonnementLink) {
        bottomAbonnementLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAbonnements();
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
            // Slide-out vers la gauche
            const container = modalInfo.querySelector('.modalInfo-container');
            if (container) {
                container.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
                container.style.transform = 'translateX(-32px)';
                container.style.opacity = '0';
                setTimeout(() => {
                    container.style.transition = '';
                    container.style.transform = '';
                    container.style.opacity = '';
                    modalInfo.style.display = 'none';
                    openModal(modalPay);
                }, 200);
            } else {
                modalInfo.style.display = 'none';
                openModal(modalPay);
            }
        });
    }
    
    if (retourBtn) {
        retourBtn.addEventListener('click', () => {
            // Slide-out vers la droite
            const container = modalPay.querySelector('.modalPay-container');
            if (container) {
                container.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
                container.style.transform = 'translateX(32px)';
                container.style.opacity = '0';
                setTimeout(() => {
                    container.style.transition = '';
                    container.style.transform = '';
                    container.style.opacity = '';
                    modalPay.style.display = 'none';
                    openModal(modalInfo);
                }, 200);
            } else {
                modalPay.style.display = 'none';
                openModal(modalInfo);
            }
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