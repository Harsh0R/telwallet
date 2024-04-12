import { Telegraf, Markup } from 'telegraf';
import { ethers } from 'ethers';
import axios from 'axios';
import QRCode from 'qrcode'
import mongoose from 'mongoose'
// import { connectDB } from './db.js'

const bot = new Telegraf('7190257079:AAGPN69Y9q9irb4Dx6l-G4yOudDck21W97c');
const provider = new ethers.providers.JsonRpcProvider('https://rpc-mumbai.polygon.technology/');

async function connectDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/teleWallet', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

connectDB();

const accountSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Add a name or identifier for the account
    address: { type: String, required: true },
    privateKey: { type: String, required: true },
    balance: { type: Number, default: 0 },
});


const userSchema = new mongoose.Schema({
    telegramId: { type: String, unique: true, required: true },
    username: String,
    accounts: [accountSchema],
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);


const pendingTransactions = {};


// Define an array of funny names
const funnyNames = ['SillySquid', 'WackyWalrus', 'GoofyGiraffe', 'CheekyChinchilla', 'JollyJellyfish'];

// Function to generate a random funny name
function generateFunnyName() {
    const randomIndex = Math.floor(Math.random() * funnyNames.length);
    return funnyNames[randomIndex];
}

function getMainMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(' 🚀 Create Acc ', 'create_account'),
            Markup.button.callback(' 💵 Deposit MATIC ', 'deposit'),
        ],
        [
            Markup.button.callback(' 💰 Chaeck Balance ', 'check_balance'),
            Markup.button.callback(' 💸 Send MATIC ', 'send_matic'),
            Markup.button.callback(' 🪙 ETH Pice', 'ethereum_price'),
        ],
        [
            Markup.button.callback(' ⚙️ Setting', 'setting'),
            // Markup.button.callback(' 😟 Quit ', 'quit'),
        ] // Example of how to make a button appear on its own row
    ]);
}

bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username;

    // Check if the user already exists
    const userExists = await User.findOne({ telegramId });
    if (!userExists) {
        // Create a new user if not exists
        const newUser = new User({ telegramId, username });
        await newUser.save();
        ctx.reply(`Welcome 👋 , ${username} How can I assist you?`, getMainMenu());
    } else {
        ctx.reply(`Welcome back 👋, ${username} How can I assist you today?`, getMainMenu());
    }
});

bot.action('deposit', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    const user = await User.findOne({ telegramId });
    if (!user || user.accounts.length === 0) {
        await ctx.reply("You haven't created any accounts yet. Use /create_account to create one.");
        return;
    }

    // Generate inline keyboard buttons for each account
    const accountButtons = user.accounts.map((account, index) => [
        Markup.button.callback(`${account.name}: ${account.address}`, `deposit_${index}`)
    ]);

    // Send a message with the accounts listed
    await ctx.reply('Select an account to deposit into:', Markup.inlineKeyboard(accountButtons));
});

// Handler for when a user selects an account to deposit into
bot.action(/^deposit_\d+$/, async (ctx) => {
    const index = parseInt(ctx.match[0].split('_')[1]);
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });
    if (!user || index >= user.accounts.length) {
        await ctx.reply("Invalid account selected.");
        return;
    }

    const selectedAccount = user.accounts[index];

    // Generate QR Code for the selected account address
    try {
        let addr = selectedAccount.address;
        const depositQR = await QRCode.toDataURL(addr);

        // First, send the QR Code as a photo
        await ctx.replyWithPhoto({ source: Buffer.from(depositQR.split(',')[1], 'base64') }, { caption: `Scan this QR code to deposit MATIC into account No. ${index+1} -> ${selectedAccount.name}.` });

        // Then, send the address as text, making it easy to copy
        await ctx.replyWithMarkdown(`To deposit into *Account No. ${index+1} -->> ${selectedAccount.name}* , send MATIC to the following address:\n\`${selectedAccount.address}\`\n\n⚠️ Please double-check the address before sending.`);
    } catch (error) {
        console.error('Error generating QR code:', error);
        await ctx.reply('Failed to generate QR code. Please try again later.');
    }
});

bot.help((ctx) => {
    ctx.reply(`Here are the commands you can use:
- /start - Start interacting with the bot
- /create_account - Create a new Ethereum account
- /balance <address> - Check the balance of a specified address
- /ethereum - Get the current price of Ethereum in USD
- /sendmatic <receiver_address> <amount> - Send MATIC to another account
- /help - Show this help message`);
});

bot.action('quit', async (ctx) => {
    await ctx.reply('Goodbye! If you need further assistance, just type /start.');
    ctx.leaveChat();
});

bot.action('create_account', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    if (!user) {
        console.error('User not found');
        await ctx.reply('Error: User not found. Please start the bot with /start.');
        return;
    }

    // Check if the user already has three accounts
    if (user.accounts && user.accounts.length >= 3) {
        await ctx.reply('You have reached the maximum limit of 3 accounts.😟');
        return;
    }

    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;
    const accountName = generateFunnyName();
    console.log("Acc Name ==> ", accountName);
    user.accounts.push({ name: accountName, address, privateKey });
    await user.save();

    ctx.reply(`
    Account Created 🎉:
    Name : \`${accountName}\`
    Address : \`${address}\`
    ⚠️ Please store your private key securely!
    ⚠️ You can make 3 account free this is your ${user.accounts.length} account
    `, { parse_mode: 'Markdown' });
});


bot.action('ethereum_price', async (ctx) => {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const rate = response.data.ethereum.usd;
    ctx.reply(`Hello, today the Ethereum price is ${rate} USD`);
});

// Handle 'send_matic' callback
bot.action('send_matic', (ctx) => {
    ctx.reply('To send MATIC, please use the command : /sendmatic <receiver_address> <amount>.\n Example: /sendmatic 0x123... 1.5');
});

// Extended sendmatic command with interactive confirmation
bot.command('sendmatic', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
        ctx.reply('Usage: /sendmatic <receiver_address> <amount>');
        return;
    }
    const receiverAddress = parts[1];
    const amount = parts[2];
    const userId = ctx.from.id;

    // Validate receiver address and amount
    if (!ethers.utils.isAddress(receiverAddress) || isNaN(amount) || parseFloat(amount) <= 0) {
        ctx.reply('Invalid receiver address or amount. Please check your input and try again.');
        return;
    }

    // Prepare a dummy transaction to estimate gas
    const dummyTransaction = {
        to: receiverAddress,
        value: ethers.utils.parseEther(amount),
    };

    try {
        // Estimate gas limit for the transaction
        const estimatedGasLimit = await provider.estimateGas(dummyTransaction);

        // Fetch current gas price
        const gasPrice = await provider.getGasPrice();

        // Calculate estimated fee (gas limit * gas price)
        const estimatedFee = estimatedGasLimit.mul(gasPrice);
        const estimatedFeeInEth = ethers.utils.formatEther(estimatedFee);

        // Store transaction details using userId as key
        pendingTransactions[userId] = { receiverAddress, amount, estimatedFee };

        // Ask user to confirm the transaction including the estimated fee
        ctx.reply(`Confirm sending ${amount} MATIC to ${receiverAddress}. \nEstimated network fee: ${parseFloat(estimatedFeeInEth).toFixed(8)} MATIC`, Markup.inlineKeyboard([
            Markup.button.callback('Yes', `confirm_send_${userId}`),
            Markup.button.callback('No', `cancel_send_${userId}`)
        ]));
    } catch (error) {
        console.error('Error preparing transaction:', error);
        ctx.reply('Failed to prepare the transaction. Please try again later.');
    }
});

bot.action(/^confirm_send_(\d+)$/, async (ctx) => {
    const userId = ctx.match[1];
    const transaction = pendingTransactions[userId];

    if (!transaction) {
        await ctx.reply('Transaction details not found. 😟');
        return;
    }

    // Extract details from the stored transaction
    const { receiverAddress, amount, estimatedFee } = transaction;
    const senderPrivateKey = "0xaf4b9e03cbe3b7b3fbba4ede1e34c28bae28763c3d91e0435e2deb3b3eb2a770"; // Extremely sensitive, manage securely
    const wallet = new ethers.Wallet(senderPrivateKey, provider);

    try {
        // Fetch the sender's balance
        const balance = await wallet.getBalance();

        // Check if balance is sufficient (balance > amount + estimatedFee)
        const totalCost = ethers.utils.parseEther(amount).add(estimatedFee);
        if (balance.lt(totalCost)) {
            // Insufficient balance after accounting for the estimated fee
            await ctx.reply('Insufficient balance to cover the transfer amount and network fee. Transaction canceled. ❌');
            delete pendingTransactions[userId]; // Clean up
            return;
        }

        // Proceed with the transaction
        const tx = {
            to: receiverAddress,
            value: ethers.utils.parseEther(amount),
            // gasLimit: estimatedGasLimit, // You might want to explicitly set this
            // gasPrice: gasPrice, // And this, if you're not letting the wallet handle it automatically
        };

        const txResponse = await wallet.sendTransaction(tx);
        await ctx.reply(`Transaction successful! ✅🥳 [${txResponse.hash}](https://mumbai.polygonscan.com/tx/${txResponse.hash})`, { parse_mode: 'Markdown' });

        // Clear the transaction to prevent re-use
        delete pendingTransactions[userId];
    } catch (error) {
        console.error('Error sending MATIC:', error);
        await ctx.reply('Failed to send MATIC. Please check the details and try again.');
    }
});

bot.action(/^cancel_send_(\d+)$/, (ctx) => {
    const userId = ctx.match[1];
    delete pendingTransactions[userId]; // Clean up the stored transaction data
    ctx.reply('Transaction canceled. ❌ ');
});

bot.action('check_balance', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    const user = await User.findOne({ telegramId });
    if (!user || user.accounts.length === 0) {
        await ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
        return;
    }

    // Generate inline keyboard buttons for each account
    const accountButtons = user.accounts.map((account, index) => [
        Markup.button.callback(`${account.name} - ${account.address}`, `balance_${index}`)
    ]);

    // Send a message with the accounts listed
    await ctx.reply('Select an account to check the balance:', Markup.inlineKeyboard(accountButtons));
});


bot.action(/^balance_\d+$/, async (ctx) => {
    const index = parseInt(ctx.match[0].split('_')[1]);
    const telegramId = ctx.from.id.toString();

    const user = await User.findOne({ telegramId });
    if (!user || index >= user.accounts.length) {
        await ctx.reply("Invalid account selected.");
        return;
    }

    const selectedAccount = user.accounts[index];

    // Here you would fetch the real balance from the blockchain
    // For demonstration, we're using the stored balance
    const balance = selectedAccount.balance; // Consider fetching the latest balance from the blockchain

    await ctx.replyWithMarkdown(`Balance for *${index}*:\n${balance} MATIC`);
});




bot.launch()
























// bot.command('sendmatic1', async (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length < 3) {
//         await ctx.reply('Usage: /sendmatic <receiver_address> <amount_in_MATIC>\nExample: /sendmatic 0x1234... 0.1', { parse_mode: 'Markdown' });
//         return;
//     }

//     const receiverAddress = parts[1];
//     const amount = parts[2];

//     // Validate Ethereum address format (basic validation)
//     if (!ethers.utils.isAddress(receiverAddress)) {
//         await ctx.reply('🚫 The receiver address is not valid. Please provide a valid Polygon (MATIC) address.');
//         return;
//     }

//     // Validate amount
//     if (isNaN(amount) || parseFloat(amount) <= 0) {
//         await ctx.reply('🚫 The amount to send must be a positive number. Please specify a valid amount of MATIC.');
//         return;
//     }

//     // Confirmation message with details before proceeding
//     await ctx.reply(`You're about to send ${amount} MATIC to ${receiverAddress}.\nPlease confirm by typing /confirm`, { parse_mode: 'Markdown' });
//     // Store or flag the transaction details for confirmation...
// });






// bot.on(message('text'), async (ctx) => {
//     // Explicit usage
//     console.log("Ctx==>", ctx.message.chat.id);
//     console.log("Ctx==>", ctx);
//     await ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.state.role}`)

//     // Using context shortcut
//     await ctx.reply(`Hello ${ctx.state.role}`)
// })





// Confirmation handling

// bot.command('sendmatic', async (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length < 3) {
//         ctx.reply('Usage: /sendmatic <receiver_address> <amount>');
//         return;
//     }
//     const receiverAddress = parts[1];
//     const amount = parts[2];

//     // Basic validation here...

//     ctx.reply(`Confirm sending ${amount} MATIC to ${receiverAddress}`, Markup.inlineKeyboard([
//         Markup.button.callback('Yes', 'confirm_send'),
//         Markup.button.callback('No', 'cancel_send')
//     ]));
// });
// bot.action('confirm_send', async (ctx) => {
//     console.log("In Send MAtic");
//     const senderPrivateKey = "0xaf4b9e03cbe3b7b3fbba4ede1e34c28bae28763c3d91e0435e2deb3b3eb2a770"; // Extremely sensitive, manage securely
//     const wallet = new ethers.Wallet(senderPrivateKey, provider);
//     const tx = {
//         to: receiverAddress,
//         value: ethers.utils.parseEther(amount),
//         // Additional properties like gasLimit might be necessary depending on network conditions
//     };

//     try {
//         const txResponse = await wallet.sendTransaction(tx);
//         await ctx.reply(`Transaction successful! [${txResponse.hash}](https://mumbai.polygonscan.com/tx/${txResponse.hash})`, { parse_mode: 'MarkdownV2' });
//     } catch (error) {
//         console.error('Error sending MATIC:', error);
//         await ctx.reply('Failed to send MATIC. Please check the details and try again.');
//     }
// });




// bot.action('cancel_send', (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length < 3) {
//         ctx.reply('Usage: /sendmatic <receiver_address> <amount>');
//         return;
//     }
//     const receiverAddress = parts[1];
//     const amount = parts[2];

//     // Basic validation here...

//     ctx.reply(`Confirm sending ${amount} MATIC to ${receiverAddress}`);

//     ctx.reply('Transaction canceled.')
// });












// async function handleNewTransfer(senderTelegramId, receiverAddress, amount) {
//     // Look up the sender by their Telegram ID
//     const sender = await User.findOne({ telegramId: senderTelegramId });

//     if (!sender) {
//         throw new Error('Sender not found');
//     }

//     // Create a new transaction
//     const newTransaction = new Transaction({
//         sender: sender._id,
//         receiver: receiverAddress,
//         amount: amount,
//     });

//     await newTransaction.save();

//     // Optionally, update the sender's document to include this transaction
//     sender.transactions.push(newTransaction._id);
//     await sender.save();

//     return newTransaction;
// }

// async function updateTransactionStatus(transactionId, newStatus) {
//     const transaction = await Transaction.findById(transactionId);
//     if (!transaction) {
//         throw new Error('Transaction not found');
//     }

//     transaction.status = newStatus;
//     await transaction.save();
// }

// async function getUserTransactions(telegramId) {
//     const user = await User.findOne({ telegramId }).populate('transactions');
//     return user ? user.transactions : [];
// }


// Placeholder function for updating an account's balance
// In a real application, this would involve verifying the deposit transaction on the blockchain

