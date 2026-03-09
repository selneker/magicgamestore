// ===========================================
// SERVER.JS - MAGIC GAME STORE
// ===========================================

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
const mongoose = require('mongoose');

// ========== CONFIGURATION ==========
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ========== SÉCURITÉ ==========
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));

// ========== CORS ==========
app.use(cors({
    origin: [
        'https://magicgame.store',
        'https://www.magicgame.store',
        'https://magicgamestore.onrender.com',
        'http://localhost:3000'
    ],
    credentials: true
}));

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(morgan('combined'));

// ========== RATE LIMITING ==========
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Trop de requêtes, veuillez attendre 15 minutes' }
});
app.use('/api/', limiter);

// ========== MONGODB CONNEXION ==========
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ ERREUR: MONGODB_URI non définie');
    process.exit(1);
}

mongoose.connect(MONGODB_URI);
mongoose.connection.on('connected', () => console.log('✅ Connecté à MongoDB Atlas'));
mongoose.connection.on('error', (err) => console.error('❌ Erreur MongoDB:', err));

// ========== MODÈLES MONGODB ==========

// Schéma Commande
const orderSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    date: { type: Date, default: Date.now },
    pubgId: { type: String, required: true },
    pseudo: { type: String, required: true },
    pack: { type: String, required: true },
    price: { type: String, required: true },
    paymentMethod: { type: String, default: 'MVola' },
    reference: { type: String, required: true },
    status: { type: String, default: 'en attente' }
});
const Order = mongoose.model('Order', orderSchema);

// Schéma Utilisateur
const userSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
const User = mongoose.model('User', userSchema);

// ========== FONCTIONS UTILITAIRES ==========

// Initialiser admin
async function initializeAdmin() {
    try {
        const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
        if (!adminExists) {
            const admin = new User({
                id: 1,
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Admin créé dans MongoDB');
        }
    } catch (error) {
        console.error('❌ Erreur création admin:', error);
    }
}
initializeAdmin();

// Logger
function logOrderAction(action, orderId, details = {}) {
    const logEntry = { timestamp: new Date().toISOString(), action, orderId, ...details };
    console.log(`📝 [LOG] ${action} - Commande #${orderId}`, details);
    
    try {
        const logsFile = path.join(__dirname, 'orders.log');
        const logs = fs.existsSync(logsFile) ? JSON.parse(fs.readFileSync(logsFile)) : [];
        logs.push(logEntry);
        fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('❌ Erreur écriture log:', error);
    }
}

// Validation ID PUBG
function validatePubgId(pubgId) {
    if (!pubgId) return { valid: false, message: 'ID PUBG requis' };
    if (!/^\d+$/.test(pubgId)) return { valid: false, message: 'ID PUBG ne doit contenir que des chiffres' };
    if (pubgId.length < 5) return { valid: false, message: 'ID PUBG trop court (min 5)' };
    if (pubgId.length > 20) return { valid: false, message: 'ID PUBG trop long (max 20)' };
    return { valid: true };
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

// ========== ROUTES PUBLIQUES ==========

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ token, user: { email: user.email, role: user.role } });
    } catch (error) {
        console.error('❌ Erreur login:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer commande
app.post('/api/order', async (req, res) => {
    try {
        const { pubgId, pseudo, pack, price, paymentMethod, reference } = req.body;
        
        if (!pubgId || !pseudo || !pack || !price || !paymentMethod || !reference) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }
        
        const validation = validatePubgId(pubgId);
        if (!validation.valid) return res.status(400).json({ error: validation.message });
        
        const order = new Order({
            id: Date.now(),
            date: new Date(),
            pubgId, pseudo, pack, price, paymentMethod, reference,
            status: 'en attente'
        });
        
        await order.save();
        logOrderAction('CREATE', order.id, { pubgId, pseudo, pack, price });
        
        res.status(201).json({ message: 'Commande enregistrée', orderId: order.id });
    } catch (error) {
        console.error('❌ Erreur commande:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Historique client
app.get('/api/orders/user/:pubgId', async (req, res) => {
    try {
        const orders = await Order.find({ pubgId: req.params.pubgId }).sort({ date: -1 });
        res.json(orders);
    } catch (error) {
        console.error('❌ Erreur historique:', error);
        res.json([]);
    }
});

// ========== ROUTES ADMIN ==========

// Toutes les commandes
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mettre à jour statut
app.put('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        const order = await Order.findOne({ id: orderId });
        
        if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
        
        const oldStatus = order.status;
        order.status = status;
        await order.save();
        
        logOrderAction('STATUS_UPDATE', orderId, { oldStatus, newStatus: status });
        res.json({ message: 'Statut mis à jour' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Supprimer commande
app.delete('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = await Order.findOne({ id: orderId });
        
        if (!order) return res.status(404).json({ error: 'Commande non trouvée' });
        
        await Order.deleteOne({ id: orderId });
        logOrderAction('DELETE', orderId, { deletedBy: req.user.email });
        res.json({ message: 'Commande supprimée' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Statistiques
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find();
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + (parseInt(o.price.replace(/[^0-9]/g, '')) || 0), 0);
        const statusCount = {
            'en attente': orders.filter(o => o.status === 'en attente').length,
            'livré': orders.filter(o => o.status === 'livré').length,
            'annulé': orders.filter(o => o.status === 'annulé').length
        };
        const lastOrders = await Order.find().sort({ date: -1 }).limit(10);
        
        res.json({ totalOrders, totalRevenue, statusCount, lastOrders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== STATUT ADMIN SIMPLE ==========

let adminStatus = { online: false };

// Mettre à jour statut (admin)
app.post('/api/admin/status', authenticateToken, isAdmin, (req, res) => {
    adminStatus = {
        online: req.body.online
    };
    console.log(`📡 Admin ${adminStatus.online ? 'en ligne' : 'hors ligne'}`);
    res.json({ success: true, online: adminStatus.online });
});

// Vérifier statut (client)
app.get('/api/admin/status', (req, res) => {
    res.json({ online: adminStatus.online });
});


// ========== ROUTES DE SAUVEGARDE ==========

// Export
app.get('/api/admin/export', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.json`);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Backup
app.get('/api/admin/backup', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        const backup = { timestamp: new Date().toISOString(), count: orders.length, orders };
        const backupFile = path.join(__dirname, `backup-${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
        res.json({ message: '✅ Backup créé', file: path.basename(backupFile), count: orders.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logs
app.get('/api/admin/debug/orders-log', authenticateToken, isAdmin, (req, res) => {
    try {
        const logsFile = path.join(__dirname, 'orders.log');
        if (!fs.existsSync(logsFile)) return res.json({ logs: [] });
        res.json({ logs: JSON.parse(fs.readFileSync(logsFile)) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restore
app.post('/api/admin/restore', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { backupData } = req.body;
        if (!backupData?.orders) return res.status(400).json({ error: 'Données invalides' });
        
        await Order.deleteMany({});
        await Order.insertMany(backupData.orders);
        res.json({ message: '✅ Données restaurées', count: backupData.orders.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ROUTES DEBUG ==========
app.get('/api/debug-auth', (req, res) => {
    res.json({ 
        message: 'API OK',
        env: { adminEmail: process.env.ADMIN_EMAIL },
        mongoConnected: mongoose.connection.readyState === 1
    });
});

app.get('/api/create-admin', async (req, res) => {
    try {
        if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD non défini' });
        
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, salt);
        const newAdmin = [{
            id: 1,
            email: process.env.ADMIN_EMAIL,
            password: hash,
            role: 'admin',
            createdAt: new Date().toISOString()
        }];
        fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(newAdmin, null, 2));
        res.json({ success: true, message: '✅ Admin créé', email: process.env.ADMIN_EMAIL });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== FICHIERS STATIQUES ==========
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin-test', (req, res) => {
    const adminPath = path.join(__dirname, 'admin', 'admin.html');
    res.json({
        message: 'Test admin',
        fileExists: fs.existsSync(adminPath),
        files: fs.existsSync(path.join(__dirname, 'admin')) ? fs.readdirSync(path.join(__dirname, 'admin')) : []
    });
});

// ========== 404 ==========
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// ========== DÉMARRAGE ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ==================================`);
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`🌐 Site: https://magicgame.store`);
    console.log(`🔐 Admin: https://magicgame.store/admin/admin.html`);
    console.log(`📊 MongoDB: Connecté`);
    console.log(`=====================================\n`);
});