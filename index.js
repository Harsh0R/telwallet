import { Telegraf, session, Markup } from 'telegraf';
import { ethers } from 'ethers';
import axios from 'axios';
import QRCode from 'qrcode'
import mongoose from 'mongoose'
// import { connectDB } from './db.js'

const bot = new Telegraf('7190257079:AAGPN69Y9q9irb4Dx6l-G4yOudDck21W97c');
// const provider = new ethers.providers.JsonRpcProvider('https://rpc-mumbai.polygon.technology/');
const provider = new ethers.providers.JsonRpcProvider('https://bsc-testnet-rpc.publicnode.com');

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


const funnyNames = ['SillySquid', 'WackyWalrus', 'GoofyGiraffe', 'CheekyChinchilla', 'JollyJellyfish'];

function generateFunnyName() {
    const randomIndex = Math.floor(Math.random() * funnyNames.length);
    return funnyNames[randomIndex];
}

function getMainMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(' 🚀 Create Acc ', 'create_account'),
            Markup.button.callback(' 💵 Deposit TBNB ', 'deposit'),
        ],
        [
            Markup.button.callback(' 💰 Chaeck Balance ', 'check_balance'),
            Markup.button.callback(' 💸 Send TBNB ', 'send_TBNB'),
            Markup.button.callback(' 🪙 ETH Pice', 'ethereum_price'),
        ],
        [
            Markup.button.callback(' ⚙️ Setting', 'setting'),
            Markup.button.callback(' 📝 View Transactions', 'view_transactions'),
            // Markup.button.callback(' 😟 Quit ', 'quit'),
        ]
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


bot.use(session());

bot.command('testsession', (ctx) => {
    if (!ctx.session.counter) ctx.session.counter = 0;
    ctx.session.counter++;
    ctx.reply(`Counter is ${ctx.session.counter}`);
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
    const accountName = generateFunnyName();
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
            transactionHash:"not get..",
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

    const accountButtons = user.accounts.map((account, index) =>
        Markup.button.callback(`${account.name}: ${account.address}`, `show_transactions_${index}`)
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
    console.log("Selected ts ==> ",selectedAccount , index);
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
    // const balance = selectedAccount.balance;
    const addr = selectedAccount.address;
    console.log("Selectred account ==> ", selectedAccount.address);
    console.log("Selectred account ==> ", selectedAccount.privateKey);
    // const senderPrivateKey = 'f8610ba275562cbc18233acbc6b0769c943c027ef50610002633de5814e1174d'; 
    const senderPrivateKey = selectedAccount.privateKey;
    const wallet = new ethers.Wallet(senderPrivateKey, provider);

    const balance = await wallet.getBalance();
    const bal = ethers.utils.formatEther(balance)
    // console.log("Ba;ance ==> " , bal);

    await ctx.replyWithMarkdown(`Balance for *${selectedAccount.name}*:\n${bal} TBNB`);
});




bot.launch()
































































// bot.command('sendto', async (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length !== 3) {
//         ctx.reply('Usage: /sendto [receiver_address] [amount]');
//         return;
//     }

//     const receiverAddress = parts[1];
//     const amount = parseFloat(parts[2]);

//     // Validate the receiver's Ethereum address
//     if (!ethers.utils.isAddress(receiverAddress)) {
//         ctx.reply('Invalid Ethereum address. Please enter a valid address.');
//         return;
//     }

//     // Validate the amount
//     if (isNaN(amount) || amount <= 0) {
//         ctx.reply('Invalid amount. Please enter a valid number greater than zero.');
//         return;
//     }

//     // Retrieve user data and prompt to select an account
//     const telegramId = ctx.from.id.toString();
//     const user = await User.findOne({ telegramId });

//     if (!user || user.accounts.length === 0) {
//         ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
//         return;
//     }

//     const accountButtons = user.accounts.map((account, index) =>
//         Markup.button.callback(`${account.name}: ${account.address}`, `select_account_${index}`)
//     );

//     ctx.reply('Select an account to send from:', Markup.inlineKeyboard(accountButtons));
// });















// Extended sendTBNB command with interactive confirmation
// bot.command('sendTBNB', async (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length < 3) {
//         ctx.reply('Usage: /sendTBNB <receiver_address> <amount>');
//         return;
//     }
//     const receiverAddress = parts[1];
//     const amount = parseFloat(parts[2]);
//     const userId = ctx.from.id.toString();

//     if (!ethers.utils.isAddress(receiverAddress) || isNaN(amount) || amount <= 0) {
//         ctx.reply('Invalid receiver address or amount. Please check your input and try again.');
//         return;
//     }

//     const user = await User.findOne({ telegramId: userId });
//     if (!user || user.accounts.length === 0) {
//         ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
//         return;
//     }

//     const senderAccount = user.accounts[0]; // Assuming using the first account
//     const wallet = new ethers.Wallet(senderAccount.privateKey, provider);

//     try {
//         const dummyTransaction = {
//             to: receiverAddress,
//             value: ethers.utils.parseEther(amount.toString()),
//         };

//         const estimatedGasLimit = await provider.estimateGas(dummyTransaction);
//         const gasPrice = await provider.getGasPrice();
//         const estimatedFee = estimatedGasLimit.mul(gasPrice);
//         const balance = await wallet.getBalance();

//         if (balance.sub(estimatedFee).lt(ethers.utils.parseEther(amount.toString()))) {
//             ctx.reply('Insufficient balance to cover the transfer amount and network fee. Transaction canceled. ❌');
//             return;
//         }

//         // Store transaction details using userId as key
//         pendingTransactions[userId] = {
//             receiverAddress,
//             amount,
//             gasLimit: estimatedGasLimit,
//             gasPrice,
//             estimatedFee
//         };

//         ctx.reply(`Confirm sending ${amount} TBNB to ${receiverAddress}.\nEstimated network fee: ${ethers.utils.formatEther(estimatedFee)} TBNB`, Markup.inlineKeyboard([
//             Markup.button.callback('Yes', `confirm_send_${userId}`),
//             Markup.button.callback('No', `cancel_send_${userId}`)
//         ]));
//     } catch (error) {
//         console.error('Error preparing transaction:', error);
//         ctx.reply('Failed to prepare the transaction. Please try again later.');
//     }
// });

// bot.action(/^confirm_send_(\d+)$/, async (ctx) => {
//     const userId = ctx.match[1];
//     const transaction = pendingTransactions[userId];

//     if (!transaction) {
//         await ctx.reply('Transaction details not found. 😟');
//         return;
//     }

//     const { receiverAddress, amount, gasLimit, gasPrice, estimatedFee } = transaction;
//     const senderAccount = (await User.findOne({ telegramId: userId })).accounts[0]; // Assuming the first account
//     const wallet = new ethers.Wallet(senderAccount.privateKey, provider);

//     try {
//         const balance = await wallet.getBalance();

//         if (balance.sub(estimatedFee).lt(ethers.utils.parseEther(amount.toString()))) {
//             ctx.reply('Insufficient balance to cover the transfer amount and network fee after gas cost estimation. Transaction canceled. ❌');
//             delete pendingTransactions[userId]; // Clean up
//             return;
//         }

//         const tx = {
//             to: receiverAddress,
//             value: ethers.utils.parseEther(amount.toString()),
//             gasLimit,
//             gasPrice
//         };

//         const txResponse = await wallet.sendTransaction(tx);
//         ctx.reply(`Transaction successful! ✅🥳 [${txResponse.hash}](https://bscscan.com/tx/${txResponse.hash})`, { parse_mode: 'Markdown' });

//         // Optionally save transaction to the database here if needed

//         delete pendingTransactions[userId]; // Clean up after transaction
//     } catch (error) {
//         console.error('Error during transaction:', error);
//         ctx.reply('Failed to complete transaction. Please try again.');
//     }
// });

// bot.action(/^cancel_send_(\d+)$/, (ctx) => {
//     const userId = ctx.match[1];
//     delete pendingTransactions[userId];
//     ctx.reply('Transaction canceled. ❌');
// });


// bot.action(/^balance_\d+$/, async (ctx) => {
//     const index = parseInt(ctx.match[0].split('_')[1]);
//     const telegramId = ctx.from.id.toString();
//     const user = await User.findOne({ telegramId }).populate('accounts.transactions');

//     if (!user || index >= user.accounts.length) {
//         ctx.reply("Invalid account selected.");
//         return;
//     }

//     const selectedAccount = user.accounts[index];
//     console.log("Selectred Acc ==> " , selectedAccount);
//     let message = `Balance for *${selectedAccount.name}*: ${ethers.utils.formatEther(await wallet.getBalance())} TBNB\n\nRecent Transactions:\n`;

//     selectedAccount.transactions.slice(-5).forEach(t => {
//         message += `To: ${t.receiverAddress} - Amount: ${t.amount} TBNB - Hash: ${t.transactionHash}\n`;
//     });

//     ctx.replyWithMarkdown(message);
// });





































// bot.command('sendTBNB1', async (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length < 3) {
//         await ctx.reply('Usage: /sendTBNB <receiver_address> <amount_in_TBNB>\nExample: /sendTBNB 0x1234... 0.1', { parse_mode: 'Markdown' });
//         return;
//     }

//     const receiverAddress = parts[1];
//     const amount = parts[2];

//     // Validate Ethereum address format (basic validation)
//     if (!ethers.utils.isAddress(receiverAddress)) {
//         await ctx.reply('🚫 The receiver address is not valid. Please provide a valid Polygon (TBNB) address.');
//         return;
//     }

//     // Validate amount
//     if (isNaN(amount) || parseFloat(amount) <= 0) {
//         await ctx.reply('🚫 The amount to send must be a positive number. Please specify a valid amount of TBNB.');
//         return;
//     }

//     // Confirmation message with details before proceeding
//     await ctx.reply(`You're about to send ${amount} TBNB to ${receiverAddress}.\nPlease confirm by typing /confirm`, { parse_mode: 'Markdown' });
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

// bot.command('sendTBNB', async (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length < 3) {
//         ctx.reply('Usage: /sendTBNB <receiver_address> <amount>');
//         return;
//     }
//     const receiverAddress = parts[1];
//     const amount = parts[2];

//     // Basic validation here...

//     ctx.reply(`Confirm sending ${amount} TBNB to ${receiverAddress}`, Markup.inlineKeyboard([
//         Markup.button.callback('Yes', 'confirm_send'),
//         Markup.button.callback('No', 'cancel_send')
//     ]));
// });
// bot.action('confirm_send', async (ctx) => {
//     console.log("In Send TBNB");
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
//         console.error('Error sending TBNB:', error);
//         await ctx.reply('Failed to send TBNB. Please check the details and try again.');
//     }
// });




// bot.action('cancel_send', (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length < 3) {
//         ctx.reply('Usage: /sendTBNB <receiver_address> <amount>');
//         return;
//     }
//     const receiverAddress = parts[1];
//     const amount = parts[2];

//     // Basic validation here...

//     ctx.reply(`Confirm sending ${amount} TBNB to ${receiverAddress}`);

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

