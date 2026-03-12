let token = localStorage.getItem('adminToken');
let orders = [];
let autoRefreshInterval;
let adminOnline = true; // Déclaration globale déplacée au début

// ========== URL DYNAMIQUE ==========
const BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://magicgame.store';
})();

console.log('🌐 API URL:', BASE_URL);


// ========== TOAST GLOBAL POUR ADMIN ==========
function showAdminToast(message, type = 'success') {
    // Supprimer l'ancien toast
    const oldToast = document.querySelector('.admin-toast');
    if (oldToast) oldToast.remove();
    
    // Créer le nouveau toast
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    
    // Icône selon le type
    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'info') icon = 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    // Styles du toast (comme le site principal)
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--teirtly-color, #2C2C2C);
        color: var(--secondly-color, #ECECEC);
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        border: 1px solid rgba(0,122,255,0.3);
        animation: adminToastSlideIn 0.3s ease;
        max-width: 350px;
    `;
    
    document.body.appendChild(toast);
    
    // Disparaître après 3 secondes
    setTimeout(() => {
        toast.style.animation = 'adminToastSlideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Ajouter les animations CSS pour l'admin
const adminToastStyle = document.createElement('style');
adminToastStyle.textContent = `
    @keyframes adminToastSlideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes adminToastSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .admin-toast.success {
        border-color: #4CAF50 !important;
    }
    
    .admin-toast.success i {
        color: #4CAF50;
    }
    
    .admin-toast.error {
        border-color: #f44336 !important;
    }
    
    .admin-toast.error i {
        color: #f44336;
    }
    
    .admin-toast.info {
        border-color: #007aff !important;
    }
    
    .admin-toast.info i {
        color: #007aff;
    }
`;
document.head.appendChild(adminToastStyle);


// ========== FONCTIONS DE RAFRAÎCHISSEMENT AUTO ==========
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    autoRefreshInterval = setInterval(() => {
        console.log('Rafraîchissement auto des données...');
        if (token) {
            loadOrders();
            loadStats();
        }
    }, 60000); // ← Changé à 60 secondes
}

// ========== FONCTIONS DE SAUVEGARDE ==========

// Créer un backup
function backupData() {
    if (!confirm('Créer une sauvegarde des commandes ?')) return;
    
    showNotification('📦 Création du backup...', 'info');
    
    fetch(`${BASE_URL}/api/admin/backup`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.error) {
            showNotification('❌ ' + data.error, 'error');
        } else {
            showNotification(`✅ Backup créé: ${data.count} commandes`, 'success');
            console.log('📁 Backup:', data);
        }
    })
    .catch(err => {
        console.error('Erreur backup:', err);
        showNotification('Erreur lors du backup', 'error');
    });
}

// Exporter les données
function exportData() {
    showNotification('📥 Préparation de l\'export...', 'info');
    
    fetch(`${BASE_URL}/api/admin/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        console.log('📥 Réponse status export:', res.status);
        if (!res.ok) {
            if (res.status === 404) {
                throw new Error('Route export non trouvée');
            }
            throw new Error(`Erreur HTTP: ${res.status}`);
        }
        return res.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showNotification('Export terminé', 'success');
    })
    .catch(err => {
        console.error('Erreur export:', err);
        showNotification(`❌ ${err.message}`, 'error');
    });
}

// Restaurer les données
function restoreData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const backupData = JSON.parse(event.target.result);
                
                let ordersToRestore = [];
                if (Array.isArray(backupData)) {
                    ordersToRestore = backupData;
                } else if (backupData.orders && Array.isArray(backupData.orders)) {
                    ordersToRestore = backupData.orders;
                } else {
                    showNotification('Format de backup invalide', 'error');
                    return;
                }
                
                if (!confirm(`⚠️ Restaurer ${ordersToRestore.length} commandes ? Cette action écrasera les données actuelles.`)) {
                    return;
                }
                
                showNotification('📦 Restauration en cours...', 'info');
                
                fetch(`${BASE_URL}/api/admin/restore`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ backupData: { orders: ordersToRestore } })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        showNotification('❌ ' + data.error, 'error');
                    } else {
                        showNotification(`Restauration réussie: ${data.count} commandes`, 'success');
                        loadOrders();
                        loadStats();
                    }
                })
                .catch(err => {
                    console.error('Erreur restauration:', err);
                    showNotification('Erreur lors de la restauration', 'error');
                });
                
            } catch (error) {
                showNotification('Fichier de backup invalide', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// ========== FONCTIONS D'AFFICHAGE DES LOGS ==========
function showLogsPanel() {
    fetch(`${BASE_URL}/api/admin/debug/orders-log`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        console.log('Logs des commandes:', data);
        
        if (!data.logs || data.logs.length === 0) {
            alert('Aucun log trouvé');
            return;
        }
        
        const logModal = document.createElement('div');
        logModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10001;
            padding: 20px;
            overflow: auto;
        `;
        
        logModal.innerHTML = `
            <h3 style="margin-top: 0;">📋 Historique des actions</h3>
            <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 10px; text-align: left;">Date</th>
                        <th style="padding: 10px; text-align: left;">Action</th>
                        <th style="padding: 10px; text-align: left;">Commande</th>
                        <th style="padding: 10px; text-align: left;">Détails</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.logs.map(log => `
                        <tr style="border-bottom: 1px solid #ddd;">
                            <td style="padding: 8px;">${new Date(log.timestamp).toLocaleString()}</td>
                            <td style="padding: 8px;">
                                <span style="background: ${log.action === 'DELETE' ? '#f44336' : log.action === 'STATUS_UPDATE' ? '#ff9800' : '#4CAF50'}; color: white; padding: 3px 8px; border-radius: 3px;">
                                    ${log.action}
                                </span>
                            </td>
                            <td style="padding: 8px;">#${log.orderId}</td>
                            <td style="padding: 8px; max-width: 300px; overflow: auto;">
                                ${JSON.stringify(log.details || log.deletedOrder || '').substring(0, 50)}...
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.body.appendChild(logModal);
    })
    .catch(err => {
        console.error('Erreur chargement logs:', err);
        showNotification('Erreur chargement logs', 'error');
    });
}

// ========== FONCTIONS D'AUTHENTIFICATION ==========
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    console.log('📤 Tentative de connexion...');

    fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => {
        console.log('📥 Réponse status:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('📥 Données reçues:', data);
        
        if (data.token) {
            token = data.token;
            localStorage.setItem('adminToken', token);
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
            document.getElementById('adminEmail').textContent = data.user.email;
            
            // Mettre en ligne automatiquement
            adminOnline = true;
            localStorage.setItem('adminStatus', 'online');
            
            // Met à jour le bouton
            const btn = document.getElementById('toggleAdminStatusBtn');
            const text = document.getElementById('adminStatusText');
            if (btn && text) {
                btn.className = 'status-btn online';
                text.textContent = 'En ligne';
            }
            
            loadOrders();
            loadStats();
            startAutoRefresh();
            showNotification('Connexion réussie', 'success');
        } else {
            document.getElementById('loginError').textContent = data.error || 'Erreur de connexion';
            showNotification(data.error || 'Erreur de connexion', 'error');
        }
    })
    .catch(err => {
        console.error('Erreur fetch:', err);
        document.getElementById('loginError').textContent = 'Erreur de connexion au serveur';
        showNotification('Erreur de connexion au serveur', 'error');
    });
}

function logout() {
    // Mettre hors ligne avant de déconnecter
    adminOnline = false;
    localStorage.setItem('adminStatus', 'offline');
    
    stopAutoRefresh();
    localStorage.removeItem('adminToken');
    token = null;
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminSection').style.display = 'none';
    showNotification('Déconnexion réussie', 'success');
}

// ========== CHARGEMENT DES COMMANDES ==========
function loadOrders() {
    if (!token) {
        console.log('⛔ Pas de token');
        return;
    }

    console.log('📤 Chargement des commandes...');

    fetch(`${BASE_URL}/api/admin/orders`, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        console.log('📥 Réponse status:', res.status);
        
        if (res.status === 401 || res.status === 403) {
            console.log('⛔ Token invalide ou expiré');
            logout();
            showNotification('Session expirée - Veuillez vous reconnecter', 'error');
            throw new Error('Non autorisé');
        }
        
        if (!res.ok) {
            throw new Error(`Erreur HTTP: ${res.status}`);
        }
        
        return res.json();
    })
    .then(data => {
        console.log(`📥 Données reçues:`, data);
        
        if (Array.isArray(data)) {
            orders = data;
            displayOrders(data);
        } else {
            console.error('❌ Données non tableau:', data);
            orders = [];
            displayOrders([]);
        }
    })
    .catch(err => {
        console.error('❌ Erreur chargement commandes:', err);
        showNotification('Erreur chargement commandes', 'error');
        displayOrders([]);
    });
}


// ========== CHARGEMENT DES STATISTIQUES ==========
function loadStats() {
    if (!token) {
        console.log('⛔ Pas de token pour les stats');
        return;
    }

    console.log('📊 Chargement des statistiques...');

    fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        console.log('📥 Réponse stats status:', res.status);
        
        if (res.status === 401 || res.status === 403) {
            console.log('⛔ Token invalide pour les stats');
            return;
        }
        
        if (!res.ok) {
            throw new Error(`Erreur HTTP: ${res.status}`);
        }
        
        return res.json();
    })
    .then(data => {
        if (!data) return;
        
        console.log('📊 Stats reçues:', data);
        
        document.getElementById('totalOrders').textContent = data.totalOrders || 0;
        
        // Formatage du prix avec séparateur et alignement
        const revenue = (data.totalRevenue || 0).toLocaleString('fr-FR');
        document.getElementById('totalRevenue').innerHTML = `${revenue} <span style="font-size: 1rem; color: #ffffffa3;">Ar</span>`;
        
        document.getElementById('pendingOrders').textContent = data.statusCount?.['en attente'] || 0;
        document.getElementById('deliveredOrders').textContent = data.statusCount?.['livré'] || 0;
    })
    .catch(err => {
        console.error('❌ Erreur chargement stats:', err);
        showAdminToast('Erreur chargement statistiques', 'error');
    });
}


// ========== FONCTION DE COPIE ==========
function copyToClipboard(text, type = '') {
    if (!text) {
        showNotification(`❌ Aucun${type ? ' ' + type : ''} à copier`, 'error');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showNotification(`✅ ${type || 'Élément'} copié !`, 'success');
    }).catch((err) => {
        console.error('Erreur de copie:', err);
        fallbackCopy(text, type);
    });
}

function fallbackCopy(text, type = '') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showNotification(`✅ ${type || 'Élément'} copié ! (fallback)`, 'success');
    } catch (err) {
        showNotification(`❌ Erreur de copie`, 'error');
    }
    
    document.body.removeChild(textarea);
}


// ========== AFFICHAGE DES COMMANDES ==========
function displayOrders(ordersToShow) {
    const tbody = document.getElementById('ordersBody');
    
    if (!ordersToShow || !Array.isArray(ordersToShow)) {
        console.error('❌ Données invalides:', ordersToShow);
        tbody.innerHTML = '<tr><td colspan="11" class="loading">Erreur: Données invalides</td></tr>';
        return;
    }
    
    if (ordersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="loading">Aucune commande</td></tr>';
        return;
    }

    try {
        tbody.innerHTML = ordersToShow.map(order => {
            if (!order || typeof order !== 'object') return '';
            
            let statusClass = '';
            
            switch(order.status) {
                case 'en attente':
                    statusClass = 'status-en-attente';
                    break;
                case 'livré':
                    statusClass = 'status-livré';
                    break;
                case 'annulé':
                    statusClass = 'status-annulé';
                    break;
                default:
                    statusClass = 'status-en-attente';
            }
            
            // Formatage du prix : "21,000 Ar" sur une seule ligne
            const priceValue = order.price || '';
            // Si le prix est déjà formaté avec "Ar", on le garde tel quel
            // Sinon on ajoute "Ar" à la fin
            const priceFormatted = priceValue.includes('Ar') 
                ? `<span class="price-value">${priceValue.replace('Ar', '')}</span><span class="currency">Ar</span>`
                : `<span class="price-value">${priceValue}</span> <span class="currency">Ar</span>`;

            return `
            <tr class="${statusClass}">
                <td data-label="ID" style="text-align: right;">#${order.id || 'N/A'}</td>
                <td data-label="Date">${order.date ? new Date(order.date).toLocaleString() : 'N/A'}</td>
                <td data-label="ID PUBG">
                    <div class="copy-cell">
                        <span>${order.pubgId || ''}</span>
                        <button class="icon-btn copy-id-btn" 
                                onclick="copyToClipboard('${order.pubgId || ''}', 'ID')" 
                                title="Copier l'ID">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </td>
                <td data-label="Pseudo">${order.pseudo || ''}</td>
                <td data-label="Pack" style="white-space: nowrap;">${order.pack || ''}</td>
                <td data-label="Prix" style="text-align: right; white-space: nowrap;">${priceFormatted}</td>
                <td data-label="Paiement">${order.paymentMethod || ''}</td>
                <td data-label="Référence">
                    <div class="copy-cell">
                        <span>${order.reference || ''}</span>
                        <button class="icon-btn copy-ref-btn" 
                                onclick="copyToClipboard('${order.reference || ''}', 'référence')" 
                                title="Copier la référence">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </td>
                <td data-label="Statut">
                    <span class="status-badge ${statusClass}">
                        ${order.status || 'en attente'}
                    </span>
                </td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        ${order.status !== 'livré' ? 
                            `<button class="icon-btn deliver-btn" 
                                    onclick="updateStatus(${order.id}, 'livré')"
                                    title="Livrer">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                        ${order.status !== 'annulé' && order.status !== 'livré' ? 
                            `<button class="icon-btn cancel-btn" 
                                    onclick="updateStatus(${order.id}, 'annulé')"
                                    title="Annuler">
                                <i class="fas fa-times"></i>
                            </button>` : ''}
                        <button class="icon-btn delete-btn" 
                                onclick="deleteOrder(${order.id})"
                                title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    } catch (error) {
        console.error('❌ Erreur affichage:', error);
        tbody.innerHTML = '<tr><td colspan="11" class="loading">Erreur d\'affichage</td></tr>';
    }
}

// ========== FILTRES ==========
document.getElementById('searchInput')?.addEventListener('input', filterOrders);
document.getElementById('statusFilter')?.addEventListener('change', filterOrders);

function filterOrders() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    
    let filtered = orders;
    
    if (search) {
        filtered = filtered.filter(o => 
            (o.pubgId || '').toLowerCase().includes(search) ||
            (o.pseudo || '').toLowerCase().includes(search)
        );
    }
    
    if (status !== 'all') {
        filtered = filtered.filter(o => (o.status || 'en attente') === status);
    }
    
    displayOrders(filtered);
}

// ========== ACTIONS SUR LES COMMANDES ==========
function updateStatus(orderId, newStatus) {
    if (!confirm(`Confirmer le passage en "${newStatus}" ?`)) return;

    console.log(`📤 Changement statut commande #${orderId} vers ${newStatus}`);

    fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(res => {
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        return res.json();
    })
    .then(data => {
        console.log('✅ Statut mis à jour:', data);
        showNotification(`✅ Commande #${orderId} ${newStatus}`, 'success');
        loadOrders();
        loadStats();
    })
    .catch(err => {
        console.error('❌ Erreur mise à jour:', err);
        showNotification(`❌ Erreur: ${err.message}`, 'error');
    });
}

function deleteOrder(orderId) {
    if (!confirm('⚠️ SUPPRESSION DÉFINITIVE\n\nCette action est irréversible. Confirmer ?')) return;

    console.log(`🗑️ Tentative de suppression commande #${orderId}`);

    fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
        return res.json();
    })
    .then(data => {
        console.log('✅ Suppression réussie:', data);
        showNotification(`✅ Commande #${orderId} supprimée`, 'success');
        loadOrders();
        loadStats();
    })
    .catch(err => {
        console.error('❌ Erreur suppression:', err);
        showNotification(`❌ Erreur: ${err.message}`, 'error');
    });
}

function refreshOrders() {
    loadOrders();
    loadStats();
    showNotification('🔄 Données actualisées', 'success');
}

// ========== STATUT ADMIN - SIMPLE ==========

// Fonction pour basculer le statut (appelée par le bouton)
window.toggleAdminStatus = function() {
    adminOnline = !adminOnline;
    
    const btn = document.getElementById('toggleAdminStatusBtn');
    const text = document.getElementById('adminStatusText');
    
    if (adminOnline) {
        btn.className = 'status-btn online';
        text.textContent = 'En ligne';
        showNotification('✅ Admin en ligne', 'success');
    } else {
        btn.className = 'status-btn offline';
        text.textContent = 'Hors ligne';
        showNotification('📴 Admin hors ligne', 'info');
    }
    
    // Sauvegarde dans localStorage pour le client
    localStorage.setItem('adminStatus', adminOnline ? 'online' : 'offline');
    
    // Sauvegarde sur le serveur
    fetch(`${BASE_URL}/api/admin/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ online: adminOnline })
    }).catch(err => console.log('Statut sauvegardé sur serveur'));
}

// ========== VÉRIFICATION SESSION AU CHARGEMENT ==========
if (token) {
    console.log('🔑 Token trouvé, vérification...');
    fetch(`${BASE_URL}/api/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
            
            // Mettre en ligne automatiquement
            adminOnline = true;
            localStorage.setItem('adminStatus', 'online');
            
            // Met à jour le bouton
            const btn = document.getElementById('toggleAdminStatusBtn');
            const text = document.getElementById('adminStatusText');
            if (btn && text) {
                btn.className = 'status-btn online';
                text.textContent = 'En ligne';
            }
            
            loadOrders();
            loadStats();
            startAutoRefresh();
        } else {
            console.log('⛔ Token invalide');
            localStorage.removeItem('adminToken');
        }
    })
    .catch(err => console.error('❌ Erreur vérification token:', err));
}