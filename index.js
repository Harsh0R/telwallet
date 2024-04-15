import { Telegraf, session, Markup } from 'telegraf';
import { ethers } from 'ethers';
import axios from 'axios';
import QRCode from 'qrcode'
import mongoose from 'mongoose'
// import { connectDB } from './db.js'

const bot = new Telegraf('7190257079:AAGPN69Y9q9irb4Dx6l-G4yOudDck21W97c');
// const provider = new ethers.providers.JsonRpcProvider('https://rpc-mumbai.polygon.technology/');
const provider = new ethers.providers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');

const chainData = [
    {
        name: 'Amoy',
        rpcUrl: 'https://rpc-amoy.polygon.technology/'
    },
    {
        name: 'tBNB',
        rpcUrl: 'https://bsc-testnet-rpc.publicnode.com'
    },
]
const chainName = '';
let testnet = true;

async function connectDB() {
    try {
        await mongoose.connect('mongodb+srv://cryptoWallet:Harsh%40CW@cluster0.y5gcbd1.mongodb.net/walletDB', {
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

const transactionSchema = new mongoose.Schema({
    telegramId: { type: String, required: true },
    receiverAddress: { type: String, required: true },
    amount: { type: Number, required: true },
    transactionHash: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

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

const User = mongoose.model('User', userSchema);


const pendingTransactions = {};

const TestChainList = ['Amoy', 'BNB', 'Sepolia_Eth', 'Goerli_Eth']
const MainChainList = ['ETH', 'BNB', 'Polygon']

function getMainMenu() {
    if (testnet) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(' 🚀 Create Account', 'create_account'),
                Markup.button.callback(' 💵 Deposit Token', 'deposit'),
            ],
            [
                Markup.button.callback(' ✅ testnet', 'testnetOn'),
                Markup.button.callback('  mainnet', 'mainetOn'),
            ],
            [
                Markup.button.callback(' 💰 Check Balance', 'check_balance'),
                Markup.button.callback(' 💸 Send Token', 'send_TBNB'),
            ],
            [
                Markup.button.callback(' 🔗 Show all Chain ', 'allChains'),
                Markup.button.callback(' 🪙 ETH Pice', 'ethereum_price'),
            ],
            [
                Markup.button.callback(' 📝 View Transactions', 'view_transactions'),
                Markup.button.callback(' ⚙️ Setting', 'setting'),
            ],
        ]);
    } else {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(' 🚀 Create Account', 'create_account'),
                Markup.button.callback(' 💵 Deposit Token', 'deposit'),
            ],
            [
                Markup.button.callback('  testnet', 'testnetOn'),
                Markup.button.callback(' ✅ mainnet', 'mainetOn'),
            ],
            [
                Markup.button.callback(' 💰 Check Balance', 'check_balance'),
                Markup.button.callback(' 💸 Send Token', 'send_TBNB'),
            ],
            [
                Markup.button.callback(' 🔗 Show all Chain ', 'allChains'),
                Markup.button.callback(' 🪙 ETH Pice', 'ethereum_price'),
            ],
            [
                Markup.button.callback(' 📝 View Transactions', 'view_transactions'),
                Markup.button.callback(' ⚙️ Setting', 'setting'),
            ],
        ]);

    }
}

bot.start(async (ctx) => {
    try {
        const telegramId = ctx.from.id.toString();
        const username = ctx.from.username;

        // Check if the user already exists
        const userExists = await User.findOne({ telegramId });
        if (!userExists) {
            const newUser = new User({ telegramId, username });
            await newUser.save();
            await ctx.reply(`Welcome 👋, ${username}! How can I assist you?`, getMainMenu());
        } else {
            await ctx.reply(`Welcome back 👋, ${username}! How can I assist you today?`, getMainMenu());
        }
    } catch (error) {
        console.error('Error handling bot start:', error);
        ctx.reply('Failed to start the bot. Please try again later.');
    }
});



bot.action('mainetOn', async (ctx) => {
    testnet = false;

    // Delete the previous message
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
    } catch (error) {
        console.error('Error deleting message:', error);
    }

    // Send the updated main menu
    ctx.reply(' ⚠️ Mainnet activated.', getMainMenu(testnet));
});
bot.action('testnetOn', async (ctx) => {
    testnet = true;

    // Delete the previous message
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
    } catch (error) {
        console.error('Error deleting message:', error);
    }

    // Send the updated main menu
    ctx.reply(' ✅ Testnet activated.', getMainMenu(testnet));
});

bot.action('testnets', async (ctx) => {
    if (!ChainList) {
        await ctx.reply("No chain Avalabale.");
        return;
    }

    // Generate inline keyboard buttons for each account
    const accountButtons = ChainList.map((name, index) => [
        Markup.button.callback(`${name}`, `deposit_${index}`)
    ]);

    // Send a message with the accounts listed
    await ctx.reply('Select chain to deposit into:', Markup.inlineKeyboard(accountButtons));
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

bot.action('allChains', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    if (testnet) {
        const accountButtons = TestChainList.map((name, index) => [
            Markup.button.callback(`${name}`, `deposit_${index}`)
        ]);
        await ctx.reply('Select an chian to deposit into:', Markup.inlineKeyboard(accountButtons));
    }else{
        const accountButtons = MainChainList.map((name, index) => [
            Markup.button.callback(`${name}`, `deposit_${index}`)
        ]);
        await ctx.reply('Select an chian to deposit into:', Markup.inlineKeyboard(accountButtons));
    }


    // Send a message with the accounts listed
});

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
        await ctx.replyWithPhoto({ source: Buffer.from(depositQR.split(',')[1], 'base64') }, { caption: `Scan this QR code to deposit TBNB into account No. ${index + 1} -> ${selectedAccount.name}.` });

        // Then, send the address as text, making it easy to copy
        await ctx.replyWithMarkdown(`To deposit into *Account No. ${index + 1} -->> ${selectedAccount.name}* , send TBNB to the following address:\n\`${selectedAccount.address}\`\n\n⚠️ Please double-check the address before sending.`);
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
- /sendTBNB <receiver_address> <amount> - Send TBNB to another account
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

    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;
    // const accountName = generateFunnyName();
    const accountName = `Account${((user.accounts).length) + 1}`;
    console.log("Acc Name ==> ", accountName);
    user.accounts.push({ name: accountName, address, privateKey });
    await user.save();

    ctx.reply(`
    Account Created 🎉:
    Name : \`${accountName}\`
    Address : \`${address}\`
    ⚠️ Please store your private key securely!
    `, { parse_mode: 'Markdown' });
});


bot.action('ethereum_price', async (ctx) => {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const rate = response.data.ethereum.usd;
    ctx.reply(`Hello, today the Ethereum price is ${rate} USD`);
});


bot.action('send_TBNB', async (ctx) => {
    // Explanation and example of how to enter the command
    ctx.reply('To send TBNB, please enter the command in the following format:\n/sendto [receiver_address] [amount]\n\nExample:\n/sendto 0x1234abcde... 10.5');
});





bot.command('sendto', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
        ctx.reply('Usage: /sendto [receiver_address] [amount]');
        return;
    }

    const receiverAddress = parts[1];
    const amount = parseFloat(parts[2]);

    if (!ethers.utils.isAddress(receiverAddress) || isNaN(amount) || amount <= 0) {
        ctx.reply('Invalid receiver address or amount. Please enter valid data.');
        return;
    }

    try {
        const newTransaction = new Transaction({
            telegramId: ctx.from.id.toString(),
            receiverAddress,
            amount,
            transactionHash: "not get..",
        });
        await newTransaction.save();

        ctx.reply('Transaction details saved. Please choose an account to send from.');

        // You can now pass the transaction ID or use another method to link to the account selection
        const user = await User.findOne({ telegramId: ctx.from.id.toString() });

        if (!user || user.accounts.length === 0) {
            ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
            return;
        }

        const accountButtons = user.accounts.map((account, index) =>
            Markup.button.callback(`${account.name}: ${account.address}`, `select_account_${index}_${newTransaction._id}`)
        );

        ctx.reply('Select an account to send from:', Markup.inlineKeyboard(accountButtons));
    } catch (error) {
        console.error('Failed to save transaction:', error);
        ctx.reply('Failed to prepare the transaction due to a server error.');
    }
});

bot.action(/^select_account_(\d+)_(\w+)$/, async (ctx) => {
    const index = parseInt(ctx.match[1]);
    const transactionId = ctx.match[2].toString(); // Convert transactionId to string
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    if (!user || index >= user.accounts.length) {
        ctx.reply("Invalid account selected.");
        return;
    }

    const selectedAccount = user.accounts[index];

    try {
        // Fetch the transaction from database

        const transaction = await Transaction.findById(transactionId);

        if (!transaction) {
            ctx.reply("Transaction not found.");
            return;
        }

        // Prepare the transaction to estimate gas
        const dummyTransaction = {
            to: transaction.receiverAddress,
            value: ethers.utils.parseEther(transaction.amount.toString()),
        };

        const wallet = new ethers.Wallet(selectedAccount.privateKey, provider);
        const estimatedGasLimit = await provider.estimateGas(dummyTransaction);
        const gasPrice = await provider.getGasPrice();
        const estimatedFee = estimatedGasLimit.mul(gasPrice);
        const balance = await wallet.getBalance();

        // Check if the balance is sufficient
        if (balance.sub(estimatedFee).lt(ethers.utils.parseEther(transaction.amount.toString()))) {
            ctx.reply('Insufficient balance to cover the transfer amount and network fee. Transaction canceled. ❌ ');
            return;
        }

        // Ask for user confirmation to proceed
        ctx.reply(`Confirm transaction:\nSend ${transaction.amount} TBNB to ${transaction.receiverAddress}\nEstimated network fee: ${ethers.utils.formatEther(estimatedFee)} TBNB`,
            Markup.inlineKeyboard([
                Markup.button.callback('Confirm Transaction', `confirm_transaction_${index}_${transactionId}`),
                Markup.button.callback('Cancel Transaction', `cancel_transaction_${index}_${transactionId}`)
            ])
        );

    } catch (error) {
        console.error('Error preparing transaction:', error);
        ctx.reply('Failed to prepare the transaction due to an error.');
    }
});

bot.action(/^confirm_transaction_(\d+)_(\w+)$/, async (ctx) => {
    const index = parseInt(ctx.match[1]);
    const transactionId = ctx.match[2].toString();
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    if (!user || index >= user.accounts.length) {
        ctx.reply("Invalid account selected.");
        return;
    }

    const selectedAccount = user.accounts[index];

    try {
        const transaction = await Transaction.findById(transactionId);
        console.log("tra ==> ", transaction, transactionId);
        if (!transaction) {
            ctx.reply("Transaction not found.");
            return;
        }

        const tx = {
            to: transaction.receiverAddress,
            value: ethers.utils.parseEther(transaction.amount.toString()),
        };

        const wallet = new ethers.Wallet(selectedAccount.privateKey, provider);
        const txResponse = await wallet.sendTransaction(tx);

        ctx.reply(`Transaction successful! ✅🥳 [${txResponse.hash}](https://testnet.bscscan.com/tx/${txResponse.hash})`, { parse_mode: 'Markdown' });


        transaction.transactionHash = txResponse.hash;
        transaction.status = 'confirmed';

        const account = user.accounts[index];
        account.transactions.push(transaction);

        await user.save();

        await transaction.save();

    } catch (error) {
        console.error('Error sending transaction:', error);
        ctx.reply('Failed to send the transaction. Please check the details and try again.');
    }
});





bot.action('cancel_transaction', async (ctx) => {
    try {
        const { userId } = ctx.match;
        // Assuming you have the transaction ID stored somewhere
        const transaction = await Transaction.findByIdAndDelete(userId);

        if (!transaction) {
            ctx.reply('Transaction not found.');
            return;
        }

        ctx.reply('Transaction canceled. ❌');
    } catch (error) {
        console.error('Error canceling transaction:', error);
        ctx.reply('Failed to cancel the transaction. Please try again later.');
    }
});



bot.action('view_transactions', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId }).populate({
        path: 'accounts',
        populate: { path: 'transactions' }
    });

    if (!user || user.accounts.length === 0) {
        ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
        return;
    }

    const accountButtons = user.accounts.map((account, index) => [
        Markup.button.callback(`${account.name}: ${account.address}`, `show_transactions_${index}`)]
    );

    ctx.reply('Select an account to view transactions:', Markup.inlineKeyboard(accountButtons));
});

bot.action(/^show_transactions_\d+$/, async (ctx) => {
    const index = parseInt(ctx.match[0].split('_')[2]);
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId }).populate({
        path: 'accounts',
        populate: { path: 'transactions' }
    });

    if (!user || index >= user.accounts.length) {
        ctx.reply("Invalid account selected.");
        return;
    }

    const selectedAccount = user.accounts[index];
    console.log("Selected ts ==> ", selectedAccount, index);
    let message = `Confirmed Transactions for ${selectedAccount.name}:\n`;

    // Filter out only the confirmed transactions
    const confirmedTransactions = selectedAccount.transactions.filter(transaction => transaction.status === 'confirmed');

    if (confirmedTransactions.length === 0) {
        ctx.reply("No confirmed transactions found for this account.");
        return;
    }

    confirmedTransactions.forEach(t => {
        message += `===> To: ${t.receiverAddress} - Amount: ${t.amount} TBNB - Hash: ${t.transactionHash}\n`;
    });

    ctx.reply(message);
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
    // const index = parseInt(ctx.match[0].split('_')[1]);
    // const telegramId = ctx.from.id.toString();

    // const user = await User.findOne({ telegramId });
    // if (!user || index >= user.accounts.length) {
    //     await ctx.reply("Invalid account selected.");
    //     return;
    // }

    // const selectedAccount = user.accounts[index];
    // const addr = selectedAccount.address;

    // if (testnet) {
    //     const accountButtons = TestChainList.map((name, index) => [
    //         Markup.button.callback(`${name}`, `showBalance_${name}_${selectedAccount}`)
    //     ]);
    //     await ctx.reply(`Account  ${selectedAccount.name} :`, Markup.inlineKeyboard(accountButtons));
    // }else{
    //     const accountButtons = MainChainList.map((name, index) => [
    //         Markup.button.callback(`${name}`, `showBalance_${name}_${selectedAccount}`)
    //     ]);
    //     await ctx.reply(`Account  ${selectedAccount.name} :`, Markup.inlineKeyboard(accountButtons));
    // }

    // console.log("Selectred account ==> ", selectedAccount.address);
    // console.log("Selectred account ==> ", selectedAccount.privateKey);
    // const senderPrivateKey = selectedAccount.privateKey;
    // const wallet = new ethers.Wallet(senderPrivateKey, provider);

    // const balance = await wallet.getBalance();
    // const bal = ethers.utils.formatEther(balance)

    // await ctx.replyWithMarkdown(`Balance for *${selectedAccount.name}*:\n${bal} TBNB`);
});

bot.action(/^showBalance_(\d+)_()$/, async (ctx) => {
    const chainName = (ctx.match[0].split('_')[1]).toString();
    const accountAddress = (ctx.match[0].split('_')[2]).toString();
    const telegramId = ctx.from.id.toString();

    const user = await User.findOne({ telegramId });
    if (!user || index >= user.accounts.length) {
        await ctx.reply("Invalid account selected.");
        return;
    }

    const addr = accountAddress.address;
    console.log("Selectred account ==> ", selectedAccount.address);
    console.log("Selectred account ==> ", selectedAccount.privateKey);
    const senderPrivateKey = selectedAccount.privateKey;
    const wallet = new ethers.Wallet(senderPrivateKey, provider);

    const balance = await wallet.getBalance();
    const bal = ethers.utils.formatEther(balance)

    await ctx.replyWithMarkdown(`Balance for *${selectedAccount.name}*:\n${bal} TBNB`);
});




bot.launch()


