// ========== INDEXEDDB SETUP ==========
const DB_NAME = 'MagicGameStoreDB';
const DB_VERSION = 1;
const STORE_NAME = 'likes';
const SHARE_STORE_NAME = 'shares';

// Ouvrir/initialiser IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store pour les likes
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const likeStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                likeStore.createIndex('contentId', 'contentId', { unique: false });
                console.log('✅ IndexedDB like store created');
            }
            
            // Store pour les partages
            if (!db.objectStoreNames.contains(SHARE_STORE_NAME)) {
                const shareStore = db.createObjectStore(SHARE_STORE_NAME, { keyPath: 'id' });
                shareStore.createIndex('contentId', 'contentId', { unique: false });
                console.log('✅ IndexedDB share store created');
            }
        };
    });
}

// ========== CONFIGURATION ==========
const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return 'https://magicgame.store/api';
})();

const CONTENT_ID = 'rp_a18_promo';
let currentLikeCount = 0;
let userHasLiked = false;
let currentShareCount = 0;

// ========== CHARGEMENT DES DONNÉES ==========
async function loadLikeState() {
    try {
        await fetchCounts();
        
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('contentId');
        
        const request = index.get(CONTENT_ID);
        
        request.onsuccess = () => {
            if (request.result) {
                userHasLiked = true;
                updateLikeButton(true);
            }
            db.close();
        };
    } catch (error) {
        console.error('Erreur chargement like:', error);
    }
}

// Récupérer les compteurs depuis le serveur
async function fetchCounts() {
    try {
        const response = await fetch(`${API_URL}/content/${CONTENT_ID}/stats`);
        const data = await response.json();
        currentLikeCount = data.likes || 0;
        currentShareCount = data.shares || 0;
        
        document.getElementById('likeCount').textContent = currentLikeCount;
        document.getElementById('shareCount').textContent = currentShareCount;
    } catch (error) {
        console.error('Erreur chargement compteurs:', error);
        document.getElementById('likeCount').textContent = '0';
        document.getElementById('shareCount').textContent = '0';
    }
}

// ========== GESTION DES LIKES ==========
async function saveLikeToIndexedDB() {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const likeData = {
            id: `${CONTENT_ID}_${Date.now()}`,
            contentId: CONTENT_ID,
            timestamp: Date.now(),
            sessionId: getSessionId()
        };
        
        store.add(likeData);
        
        transaction.oncomplete = () => {
            console.log('✅ Like sauvegardé dans IndexedDB');
            db.close();
        };
    } catch (error) {
        console.error('Erreur IndexedDB:', error);
    }
}

// Générer un ID de session
function getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// Mettre à jour le bouton like
function updateLikeButton(liked) {
    const likeBtn = document.getElementById('likeBtn');
    const likeIcon = document.getElementById('likeIcon');
    
    if (liked) {
        likeBtn.classList.add('liked');
        likeIcon.className = 'fa-solid fa-heart';
        likeBtn.disabled = true;
        likeBtn.style.opacity = '0.8';
        likeBtn.style.cursor = 'default';
    } else {
        likeBtn.classList.remove('liked');
        likeIcon.className = 'fa-regular fa-heart';
        likeBtn.disabled = false;
        likeBtn.style.opacity = '1';
        likeBtn.style.cursor = 'pointer';
    }
}

// Fonction pour gérer le like
async function handleLike() {
    if (userHasLiked) return;
    
    try {
        const response = await fetch(`${API_URL}/content/${CONTENT_ID}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: getSessionId() })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            userHasLiked = true;
            currentLikeCount = data.count;
            await saveLikeToIndexedDB();
            
            updateLikeButton(true);
            document.getElementById('likeCount').textContent = currentLikeCount;
        }
    } catch (error) {
        console.error('Erreur like:', error);
    }
}

// ========== GESTION DES PARTAGES ==========
async function saveShareToIndexedDB() {
    try {
        const db = await openDB();
        const transaction = db.transaction(SHARE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SHARE_STORE_NAME);
        
        const shareData = {
            id: `${CONTENT_ID}_share_${Date.now()}`,
            contentId: CONTENT_ID,
            timestamp: Date.now(),
            sessionId: getSessionId()
        };
        
        store.add(shareData);
        
        transaction.oncomplete = () => {
            console.log('✅ Partage sauvegardé dans IndexedDB');
            db.close();
        };
    } catch (error) {
        console.error('Erreur IndexedDB share:', error);
    }
}

// Incrémenter le compteur de partages
async function incrementShareCount() {
    try {
        const response = await fetch(`${API_URL}/content/${CONTENT_ID}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: getSessionId() })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentShareCount = data.count;
            document.getElementById('shareCount').textContent = currentShareCount;
            await saveShareToIndexedDB();
        }
    } catch (error) {
        console.error('Erreur incrémentation partage:', error);
    }
}

// Fonction de partage
async function handleShare() {
    const shareData = {
        title: 'Magic Game Store - RP A18',
        text: 'Pré-commande RP A18 à seulement 60UC ! 🔥',
        url: window.location.href
    };
    
    let shareSuccess = false;
    
    // Utiliser l'API Web Share si disponible (mobile)
    if (navigator.share) {
        try {
            await navigator.share(shareData);
            shareSuccess = true;
        } catch (error) {
            if (error.name !== 'AbortError') {
                shareSuccess = await fallbackShare();
            }
        }
    } else {
        shareSuccess = await fallbackShare();
    }
    
    // Si le partage a réussi, incrémenter le compteur
    if (shareSuccess) {
        await incrementShareCount();
    }
}

// Fallback pour desktop - copie le lien
async function fallbackShare() {
    try {
        await navigator.clipboard.writeText(window.location.href);
        
        // UNIQUE TOAST pour la copie du lien
        showShareToast('Lien copié dans le presse-papier !');
        
        return true;
    } catch (error) {
        console.error('Erreur copie:', error);
        return false;
    }
}

// Toast pour le partage
function showShareToast(message) {
    const oldToast = document.querySelector('.share-toast');
    if (oldToast) oldToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.innerHTML = `
        <i class="fa-solid fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}


// ========== GESTION DU BOUTON PRE-ORDER ==========
function setupPreOrderButton() {
    const preorderBtn = document.querySelector('.preorder-btn, .acheter');
    
    if (preorderBtn) {
        preorderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Récupérer les données du pack
            const pack = this.dataset.pack || '60 UC';
            const price = this.dataset.price || '5,000 Ar';
            
            // Sauvegarder dans localStorage
            localStorage.setItem('mode', 'uc');
            
            // Sauvegarder les informations de pré-commande
            const preorderData = {
                pack: pack,
                price: price,
                source: 'rp_promotion',
                timestamp: Date.now()
            };
            
            sessionStorage.setItem('rpPreorder', JSON.stringify(preorderData));
            
            // Afficher une notification
            if (typeof showGlobalToast === 'function') {
                showGlobalToast('Redirection vers le pack 60 UC...', 'info');
            } else if (typeof showShareToast === 'function') {
                showShareToast('Redirection vers le pack 60 UC...', 'info');
            }
            
            // Rediriger vers la page d'accueil
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        });
    }
}

// Appeler au chargement
document.addEventListener('DOMContentLoaded', function() {
    setupPreOrderButton();
    loadLikeState(); // Si vous avez cette fonction
});

// ========== BOTTOM NAVIGATION ==========
const bottomAchatLink = document.getElementById('bottomAchatLink');
const bottomAbonnementLink = document.getElementById('bottomAbonnementLink');

if (bottomAchatLink) {
    bottomAchatLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem('mode', 'uc');
        window.location.href = 'index.html';
    });
}

if (bottomAbonnementLink) {
    bottomAbonnementLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.setItem('mode', 'abonnements');
        window.location.href = 'index.html';
    });
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    loadLikeState();
    
    // Gestion du bouton Pre-Order
    const preorderBtn = document.querySelector('.acheter');
    if (preorderBtn) {
        preorderBtn.addEventListener('click', function() {
            localStorage.setItem('mode', 'uc');
            sessionStorage.setItem('preorderPack', JSON.stringify({
                pack: this.dataset.pack,
                price: this.dataset.price
            }));
            window.location.href = 'index.html';
        });
    }
});