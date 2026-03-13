// ===========================================
// INDEX.JS - MAGIC GAME STORE
// ===========================================

// ========== SÉLECTION DES ÉLÉMENTS ==========
const tarifs = document.getElementById("tarifs");
const abonnements = document.getElementById("abonnements");
const aboLink = document.getElementById("aboLink");
const heroTitle = document.getElementById("heroTitle");
let mode = localStorage.getItem('mode') || 'uc';
let isAnimating = false; // AJOUTÉ

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

// ========== FONCTIONS D'ANIMATION ========== // AJOUTÉ

function animateElementOut(element) {
    return new Promise((resolve) => {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.95)';
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
            element.style.display = 'none';
            resolve();
        }, 300);
    });
}

function animateHeroTitle(newText) {
    heroTitle.style.opacity = '0';
    heroTitle.style.transform = 'scale(0.9)';
    heroTitle.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
        heroTitle.innerHTML = newText;
        heroTitle.style.opacity = '1';
        heroTitle.style.transform = 'scale(1)';
    }, 300);
}

// ========== GESTION DU NAVIGATION INDICATOR ==========
function updateNavIndicator() {
    const activeLink = document.querySelector('.bottom-nav-link.active');
    const indicator = document.querySelector('.nav-indicator');
    const nav = document.querySelector('main nav');
    
    if (!activeLink || !indicator || !nav) return;
    
    const parentLi = activeLink.closest('li');
    if (!parentLi) return;
    
    // Ajuster la largeur de l'indicateur (entre 50px et 70px)
    const linkWidth = activeLink.offsetWidth;
    const newWidth = Math.min(Math.max(linkWidth + 20, 50), 70);
    
    // Utiliser offsetLeft — indépendant du scroll, relatif au parent direct
    const liLeft = parentLi.offsetLeft;
    const liWidth = parentLi.offsetWidth;
    const centerOffset = (liWidth / 2) - (newWidth / 2);
    const leftPosition = liLeft + centerOffset;
    
    indicator.style.width = `${newWidth}px`;
    indicator.style.transform = `translateX(${leftPosition}px)`;
}

function animateNavIndicator() {
    const indicator = document.querySelector('.nav-indicator');
    if (!indicator) return;
    
    const currentTransform = indicator.style.transform;
    
    indicator.style.transform = `${currentTransform} scale(1.2)`;
    indicator.style.opacity = '0.8';
    
    setTimeout(() => {
        indicator.style.transform = currentTransform;
        indicator.style.opacity = '1';
    }, 200);
}

// ========== SWITCH UC / ABONNEMENTS AVEC ANIMATIONS ==========
async function showTarifs() {
    if (isAnimating) return;
    isAnimating = true;
    
    // Sauvegarder la position actuelle du scroll
    const scrollY = window.scrollY;
    
    // Animation de sortie pour abonnements
    await animateElementOut(abonnements);
    abonnements.classList.remove('active', 'fade-in');
    
    // Animation du Hero Title
    animateHeroTitle('VENTE UC<br>PUBG MOBILE');
    
    // Afficher et animer tarifs
    tarifs.style.display = 'block';
    tarifs.style.opacity = '0';
    tarifs.style.transform = 'translateX(-30px)';
    tarifs.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    setTimeout(() => {
        tarifs.style.opacity = '1';
        tarifs.style.transform = 'translateX(0)';
    }, 50);
    
    tarifs.classList.add('active');
    
    // Mise à jour du lien
    aboLink.innerHTML = '<i class="material-icons">subscriptions</i> Abonnement';
    
    // Mise à jour bottom nav
    if (bottomAchatLink) bottomAchatLink.classList.add('active');
    if (bottomAbonnementLink) bottomAbonnementLink.classList.remove('active');
    
    mode = 'uc';
    localStorage.setItem('mode', mode);
    
    // Mettre à jour l'indicateur AVANT le scroll — layout encore stable
    setTimeout(() => {
        requestAnimationFrame(() => {
            updateNavIndicator();
            animateNavIndicator();
            // Restaurer le scroll après le recalcul
            window.scrollTo(0, scrollY);
            isAnimating = false;
        });
    }, 500);
}

async function showAbonnements() {
    if (isAnimating) return;
    isAnimating = true;
    
    // Sauvegarder la position actuelle du scroll
    const scrollY = window.scrollY;
    
    // Animation de sortie pour tarifs
    await animateElementOut(tarifs);
    tarifs.classList.remove('active', 'fade-in');
    
    // Animation du Hero Title
    animateHeroTitle('ABONNEMENT<br>PUBG MOBILE');
    
    // Afficher et animer abonnements
    abonnements.style.display = 'block';
    abonnements.style.opacity = '0';
    abonnements.style.transform = 'translateX(30px)';
    abonnements.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    
    setTimeout(() => {
        abonnements.style.opacity = '1';
        abonnements.style.transform = 'translateX(0)';
    }, 50);
    
    abonnements.classList.add('active');
    
    // Mise à jour du lien
    aboLink.innerHTML = '<i class="fa-solid fa-dollar-sign"></i> Achat UC';
    
    // Mise à jour bottom nav
    if (bottomAchatLink) bottomAchatLink.classList.remove('active');
    if (bottomAbonnementLink) bottomAbonnementLink.classList.add('active');
    
    mode = 'abonnements';
    localStorage.setItem('mode', mode);
    
    // Mettre à jour l'indicateur AVANT le scroll — layout encore stable
    setTimeout(() => {
        requestAnimationFrame(() => {
            updateNavIndicator();
            animateNavIndicator();
            // Restaurer le scroll après le recalcul
            window.scrollTo(0, scrollY);
            isAnimating = false;
        });
    }, 500);
}

// ========== MODALES ==========
function openModal(modal) {
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    setTimeout(saveOrderState, 100);
    
    if (modal.id === 'modalPay') {
        // MVola par défaut
        currentMethod = 'mvola';
        setTimeout(() => {
            // Met à jour les boutons actifs
            const methodMvola = document.getElementById('methodMvola');
            const methodOrange = document.getElementById('methodOrange');
            if (methodMvola) methodMvola.classList.add('active');
            if (methodOrange) methodOrange.classList.remove('active');
            
            // Met à jour le numéro
            const methodData = paymentMethods['mvola'];
            document.getElementById('phoneNumber').textContent = methodData.phoneDisplay;
            document.getElementById('phoneName').textContent = `(${methodData.operator})`;
            
            initPaymentButton();
        }, 100);
    }
}

function closeAllModals() {
    modalInfo.style.display = 'none';
    modalPay.style.display = 'none';
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
        .then(() => showToast(`Numéro ${methodData.name} copié !`, 'success'))
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
        ussdCode: (price) => `#111*1*2*0383905692*${price}*1*0#`
    },
    orange: {
        name: 'Orange Money',
        phone: '0377519833',
        phoneDisplay: '037 75 198 33',
        operator: 'Selneker Dino',
        ussdCode: (price) => `#144*1*1*0377519833*0377519833*${price}*1#`
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
            showToast(`Commande #${data.orderId} enregistrée !`, 'success');
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

// ========== INITIALISATION ==========
document.addEventListener("DOMContentLoaded", () => {
    // 🔥 FORCER LA POSITION DE LA NAVBAR (AJOUTÉ)
    const mainNav = document.querySelector('main');
    if (mainNav) {
        mainNav.style.position = 'fixed';
        mainNav.style.bottom = '20px';
        mainNav.style.left = '50%';
        mainNav.style.transform = 'translateX(-50%)';
    }
    
    // Créer l'indicateur s'il n'existe pas
    if (!document.querySelector('.nav-indicator') && document.querySelector('main nav')) {
        const indicator = document.createElement('div');
        indicator.className = 'nav-indicator';
        document.querySelector('main nav').appendChild(indicator);
    }
    
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
    
    // Position initiale de l'indicateur
    setTimeout(updateNavIndicator, 300);
    setTimeout(updateNavIndicator, 600);
    
    // Observer les changements
    const observer = new MutationObserver(() => {
        updateNavIndicator();
    });
    
    document.querySelectorAll('.bottom-nav-link').forEach(link => {
        observer.observe(link, { attributes: true, attributeFilter: ['class'] });
    });
    
    window.addEventListener('resize', updateNavIndicator);
});

// ========== FONCTIONS GLOBALES ==========
window.copyNumber = copyNumber;
window.selectMethod = selectMethod;