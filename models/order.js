// models/Order.js
const mongoose = require('mongoose');

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

module.exports = mongoose.model('Order', orderSchema);