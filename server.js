const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');

// Charger variables d'environnement
dotenv.config();

const app = express();

// ========== MIDDLEWARE ==========
app.use(helmet({
    contentSecurityPolicy: false,
}));

// CORS plus flexible
// CORS plus flexible
app.use(cors({
    origin: [
        'https://magicgame.store', 
        'https://www.magicgame.store', 
        'https://magicgamestore.onrender.com',  // 👈 AJOUTEZ CETTE LIGNE
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(express.json());
app.use(morgan('combined'));

// Rate limiting - avec message personnalisé
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Trop de requêtes, veuillez attendre 15 minutes' }
});
app.use('/api/', limiter);

// ========== FICHIERS JSON ==========
const ordersFile = path.join(__dirname, 'orders.json');
const usersFile = path.join(__dirname, 'users.json');

// Initialiser les fichiers
if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([]));
}

// ========== FONCTIONS UTILITAIRES ==========
function readOrders() {
    return JSON.parse(fs.readFileSync(ordersFile));
}

function writeOrders(orders) {
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
}

function readUsers() {
    return JSON.parse(fs.readFileSync(usersFile));
}

function writeUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// ========== MIDDLEWARE AUTH ==========
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Token manquant' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token invalide' });
        req.user = user;
        next();
    });
}

function isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès interdit' });
    }
    next();
}

// ========== ROUTES API PUBLIQUES ==========

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Vérifier si users.json existe
        if (!fs.existsSync(usersFile)) {
            return res.status(500).json({ error: 'Base de données utilisateurs non initialisée' });
        }
        
        const users = readUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            token, 
            user: { email: user.email, role: user.role } 
        });
        
    } catch (error) {
        console.error('❌ Erreur login:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer une commande
app.post('/api/order', async (req, res) => {
    try {
        const { pubgId, pseudo, pack, price, paymentMethod, reference } = req.body;

        // Validation
        if (!pubgId || !pseudo || !pack || !price || !paymentMethod || !reference) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        if (pubgId.length !== 11 || !/^\d+$/.test(pubgId)) {
            return res.status(400).json({ error: 'ID PUBG doit être 11 chiffres' });
        }

        // Créer commande
        const order = {
            id: Date.now(),
            date: new Date().toISOString(),
            pubgId,
            pseudo,
            pack,
            price,
            paymentMethod,
            reference,
            status: 'en attente'
        };

        // Sauvegarder
        const orders = readOrders();
        orders.push(order);
        writeOrders(orders);

        res.status(201).json({ 
            message: 'Commande enregistrée', 
            orderId: order.id 
        });

    } catch (error) {
        console.error('❌ Erreur commande:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ========== ROUTES ADMIN (protégées) ==========

// Récupérer toutes les commandes
app.get('/api/admin/orders', authenticateToken, isAdmin, (req, res) => {
    const orders = readOrders();
    res.json(orders);
});

// Mettre à jour statut
app.put('/api/admin/orders/:id', authenticateToken, isAdmin, (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        
        const orders = readOrders();
        const index = orders.findIndex(o => o.id === orderId);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        orders[index].status = status;
        writeOrders(orders);
        
        res.json({ message: 'Statut mis à jour' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Supprimer commande
app.delete('/api/admin/orders/:id', authenticateToken, isAdmin, (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        let orders = readOrders();
        orders = orders.filter(o => o.id !== orderId);
        writeOrders(orders);
        
        res.json({ message: 'Commande supprimée' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Statistiques
app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
    try {
        const orders = readOrders();
        
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => {
            const price = parseInt(o.price.replace(/[^0-9]/g, '')) || 0;
            return sum + price;
        }, 0);
        
        const statusCount = {
            'en attente': orders.filter(o => o.status === 'en attente').length,
            'livré': orders.filter(o => o.status === 'livré').length,
            'annulé': orders.filter(o => o.status === 'annulé').length
        };
        
        res.json({
            totalOrders,
            totalRevenue,
            statusCount,
            lastOrders: orders.slice(-10).reverse()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ROUTES DE DEBUG (à supprimer en production) ==========

// 1. VOIR l'état actuel
app.get('/api/debug-auth', (req, res) => {
    const users = fs.existsSync(usersFile) ? readUsers() : [];
    const admin = users.find(u => u.email === process.env.ADMIN_EMAIL);
    
    res.json({
        env: {
            adminEmail: process.env.ADMIN_EMAIL,
            adminPasswordDefined: !!process.env.ADMIN_PASSWORD
        },
        file: {
            usersFileExists: fs.existsSync(usersFile),
            usersCount: users.length
        },
        admin: admin ? {
            email: admin.email,
            role: admin.role,
            hash: admin.password.substring(0, 20) + '...'
        } : null
    });
});

// 2. CRÉER un nouvel admin
app.get('/api/create-admin', async (req, res) => {
    try {
        if (!process.env.ADMIN_PASSWORD) {
            return res.status(500).json({ error: 'ADMIN_PASSWORD non défini dans les variables d\'environnement' });
        }
        
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, salt);
        
        const newAdmin = [{
            id: 1,
            email: process.env.ADMIN_EMAIL,
            password: hash,
            role: 'admin',
            createdAt: new Date().toISOString()
        }];
        
        fs.writeFileSync(usersFile, JSON.stringify(newAdmin, null, 2));
        
        res.json({ 
            success: true, 
            message: '✅ Admin créé avec succès',
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. TESTER la connexion
app.get('/api/test-login/:password', async (req, res) => {
    try {
        if (!fs.existsSync(usersFile)) {
            return res.json({ error: 'users.json n\'existe pas' });
        }
        
        const testPassword = req.params.password;
        const users = readUsers();
        const admin = users.find(u => u.email === process.env.ADMIN_EMAIL);
        
        if (!admin) {
            return res.json({ error: 'Admin non trouvé' });
        }
        
        const valid = await bcrypt.compare(testPassword, admin.password);
        
        res.json({
            email: admin.email,
            passwordTested: testPassword,
            isValid: valid,
            storedHash: admin.password.substring(0, 20) + '...'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ROUTES STATIQUES ==========

// Servir l'admin en premier
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Servir les fichiers statiques généraux
app.use(express.static(__dirname));

// Route pour la racine
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route de débogage admin
app.get('/admin-test', (req, res) => {
    const adminPath = path.join(__dirname, 'admin', 'admin.html');
    const exists = fs.existsSync(adminPath);
    res.json({
        message: 'Test admin',
        adminPath: adminPath,
        fileExists: exists,
        files: exists ? fs.readdirSync(path.join(__dirname, 'admin')) : []
    });
});

// ========== GESTION DES ERREURS 404 ==========
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});


// ========== ROUTE POUR L'HISTORIQUE CLIENT ==========
// Récupérer les commandes d'un utilisateur par son ID PUBG
app.get('/api/orders/user/:pubgId', (req, res) => {
    try {
        const pubgId = req.params.pubgId;
        
        console.log(`📤 Recherche des commandes pour ID PUBG: ${pubgId}`);
        
        const orders = readOrders();
        
        // Filtrer les commandes pour cet ID PUBG
        const userOrders = orders.filter(order => order.pubgId === pubgId);
        
        // Trier par date (plus récent d'abord)
        const sortedOrders = userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log(`📥 ${sortedOrders.length} commandes trouvées`);
        
        res.json(sortedOrders);
        
    } catch (error) {
        console.error('❌ Erreur historique client:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ========== DÉMARRAGE DU SERVEUR ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ==================================`);
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`🌐 Site: https://magicgame.store`);
    console.log(`🔐 Admin: https://magicgame.store/admin/admin.html`);
    console.log(`📊 Debug: https://magicgame.store/api/debug-auth`);
    console.log(`🛠️  Create Admin: https://magicgame.store/api/create-admin`);
    console.log(`=====================================\n`);
});
