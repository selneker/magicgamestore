// ===========================================
// ADMIN.JS - MAGIC GAME STORE
// ===========================================

let token = localStorage.getItem('adminToken');
let orders = [];
let autoRefreshInterval;
let adminOnline = true; // Statut admin par défaut

// ========== URL DYNAMIQUE ==========
const BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://magicgame.store';
})();

console.log('🌐 API URL:', BASE_URL);

// ========== NOTIFICATIONS ==========
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

// ========== ANIMATIONS ==========
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

// ========== AUTO-REFRESH ==========
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    
    autoRefreshInterval = setInterval(() => {
        console.log('🔄 Rafraîchissement auto...');
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
        console.log('⏹️ Auto-refresh arrêté');
    }
}

// ========== STATUT ADMIN SIMPLE ==========

// Initialiser le statut au chargement
function initAdminStatus() {
    const saved = localStorage.getItem('adminStatus');
    adminOnline = saved !== 'offline'; // 'online' par défaut
    
    const btn = document.getElementById('toggleAdminStatusBtn');
    const text = document.getElementById('adminStatusText');
    
    if (btn && text) {
        if (adminOnline) {
            btn.className = 'status-btn online';
            text.textContent = 'En ligne';
        } else {
            btn.className = 'status-btn offline';
            text.textContent = 'Hors ligne';
        }
    }
    
    // Sauvegarde initiale
    localStorage.setItem('adminStatus', adminOnline ? 'online' : 'offline');
}

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
    
    // Optionnel : envoi au serveur si tu veux
    // updateClientStatus(adminOnline);
}

// ========== BACKUP ==========
function backupData() {
    if (!confirm('💾 Créer une sauvegarde ?')) return;
    
    showNotification('📦 Création du backup...', 'info');
    
    fetch(`${BASE_URL}/api/admin/backup`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.error) {
            showNotification('❌ ' + data.error, 'error');
        } else {
            showNotification(`✅ Backup créé: ${data.count} commandes`, 'success');
        }
    })
    .catch(err => {
        console.error('❌ Erreur backup:', err);
        showNotification('❌ Erreur backup', 'error');
    });
}

// ========== EXPORT ==========
function exportData() {
    showNotification('📥 Préparation export...', 'info');
    
    fetch(`${BASE_URL}/api/admin/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
        showNotification('✅ Export terminé', 'success');
    })
    .catch(err => {
        console.error('❌ Erreur export:', err);
        showNotification(`❌ ${err.message}`, 'error');
    });
}

// ========== RESTORE ==========
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
                } else if (backupData.orders) {
                    ordersToRestore = backupData.orders;
                } else {
                    showNotification('❌ Format invalide', 'error');
                    return;
                }
                
                if (!confirm(`⚠️ Restaurer ${ordersToRestore.length} commandes ?`)) return;
                
                showNotification('📦 Restauration...', 'info');
                
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
                        showNotification(`✅ ${data.count} commandes restaurées`, 'success');
                        loadOrders();
                        loadStats();
                    }
                })
                .catch(err => {
                    console.error('❌ Erreur restauration:', err);
                    showNotification('❌ Erreur restauration', 'error');
                });
                
            } catch (error) {
                showNotification('❌ Fichier invalide', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    fileInput.click();
}

// ========== LOGS ==========
function showLogsPanel() {
    fetch(`${BASE_URL}/api/admin/debug/orders-log`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
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
            <h3>📋 Historique</h3>
            <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px;">&times;</button>
            <table style="width:100%">
                <thead><tr><th>Date</th><th>Action</th><th>Commande</th></tr></thead>
                <tbody>
                    ${data.logs.map(log => `
                        <tr>
                            <td>${new Date(log.timestamp).toLocaleString()}</td>
                            <td>${log.action}</td>
                            <td>#${log.orderId}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.body.appendChild(logModal);
    })
    .catch(err => {
        console.error('❌ Erreur logs:', err);
        showNotification('Erreur chargement logs', 'error');
    });
}

// ========== AUTH ==========
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            token = data.token;
            localStorage.setItem('adminToken', token);
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
            document.getElementById('adminEmail').textContent = data.user.email;
            
            // Mettre en ligne
            adminOnline = true;
            localStorage.setItem('adminStatus', 'online');
            
            loadOrders();
            loadStats();
            startAutoRefresh();
            showNotification('Connexion réussie', 'success');
        } else {
            document.getElementById('loginError').textContent = data.error || 'Erreur';
        }
    })
    .catch(err => {
        console.error('❌ Erreur:', err);
        document.getElementById('loginError').textContent = 'Erreur serveur';
    });
}

function logout() {
    // Mettre hors ligne
    adminOnline = false;
    localStorage.setItem('adminStatus', 'offline');
    
    stopAutoRefresh();
    localStorage.removeItem('adminToken');
    token = null;
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminSection').style.display = 'none';
    showNotification('Déconnexion réussie', 'success');
}

// ========== CHARGEMENT ==========
function loadOrders() {
    if (!token) return;

    fetch(`${BASE_URL}/api/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.status === 401) logout();
        return res.json();
    })
    .then(data => {
        orders = data;
        displayOrders(data);
    })
    .catch(err => console.error('❌ Erreur:', err));
}

function loadStats() {
    if (!token) return;

    fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('totalOrders').textContent = data.totalOrders || 0;
        document.getElementById('totalRevenue').textContent = (data.totalRevenue || 0).toLocaleString() + ' Ar';
        document.getElementById('pendingOrders').textContent = data.statusCount?.['en attente'] || 0;
        document.getElementById('deliveredOrders').textContent = data.statusCount?.['livré'] || 0;
    })
    .catch(err => console.error('❌ Erreur stats:', err));
}

// ========== COPIE ==========
window.copyToClipboard = function(text, type = '') {
    if (!text) {
        showNotification(`❌ Rien à copier`, 'error');
        return;
    }
    
    navigator.clipboard.writeText(text)
        .then(() => showNotification(`✅ ${type || 'Élément'} copié`, 'success'))
        .catch(() => fallbackCopy(text, type));
};

function fallbackCopy(text, type = '') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showNotification(`✅ ${type || 'Élément'} copié`, 'success');
}

// ========== AFFICHAGE ==========
function displayOrders(ordersToShow) {
    const tbody = document.getElementById('ordersBody');
    
    if (!ordersToShow || ordersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">Aucune commande</td></tr>';
        return;
    }

    tbody.innerHTML = ordersToShow.map(order => {
        let statusClass = '';
        switch(order.status) {
            case 'en attente': statusClass = 'status-en-attente'; break;
            case 'livré': statusClass = 'status-livré'; break;
            case 'annulé': statusClass = 'status-annulé'; break;
        }

        return `
        <tr>
            <td>#${order.id}</td>
            <td>${order.date ? new Date(order.date).toLocaleString() : ''}</td>
            <td>
                <span>${order.pubgId || ''}</span>
                <button onclick="copyToClipboard('${order.pubgId || ''}', 'ID')">📋</button>
            </td>
            <td>${order.pseudo || ''}</td>
            <td>${order.pack || ''}</td>
            <td>${order.price || ''}</td>
            <td>${order.paymentMethod || ''}</td>
            <td>
                <span>${order.reference || ''}</span>
                <button onclick="copyToClipboard('${order.reference || ''}', 'réf')">📋</button>
            </td>
            <td><span class="status-badge ${statusClass}">${order.status}</span></td>
            <td>
                ${order.status !== 'livré' ? 
                    `<button onclick="updateStatus(${order.id}, 'livré')">✓</button>` : ''}
                <button onclick="deleteOrder(${order.id})">🗑️</button>
            </td>
        </tr>
    `}).join('');
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
            o.pubgId?.toLowerCase().includes(search) ||
            o.pseudo?.toLowerCase().includes(search)
        );
    }
    
    if (status !== 'all') {
        filtered = filtered.filter(o => o.status === status);
    }
    
    displayOrders(filtered);
}

// ========== ACTIONS ==========
function updateStatus(orderId, newStatus) {
    if (!confirm('Confirmer ?')) return;

    fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(() => {
        loadOrders();
        loadStats();
        showNotification(`✅ Commande #${orderId} ${newStatus}`, 'success');
    })
    .catch(err => {
        console.error('❌ Erreur:', err);
        showNotification('❌ Erreur', 'error');
    });
}

function deleteOrder(orderId) {
    if (!confirm('Supprimer ?')) return;

    fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(() => {
        loadOrders();
        loadStats();
        showNotification(`✅ Commande supprimée`, 'success');
    })
    .catch(err => {
        console.error('❌ Erreur:', err);
        showNotification('❌ Erreur', 'error');
    });
}

function refreshOrders() {
    loadOrders();
    loadStats();
    showNotification('🔄 Actualisé', 'success');
}

// ========== INIT ==========
initAdminStatus();

if (token) {
    fetch(`${BASE_URL}/api/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
            
            // Mettre en ligne
            adminOnline = true;
            localStorage.setItem('adminStatus', 'online');
            
            loadOrders();
            loadStats();
            startAutoRefresh();
        } else {
            localStorage.removeItem('adminToken');
        }
    });
}