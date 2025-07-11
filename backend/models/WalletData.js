const mongoose = require('mongoose');

const walletDataSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  wallet: String,
  navUsd: Number,
  tokens: [
    {
      symbol: String,
      amount: Number,
      price: Number,
      usdValue: Number
    }
  ],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WalletData', walletDataSchema);
