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
const mongoose = require('mongoose'); // AJOUTÉ

// Charger variables d'environnement
dotenv.config();

const app = express();

// ========= CONFIANCE AU PROXY DE RENDER ========
app.set('trust proxy', 1);

// ========== CONNEXION MONGODB ATLAS ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://magicgame:TON_MDP@cluster0.xxxxx.mongodb.net/magicgame';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
    console.log('✅ Connecté à MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB:', err);
});

// ========== MODÈLES MONGODB ==========

// Schéma pour les commandes
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

// Schéma pour les utilisateurs
const userSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});

// Hash le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);

// ========== MIDDLEWARE ==========
app.use(helmet({
    contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
    origin: [
        'https://magicgame.store', 
        'https://www.magicgame.store', 
        'https://magicgamestore.onrender.com',
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Trop de requêtes, veuillez attendre 15 minutes' }
});
app.use('/api/', limiter);

// ========== FONCTIONS UTILITAIRES POUR MONGODB ==========
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

// Initialiser l'admin au démarrage
initializeAdmin();

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

// ========== FONCTION DE VALIDATION ID PUBG ==========
function validatePubgId(pubgId) {
    if (!pubgId) return { valid: false, message: 'ID PUBG requis' };
    if (!/^\d+$/.test(pubgId)) return { valid: false, message: 'ID PUBG ne doit contenir que des chiffres' };
    if (pubgId.length < 5) return { valid: false, message: 'ID PUBG trop court (minimum 5 chiffres)' };
    if (pubgId.length > 20) return { valid: false, message: 'ID PUBG trop long (maximum 20 chiffres)' };
    return { valid: true };
}

// ========== ROUTES API PUBLIQUES ==========

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        
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

        const validation = validatePubgId(pubgId);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.message });
        }

        // Créer commande dans MongoDB
        const order = new Order({
            id: Date.now(),
            date: new Date(),
            pubgId,
            pseudo,
            pack,
            price,
            paymentMethod,
            reference,
            status: 'en attente'
        });

        await order.save();

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
        
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        const oldStatus = order.status;
        order.status = status;
        await order.save();
        
        res.json({ message: 'Statut mis à jour' });
        
    } catch (error) {
        console.error('❌ Erreur mise à jour:', error);
        res.status(500).json({ error: error.message });
    }
});

// Supprimer commande
app.delete('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        const order = await Order.findOne({ id: orderId });
        
        if (!order) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        await Order.deleteOne({ id: orderId });
        
        res.json({ message: 'Commande supprimée' });
        
    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        res.status(500).json({ error: error.message });
    }
});

// Statistiques
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find();
        
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
        
        const lastOrders = await Order.find().sort({ date: -1 }).limit(10);
        
        res.json({
            totalOrders,
            totalRevenue,
            statusCount,
            lastOrders
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ROUTE POUR L'HISTORIQUE CLIENT ==========
app.get('/api/orders/user/:pubgId', async (req, res) => {
    try {
        const pubgId = req.params.pubgId;
        
        console.log(`📤 Recherche des commandes pour ID PUBG: ${pubgId}`);
        
        const orders = await Order.find({ pubgId }).sort({ date: -1 });
        
        console.log(`📥 ${orders.length} commandes trouvées pour ${pubgId}`);
        
        res.json(orders);
        
    } catch (error) {
        console.error('❌ Erreur historique client:', error);
        res.json([]);
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

// ========== DÉMARRAGE DU SERVEUR ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ==================================`);
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`🌐 Site: https://magicgame.store`);
    console.log(`🔐 Admin: https://magicgame.store/admin/admin.html`);
    console.log(`📊 MongoDB: Connecté`);
    console.log(`=====================================\n`);
});