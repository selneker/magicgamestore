// db.js - Configuration MongoDB
const mongoose = require('mongoose');

// Récupère l'URL depuis les variables d'environnement UNIQUEMENT
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ ERREUR CRITIQUE: MONGODB_URI non définie dans les variables d\'environnement');
    console.error('👉 Va sur Render Dashboard → Environment → Ajoute MONGODB_URI');
    process.exit(1); // Arrête le serveur si pas d'URL
}

// Connexion SANS les options dépréciées
mongoose.connect(MONGODB_URI);

// Gestionnaire d'événements
mongoose.connection.on('connected', () => {
    console.log('✅ Connecté à MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Déconnecté de MongoDB');
});

// Pour fermer proprement la connexion
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
    process.exit(0);
});

module.exports = mongoose;