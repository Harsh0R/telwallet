import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    telegramId: { type: String, required: true },
    receiverAddress: { type: String, required: true },
    amount: { type: Number, required: true },
    transactionHash: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});


const accountSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    privateKey: { type: String, required: true },
    balance: { type: Number, default: 0 },
    transactions: [transactionSchema]
});

const userSchema = new mongoose.Schema({
    telegramId: { type: String, unique: true, required: true },
    username: String,
    accounts: [accountSchema],
    createdAt: { type: Date, default: Date.now }
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
export const Account = mongoose.model('Account', accountSchema);
export const User = mongoose.model('User', userSchema);
