let token = localStorage.getItem('adminToken');
let orders = [];
const BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return 'https://magic-game-store-api.onrender.com'; // CHANGEZ CE NOM !
})();

function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    fetch('${BASE_URL}/api/login', {
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
            loadOrders();
            loadStats();
        } else {
            document.getElementById('loginError').textContent = data.error;
        }
    })
    .catch(err => {
        document.getElementById('loginError').textContent = 'Erreur de connexion';
    });
}

function logout() {
    localStorage.removeItem('adminToken');
    token = null;
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminSection').style.display = 'none';
}

function loadOrders() {
    if (!token) return;

    fetch('${BASE_URL}/api/admin/orders', {
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
    .catch(err => console.error('Erreur:', err));
}

function loadStats() {
    fetch('${BASE_URL}/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('totalOrders').textContent = data.totalOrders;
        document.getElementById('totalRevenue').textContent = data.totalRevenue.toLocaleString() + ' Ar';
        document.getElementById('pendingOrders').textContent = data.statusCount['en attente'];
        document.getElementById('deliveredOrders').textContent = data.statusCount['livré'];
    });
}

function displayOrders(ordersToShow) {
    const tbody = document.getElementById('ordersBody');
    
    if (ordersToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">Aucune commande</td></tr>';
        return;
    }

    tbody.innerHTML = ordersToShow.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${new Date(order.date).toLocaleString()}</td>
            <td>${order.pubgId}</td>
            <td>${order.pseudo}</td>
            <td>${order.pack}</td>
            <td>${order.price}</td>
            <td>${order.paymentMethod}</td>
            <td>${order.reference}</td>
            <td>
                <span class="status-badge status-${order.status.replace(' ', '-')}">
                    ${order.status}
                </span>
            </td>
            <td>
                ${order.status !== 'livré' ? 
                    `<button class="action-btn deliver-btn" onclick="updateStatus(${order.id}, 'livré')">
                        ✓ Livrer
                    </button>` : ''}
                <button class="action-btn delete-btn" onclick="deleteOrder(${order.id})">
                    ✗ Suppr
                </button>
            </td>
        </tr>
    `).join('');
}

document.getElementById('searchInput').addEventListener('input', filterOrders);
document.getElementById('statusFilter').addEventListener('change', filterOrders);

function filterOrders() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    
    let filtered = orders;
    
    if (search) {
        filtered = filtered.filter(o => 
            o.pubgId.toLowerCase().includes(search) ||
            o.pseudo.toLowerCase().includes(search)
        );
    }
    
    if (status !== 'all') {
        filtered = filtered.filter(o => o.status === status);
    }
    
    displayOrders(filtered);
}

function updateStatus(orderId, newStatus) {
    if (!confirm('Confirmer le changement de statut ?')) return;

    fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(res => res.json())
    .then(() => {
        loadOrders();
        loadStats();
    });
}

function deleteOrder(orderId) {
    if (!confirm('Supprimer définitivement cette commande ?')) return;

    fetch(`${BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(() => {
        loadOrders();
        loadStats();
    });
}

function refreshOrders() {
    loadOrders();
    loadStats();
}

// Vérifier session au chargement
if (token) {
    fetch('${BASE_URL}/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('adminSection').style.display = 'block';
            loadOrders();
            loadStats();
        } else {
            localStorage.removeItem('adminToken');
        }
    });
}
