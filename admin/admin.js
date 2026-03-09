let token = localStorage.getItem('adminToken');
let orders = [];
let autoRefreshInterval;
let adminOnline = true;

// ========== URL DYNAMIQUE ==========
const BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://magicgame.store';
})();

console.log('🌐 API URL:', BASE_URL);

// ========== NOTIFICATION SIMPLE ==========
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ========== AUTO-REFRESH ==========
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
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
    }
}

// ========== BACKUP ==========
function backupData() {
    if (!confirm('💾 Créer une sauvegarde ?')) return;
    fetch(`${BASE_URL}/api/admin/backup`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) showNotification('❌ ' + data.error, 'error');
        else showNotification(`✅ Backup: ${data.count} commandes`, 'success');
    })
    .catch(() => showNotification('❌ Erreur backup', 'error'));
}

// ========== EXPORT ==========
function exportData() {
    fetch(`${BASE_URL}/api/admin/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders-${Date.now()}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
        showNotification('✅ Export OK', 'success');
    })
    .catch(() => showNotification('❌ Erreur export', 'error'));
}

// ========== RESTORE ==========
function restoreData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                const orders = data.orders || data;
                if (!confirm(`Restaurer ${orders.length} commandes ?`)) return;
                
                fetch(`${BASE_URL}/api/admin/restore`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ backupData: { orders } })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.error) showNotification('❌ ' + data.error, 'error');
                    else {
                        showNotification(`✅ ${data.count} restaurées`, 'success');
                        loadOrders();
                        loadStats();
                    }
                })
                .catch(() => showNotification('❌ Erreur', 'error'));
            } catch {
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
        if (!data.logs?.length) {
            alert('Aucun log');
            return;
        }
        console.log('Logs:', data.logs);
        alert('Voir console F12');
    })
    .catch(() => showNotification('❌ Erreur logs', 'error'));
}

// ========== LOGOUT ==========
function logout() {
    stopAutoRefresh();
    adminOnline = false;
    localStorage.setItem('adminStatus', 'offline');
    localStorage.removeItem('adminToken');
    token = null;
    // Redirection vers la page de login si elle existe
    window.location.href = '/admin/login.html';
}

// ========== LOAD ORDERS ==========
function loadOrders() {
    if (!token) return;
    
    fetch(`${BASE_URL}/api/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.status === 401) {
            logout();
            return null;
        }
        return res.json();
    })
    .then(data => {
        if (data) {
            orders = Array.isArray(data) ? data : [];
            displayOrders(orders);
        }
    })
    .catch(() => {});
}

// ========== LOAD STATS ==========
function loadStats() {
    if (!token) return;
    
    fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data) {
            document.getElementById('totalOrders').textContent = data.totalOrders || 0;
            document.getElementById('totalRevenue').textContent = (data.totalRevenue || 0).toLocaleString() + ' Ar';
            document.getElementById('pendingOrders').textContent = data.statusCount?.['en attente'] || 0;
            document.getElementById('deliveredOrders').textContent = data.statusCount?.['livré'] || 0;
        }
    })
    .catch(() => {});
}

// ========== COPY ==========
function copyToClipboard(text, type = '') {
    if (!text) {
        showNotification('❌ Rien à copier', 'error');
        return;
    }
    navigator.clipboard.writeText(text)
        .then(() => showNotification(`✅ ${type} copié`, 'success'))
        .catch(() => showNotification('❌ Erreur copie', 'error'));
}

// ========== DISPLAY ORDERS ==========
function displayOrders(ordersToShow) {
    const tbody = document.getElementById('ordersBody');
    if (!ordersToShow || ordersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">Aucune commande</td></tr>';
        return;
    }

    tbody.innerHTML = ordersToShow.map(order => {
        let statusClass = '';
        if (order.status === 'en attente') statusClass = 'status-en-attente';
        else if (order.status === 'livré') statusClass = 'status-livré';
        else if (order.status === 'annulé') statusClass = 'status-annulé';
        
        let paymentBadge = order.paymentMethod;
        if (order.paymentMethod === 'MVola') paymentBadge = '<span class="payment-badge mvola">MVola</span>';
        else if (order.paymentMethod === 'Orange Money') paymentBadge = '<span class="payment-badge orange">Orange</span>';

        return `
        <tr>
            <td>#${order.id}</td>
            <td>${order.date ? new Date(order.date).toLocaleString() : ''}</td>
            <td>
                ${order.pubgId || ''}
                <button class="icon-btn copy-id-btn" onclick="copyToClipboard('${order.pubgId || ''}', 'ID')">📋</button>
            </td>
            <td>${order.pseudo || ''}</td>
            <td>${order.pack || ''}</td>
            <td>${order.price || ''}</td>
            <td>${paymentBadge}</td>
            <td>
                ${order.reference || ''}
                <button class="icon-btn copy-ref-btn" onclick="copyToClipboard('${order.reference || ''}', 'Réf')">📋</button>
            </td>
            <td><span class="status-badge ${statusClass}">${order.status}</span></td>
            <td>
                ${order.status !== 'livré' ? 
                    `<button class="icon-btn deliver-btn" onclick="updateStatus(${order.id}, 'livré')" title="Livrer">✓</button>` : ''}
                ${order.status !== 'annulé' && order.status !== 'livré' ? 
                    `<button class="icon-btn cancel-btn" onclick="updateStatus(${order.id}, 'annulé')" title="Annuler">✗</button>` : ''}
                <button class="icon-btn delete-btn" onclick="deleteOrder(${order.id})" title="Supprimer">🗑️</button>
            </td>
        </tr>
    `}).join('');
}

// ========== FILTERS ==========
document.getElementById('searchInput')?.addEventListener('input', filterOrders);
document.getElementById('statusFilter')?.addEventListener('change', filterOrders);
document.getElementById('methodFilter')?.addEventListener('change', filterOrders);

function filterOrders() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const method = document.getElementById('methodFilter').value;
    
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
    if (method !== 'all') {
        filtered = filtered.filter(o => o.paymentMethod === method);
    }
    displayOrders(filtered);
}

// ========== UPDATE STATUS ==========
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
        showNotification('✅ Statut mis à jour', 'success');
    })
    .catch(() => showNotification('❌ Erreur', 'error'));
}

// ========== DELETE ORDER ==========
function deleteOrder(orderId) {
    if (!confirm('Supprimer ?')) return;
    
    fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(() => {
        loadOrders();
        loadStats();
        showNotification('✅ Commande supprimée', 'success');
    })
    .catch(() => showNotification('❌ Erreur', 'error'));
}

// ========== REFRESH ==========
function refreshOrders() {
    loadOrders();
    loadStats();
    showNotification('🔄 Actualisé', 'success');
}

// ========== TOGGLE ADMIN STATUS ==========
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
    
    localStorage.setItem('adminStatus', adminOnline ? 'online' : 'offline');
    
    fetch(`${BASE_URL}/api/admin/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ online: adminOnline })
    }).catch(() => {});
}

// ========== SESSION CHECK ==========
if (token) {
    fetch(`${BASE_URL}/api/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            // Cacher login section si elle existe
            const loginSection = document.getElementById('loginSection');
            if (loginSection) loginSection.style.display = 'none';
            
            const adminSection = document.getElementById('adminSection');
            if (adminSection) adminSection.style.display = 'block';
            
            adminOnline = true;
            localStorage.setItem('adminStatus', 'online');
            
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
            localStorage.removeItem('adminToken');
        }
    })
    .catch(() => {});
} else {
    // Pas de token, afficher login section si elle existe
    const loginSection = document.getElementById('loginSection');
    const adminSection = document.getElementById('adminSection');
    
    if (loginSection) loginSection.style.display = 'flex';
    if (adminSection) adminSection.style.display = 'none';
}