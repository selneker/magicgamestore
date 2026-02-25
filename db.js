// db.js - Configuration MongoDB
const mongoose = require('mongoose');

// Récupère l'URL depuis les variables d'environnement
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Selneker:#322*str(Dino)#@magicgamestore.ja8rxah.mongodb.net/';

// Connexion
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Gestionnaire d'événements
mongoose.connection.on('connected', () => {
    console.log('✅ Connecté à MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB:', err);
});

module.exports = mongoose;