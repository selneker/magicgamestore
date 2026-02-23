let token = localStorage.getItem('adminToken');
let orders = [];
let autoRefreshInterval;

// ========== URL DYNAMIQUE ==========
const BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://magicgame.store';
})();

console.log('🌐 API URL:', BASE_URL);

// ========== FONCTIONS DE NOTIFICATION ==========
function showNotification(message, type = 'success') {
    const oldNotification = document.querySelector('.custom-notification');
    if (oldNotification) oldNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Ajouter les animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ========== FONCTIONS DE RAFRAÎCHISSEMENT AUTO ==========
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    autoRefreshInterval = setInterval(() => {
        console.log('🔄 Rafraîchissement auto des données...');
        if (token) {
            loadOrders();
            loadStats();
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('⏹️ Rafraîchissement auto arrêté');
    }
}

// ========== FONCTIONS DE SAUVEGARDE ==========

// Créer un backup
function backupData() {
    if (!confirm('💾 Créer une sauvegarde des commandes ?')) return;
    
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
        console.error('❌ Erreur backup:', err);
        showNotification('❌ Erreur lors du backup', 'error');
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
        
        showNotification('✅ Export terminé', 'success');
    })
    .catch(err => {
        console.error('❌ Erreur export:', err);
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
                    showNotification('❌ Format de backup invalide', 'error');
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
                        showNotification(`✅ Restauration réussie: ${data.count} commandes`, 'success');
                        loadOrders();
                        loadStats();
                    }
                })
                .catch(err => {
                    console.error('❌ Erreur restauration:', err);
                    showNotification('❌ Erreur lors de la restauration', 'error');
                });
                
            } catch (error) {
                showNotification('❌ Fichier de backup invalide', 'error');
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
        console.log('📋 Logs des commandes:', data);
        
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
        console.error('❌ Erreur chargement logs:', err);
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
            
            loadOrders();
            loadStats();
            startAutoRefresh();
            showNotification('✅ Connexion réussie', 'success');
        } else {
            document.getElementById('loginError').textContent = data.error || 'Erreur de connexion';
            showNotification(data.error || 'Erreur de connexion', 'error');
        }
    })
    .catch(err => {
        console.error('❌ Erreur fetch:', err);
        document.getElementById('loginError').textContent = 'Erreur de connexion au serveur';
        showNotification('Erreur de connexion au serveur', 'error');
    });
}

function logout() {
    stopAutoRefresh();
    localStorage.removeItem('adminToken');
    token = null;
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminSection').style.display = 'none';
    showNotification('👋 Déconnexion réussie', 'success');
}

// ========== CHARGEMENT DES DONNÉES ==========
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
        if (res.status === 401) {
            logout();
            throw new Error('Non autorisé');
        }
        return res.json();
    })
    .then(data => {
        console.log(`📥 ${data.length} commandes reçues`);
        orders = data;
        displayOrders(data);
    })
    .catch(err => console.error('❌ Erreur chargement commandes:', err));
}

function loadStats() {
    if (!token) return;

    fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        console.log('📊 Stats:', data);
        document.getElementById('totalOrders').textContent = data.totalOrders || 0;
        document.getElementById('totalRevenue').textContent = (data.totalRevenue || 0).toLocaleString() + ' Ar';
        document.getElementById('pendingOrders').textContent = data.statusCount?.['en attente'] || 0;
        document.getElementById('deliveredOrders').textContent = data.statusCount?.['livré'] || 0;
    })
    .catch(err => console.error('❌ Erreur chargement stats:', err));
}

// ========== AFFICHAGE DES COMMANDES ==========
function displayOrders(ordersToShow) {
    const tbody = document.getElementById('ordersBody');
    
    if (!ordersToShow || ordersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="loading">Aucune commande</td></tr>';
        return;
    }

    tbody.innerHTML = ordersToShow.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${new Date(order.date).toLocaleString()}</td>
            <td>${order.pubgId || ''}</td>
            <td>${order.pseudo || ''}</td>
            <td>${order.pack || ''}</td>
            <td>${order.price || ''}</td>
            <td>${order.paymentMethod || ''}</td>
            <td>${order.reference || ''}</td>
            <td>
                <span class="status-badge status-${(order.status || 'en attente').replace(' ', '-')}">
                    ${order.status === 'en attente' ? '⏳ En attente' : 
                      order.status === 'livré' ? '✅ Livré' : 
                      order.status === 'annulé' ? '❌ Annulé' : order.status}
                </span>
            </td>
            <td>
                ${order.status !== 'livré' ? 
                    `<button class="action-btn deliver-btn" onclick="updateStatus(${order.id}, 'livré')">
                        ✓ Livrer
                    </button>` : ''}
                ${order.status !== 'annulé' && order.status !== 'livré' ? 
                    `<button class="action-btn cancel-btn" onclick="updateStatus(${order.id}, 'annulé')" style="background: #ff9800;">
                        ✗ Annuler
                    </button>` : ''}
                <button class="action-btn delete-btn" onclick="deleteOrder(${order.id})">
                    🗑️ Suppr
                </button>
            </td>
        </tr>
    `).join('');
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
