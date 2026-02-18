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

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Fichiers JSON
const ordersFile = path.join(__dirname, 'orders.json');
const usersFile = path.join(__dirname, 'users.json');

// Initialiser les fichiers
if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([]));
}

// Fonctions utilitaires
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

// Middleware auth
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

// ========== ROUTES API ==========

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
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
    
    res.json({ token, user: { email: user.email, role: user.role } });
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
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ADMIN: Récupérer toutes les commandes
app.get('/api/admin/orders', authenticateToken, isAdmin, (req, res) => {
    const orders = readOrders();
    res.json(orders);
});

// ADMIN: Mettre à jour statut
app.put('/api/admin/orders/:id', authenticateToken, isAdmin, (req, res) => {
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
});

// ADMIN: Supprimer commande
app.delete('/api/admin/orders/:id', authenticateToken, isAdmin, (req, res) => {
    const orderId = parseInt(req.params.id);
    
    let orders = readOrders();
    orders = orders.filter(o => o.id !== orderId);
    writeOrders(orders);
    
    res.json({ message: 'Commande supprimée' });
});

// ADMIN: Statistiques
app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
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
});

// ========== ROUTES DE DEBUG POUR RÉSOUDRE L'AUTH ==========

// 1. VOIR l'état actuel
app.get('/api/debug-auth', (req, res) => {
    const users = fs.existsSync(usersFile) ? readUsers() : [];
    const admin = users.find(u => u.email === process.env.ADMIN_EMAIL);
    
    res.json({
        env: {
            adminEmail: process.env.ADMIN_EMAIL,
            adminPassword: process.env.ADMIN_PASSWORD ? '********' : 'non défini'
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

// 2. CRÉER un nouvel admin avec le bon mot de passe
app.get('/api/create-admin', async (req, res) => {
    try {
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
            message: 'Admin créé avec succès',
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. TESTER la connexion directement (POST en GET pour debug)
app.get('/api/test-login/:password', async (req, res) => {
    try {
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

// 1. D'ABORD la route spécifique pour l'admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// 2. ENSUITE les fichiers statiques généraux
app.use(express.static(__dirname));

// 3. ENFIN les routes HTML spécifiques
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*.html', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

// Route de débogage
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

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`📊 Site: https://magicgamestore.onrender.com`);
    console.log(`📊 Admin: https://magicgamestore.onrender.com/admin/admin.html`);
    console.log(`📊 Debug Auth: https://magicgamestore.onrender.com/api/debug-auth`);
    console.log(`📊 Create Admin: https://magicgamestore.onrender.com/api/create-admin`);
});
