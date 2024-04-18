import { Telegraf, session, Markup } from 'telegraf';
import { ethers } from 'ethers';
import axios from 'axios';
import QRCode from 'qrcode'
import mongoose from 'mongoose'
import { Network, Alchemy } from 'alchemy-sdk';
import dotenv from 'dotenv'
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAF_TOKEN);
const settings = {
    apiKey: process.env.ALCHAMY_API,
    network: Network.ETH_MAINNET,
};

const networkUrls = {
    ETH: 'https://eth-mainnet.g.alchemy.com/v2/ItgoVNyNoPC9rCLvlQO75I8rkwVTzvfM',
    Polygon: 'https://polygon-mainnet.g.alchemy.com/v2/O44lXnIsUAbCIt-EYiqZYQoafQGnxJ2p',
    Arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/YOcV5NVrXdZYCgECnYtLDmhdP-dR4xal',
    Optimism: 'https://opt-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    Amoy: 'https://polygon-amoy.g.alchemy.com/v2/OVVlE8kx_rjDzt71O9O5wRikv9vvABPq',
    Base: 'https://base-mainnet.g.alchemy.com/v2/bHtrXBhmAaNODnI6d7fyXogCpL-UVwkJ'
};

const alchemy = new Alchemy(settings);
const transactionData = {
    chainName: '',
    senderAddr: '',
    receiverAddr: '',
    privateKeyOfSender: '',
    amount: '',
    status: '',
    transactionHash: '',
};

const testChainData = [
    {
        name: 'Amoy',
        rpcUrl: 'https://rpc-amoy.polygon.technology/'
    },
    {
        name: 'tBNB',
        rpcUrl: 'https://bsc-testnet-rpc.publicnode.com'
    },
]
let testnet = true;

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
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
    senderAddress: { type: String, required: true },
    receiverAddress: { type: String, required: true },
    amount: { type: Number, required: true },
    transactionHash: { type: String, required: true },
    chainName: { type: String, require: true },
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

const TestChainList = ['Amoy']
const MainChainList = ['ETH', 'Polygon', 'Arbitrum', 'Optimism', 'Base']

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
                Markup.button.callback(' 💸 Send Token', 'send_token'),
            ],
            [
                Markup.button.callback(' 🔗 Show all Chain ', 'allChains'),
                Markup.button.callback(' 🪙 ETH Pice', 'ethereum_price'),
            ],
            [
                Markup.button.callback(' 📝 View Transactions', 'view_transactions'),
                Markup.button.callback(' 💫 All Network', 'all_network'),
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
                Markup.button.callback(' 💸 Send Token', 'send_token'),
            ],
            [
                Markup.button.callback(' 🔗 Show all Chain ', 'allChains'),
                Markup.button.callback(' 🪙 ETH Pice', 'ethereum_price'),
            ],
            [
                Markup.button.callback(' 📝 View Transactions', 'view_transactions'),
                Markup.button.callback(' 💫 All Network', 'all_network'),
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
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
    } catch (error) {
        console.error('Error deleting message:', error);
    }
    ctx.reply(' ⚠️ Mainnet activated.', getMainMenu(testnet));
});
bot.action('testnetOn', async (ctx) => {
    testnet = true;
    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
    } catch (error) {
        console.error('Error deleting message:', error);
    }
    ctx.reply(' ✅ Testnet activated.', getMainMenu(testnet));
});

bot.action('testnets', async (ctx) => {
    if (!ChainList) {
        await ctx.reply("No chain Avalabale.");
        return;
    }

    const accountButtons = ChainList.map((name, index) => [
        Markup.button.callback(`${name}`, `deposit_${index}`)
    ]);

    await ctx.reply('Select chain to deposit into:', Markup.inlineKeyboard(accountButtons));
});

bot.action('deposit', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    const user = await User.findOne({ telegramId });
    if (!user || user.accounts.length === 0) {
        await ctx.reply("You haven't created any accounts yet. Use /create_account to create one.");
        return;
    }
    const accountButtons = user.accounts.map((account, index) => [
        Markup.button.callback(`${account.name}: ${account.address}`, `deposit_${index}`)
    ]);
    await ctx.reply('Select an account to deposit into:', Markup.inlineKeyboard(accountButtons));
});

bot.action('allChains', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    if (testnet) {
        const accountButtons = TestChainList.map((name, index) => [
            Markup.button.callback(`${name}`, `network_${index}`)
        ]);
        await ctx.reply('Select an chian to deposit into:', Markup.inlineKeyboard(accountButtons));
    } else {
        const accountButtons = MainChainList.map((name, index) => [
            Markup.button.callback(`${name}`, `network_${index}`)
        ]);
        await ctx.reply('Select an chian to deposit into:', Markup.inlineKeyboard(accountButtons));
    }

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

    try {
        let addr = selectedAccount.address;
        const depositQR = await QRCode.toDataURL(addr);

        await ctx.replyWithPhoto({ source: Buffer.from(depositQR.split(',')[1], 'base64') }, { caption: `Scan this QR code to deposit TBNB into account No. ${index + 1} -> ${selectedAccount.name}.` });

        await ctx.replyWithMarkdown(`To deposit into *Account No. ${index + 1} -->> ${selectedAccount.name}* , send TBNB to the following address:\n\`${selectedAccount.address}\`\n\n⚠️ Please double-check the address before sending.`);
    } catch (error) {
        console.error('Error generating QR code:', error);
        await ctx.reply('Failed to generate QR code. Please try again later.');
    }
});

bot.help((ctx) => {
    ctx.reply(`Here are the commands you can use:
- /start - Start interacting with the bot
- /sendto <receiver_address> <amount> - Send token to another account
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
    ctx.reply(`Hello 👋, today the Ethereum price is ${rate} USD`);
});



// for Token Transactions

bot.action('send_token', async (ctx) => {
    if (testnet) {
        const accountButtons = TestChainList.map((name, index) => [
            Markup.button.callback(`${name}`, `selecteChain_${name}`)
        ]);
        await ctx.reply(`Selecte chain to do transaction in testnet :`, Markup.inlineKeyboard(accountButtons));
    } else {
        const accountButtons = MainChainList.map((name, index) => [
            Markup.button.callback(`${name}`, `selecteChain_${name}`)
        ]);
        await ctx.reply(`Selecte chain to do transaction :`, Markup.inlineKeyboard(accountButtons));
    }

});

bot.action(/^selecteChain_\w+$/, async (ctx) => {
    const chainName = (ctx.match[0].split('_')[1]).toString();
    transactionData.chainName = chainName;
    try {
        // ctx.reply('Transaction details saved. Please choose an account to send from.');

        // You can now pass the transaction ID or use another method to link to the account selection
        const user = await User.findOne({ telegramId: ctx.from.id.toString() });

        if (!user || user.accounts.length === 0) {
            ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
            return;
        }

        const accountButtons = user.accounts.map((account, index) =>
            [Markup.button.callback(`${account.name}: ${account.address}`, `selectAccount_${index}`)]
        );

        ctx.reply('Select an account to send from:', Markup.inlineKeyboard(accountButtons));
    } catch (error) {
        console.error('Failed to save transaction:', error);
        ctx.reply('Failed to prepare the transaction due to a server error.');
    }
})

bot.action(/^selectAccount_(\w+)$/, async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const addressIdx = (ctx.match[0].split('_')[1]).toString();
    const user = await User.findOne({ telegramId })
    const accountAddr = user.accounts[addressIdx].address;
    const priKey = user.accounts[addressIdx].privateKey;

    transactionData.senderAddr = accountAddr;
    transactionData.privateKeyOfSender = priKey;

    ctx.reply('To send TBNB, please enter the command in the following format:\n/sendto [receiver_address] [amount]\n\nExample:\n/sendto 0x1234abcde... 10.5');
    // console.log("Transaction data - > ", transactionData);
})

bot.command('sendto', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 3) {
        return ctx.reply('Usage: /sendto [receiver_address] [amount]');
    }

    const receiverAddress = parts[1];
    const amount = parseFloat(parts[2]);
    if (!ethers.utils.isAddress(receiverAddress) || isNaN(amount) || amount <= 0) {
        return ctx.reply('Invalid receiver address or amount. Please enter valid data.');
    }

    transactionData.receiverAddr = receiverAddress;
    transactionData.amount = amount.toString();
    transactionData.status = 'pending';

    prepareAndConfirmTransaction(ctx, transactionData);
});

async function prepareAndConfirmTransaction(ctx, transaction) {

    try {
        if (!transaction) {
            ctx.reply("Transaction not found.");
            return;
        }

        const dummyTransaction = {
            to: transaction.receiverAddress,
            value: ethers.utils.parseEther(transaction.amount.toString()),
        };
        const rpcUrl = networkUrls[transaction.chainName];
        if (!rpcUrl) {
            throw new Error('Unsupported network or network configuration missing.');
        }

        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const priKey = transaction.privateKeyOfSender;
        const wallet = new ethers.Wallet(priKey, provider);
        const estimatedGasLimit = await provider.estimateGas(dummyTransaction);
        const gasPrice = await provider.getGasPrice();
        const estimatedFee = estimatedGasLimit.mul(gasPrice);
        const balance = await wallet.getBalance();

        if (balance.sub(estimatedFee).lt(ethers.utils.parseEther(transaction.amount.toString()))) {
            ctx.reply(`estimatedFee : ${estimatedFee} and Amount : ${transaction.amount} and Balance : ${balance}
            Insufficient balance to cover the transfer amount and network fee. Transaction canceled. ❌ `);
            return;
        }

        ctx.reply(`Confirm transaction:\n- Amount: ${transaction.amount} ${transaction.chainName} Tokens\n- To: ${transaction.receiverAddr}\n- Fee: ${estimatedFee} ${transaction.chainName} Tokens\nPress 'Confirm' to proceed or 'Cancel' to abort. `,
            Markup.inlineKeyboard([
                Markup.button.callback('Confirm Transaction', `confirm_transaction`),
                Markup.button.callback('Cancel Transaction', `cancel_transaction`)
            ])
        );
    } catch (error) {
        console.error('Error preparing transaction:', error);
        ctx.reply('Failed to prepare the transaction due to an error.');
    }
}

bot.action('confirm_transaction', async (ctx) => {
    const transaction = transactionData;

    ctx.reply(`please wait!! transaction is pandding... ⚠️`);
    const result = await executeBlockchainTransaction(transaction);

    if (result.success) {
        transaction.transactionHash = result.hash;
        transaction.status = 'confirmed';

        const newTransaction = new Transaction({
            telegramId: ctx.from.id,
            senderAddress: transaction.senderAddr,
            receiverAddress: transaction.receiverAddr,
            amount: transaction.amount,
            transactionHash: transaction.transactionHash,
            chainName: transaction.chainName,
            status: transaction.status
        });

        try {
            await newTransaction.save();
            // console.log('Transaction saved successfully:', newTransaction);
        } catch (error) {
            console.error('Failed to save transaction:', error);
        }
        ctx.reply(`Transaction confirmed! ✅ Transaction Hash: ${result.hash}`);
    } else {
        ctx.reply(`Transaction failed to execute: ❌ ${result.error}`);
    }
});

bot.action('cancel_transaction', async (ctx) => {
    ctx.reply('Transaction canceled.');
});

async function executeBlockchainTransaction(transaction) {
    try {
        const rpcUrl = networkUrls[transaction.chainName];
        if (!rpcUrl) {
            throw new Error('Unsupported network or network configuration missing.');
        }

        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

        const wallet = new ethers.Wallet(transaction.privateKeyOfSender, provider);

        const tx = {
            to: transaction.receiverAddr,
            value: ethers.utils.parseEther(transaction.amount.toString()),
        };

        const txResponse = await wallet.sendTransaction(tx);
        await txResponse.wait();
        return { success: true, hash: txResponse.hash };
    } catch (error) {
        console.error('Failed to execute transaction:', error);
        return { success: false, error: error.message };
    }
}





// for balance chack

bot.action('check_balance', async (ctx) => {

    if (testnet) {
        const accountButtons = TestChainList.map((name, index) => [
            Markup.button.callback(`${name}`, `balance_${name}`)
        ]);
        await ctx.reply(`Selecte chain for show balance :`, Markup.inlineKeyboard(accountButtons));
    } else {
        const accountButtons = MainChainList.map((name, index) => [
            Markup.button.callback(`${name}`, `balance_${name}`)
        ]);
        await ctx.reply(`Selecte chain for show balance :`, Markup.inlineKeyboard(accountButtons));
    }


});

bot.action(/^balance_\w+$/, async (ctx) => {
    const chainName = (ctx.match[0].split('_')[1]).toString();
    const telegramId = ctx.from.id.toString();


    const user = await User.findOne({ telegramId });
    if (!user || user.accounts.length === 0) {
        await ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
        return;
    }
    const accountButtons = user.accounts.map((account, index) => [
        Markup.button.callback(`${account.name} - ${account.address}`, `showBalance_${index}_${chainName}`)
    ]);

    await ctx.replyWithMarkdown(`Select an account to check the balance for *${chainName} chain* :`, Markup.inlineKeyboard(accountButtons));

});

bot.action(/^showBalance_(\d+)_(\w+)$/, async (ctx) => {
    const accountIdx = ctx.match[1];
    const chainName = ctx.match[2];
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    if (!user || accountIdx >= user.accounts.length) {
        await ctx.reply("Invalid account selected.");
        return;
    }

    const selectedAccount = user.accounts[accountIdx];
    const account = selectedAccount.address;

    if (testnet) {
        const chainData = testChainData.find(chain => chain.name === chainName);
        if (!chainData) {
            await ctx.reply("Chain not supported.");
            return;
        }

        const rpcUrl = chainData.rpcUrl;

        try {
            switch (chainName) {
                case 'Amoy':
                    alchemy.config.network = Network.MATIC_AMOY;
                    break;
                default:
                    await ctx.reply("Unsupported network.");
                    return;
            }

            try {
                const etherBalance = await alchemy.core.getBalance(account);
                const formattedEtherBalance = ethers.utils.formatEther(etherBalance);
                await ctx.replyWithMarkdown(`Balance for *${selectedAccount.name}* on ${chainName}:\n${formattedEtherBalance} ${chainName} Tokens`);
            } catch (error) {
                console.error("Error fetching balances: ", error);
                await ctx.reply("Failed to fetch balances.");
            }

        } catch (error) {
            console.error("Error fetching balances: ", error);
            await ctx.reply("Failed to fetch balances.");
        }



    } else {
        try {
            switch (chainName) {
                case 'ETH':
                    alchemy.config.network = Network.ETH_MAINNET;
                    break;
                case 'Polygon':
                    alchemy.config.network = Network.MATIC_MAINNET;
                    break;
                case 'Arbitrum':
                    alchemy.config.network = Network.ARB_MAINNET;
                    break;
                case 'Optimism':
                    alchemy.config.network = Network.OPT_MAINNET;
                    break;
                case 'Base':
                    alchemy.config.network = Network.BASE_MAINNET;
                    break;
                default:
                    await ctx.reply("Unsupported network.");
                    return;
            }

            try {
                const etherBalance = await alchemy.core.getBalance(account);
                const formattedEtherBalance = ethers.utils.formatEther(etherBalance);
                await ctx.replyWithMarkdown(`Balance for *${selectedAccount.name}* on ${chainName}:\n${formattedEtherBalance} ${chainName} Tokens`);
            } catch (error) {
                console.error("Error fetching balances: ", error);
                await ctx.reply("Failed to fetch balances.");
            }

        } catch (error) {
            console.error("Error fetching balances: ", error);
            await ctx.reply("Failed to fetch balances.");
        }
    }
});


//transaction History

bot.action('view_transactions', async (ctx) => {
    const telegramId = ctx.from.id.toString();

    // Fetch all transactions for the user from the Transaction collection
    const transactions = await Transaction.find({ telegramId });
    if (!transactions || transactions.length === 0) {
        await ctx.reply("You don't have any transactions yet.");
        return;
    }

    let message = '📜 Transaction History:\n';
    transactions.forEach((transaction, index) => {
        message += `${index + 1}. Amount: ${transaction.amount} ${transaction.chainName} Tokens\n`;
        message += `   From: ${transaction.senderAddress}\n`;
        message += `   To: ${transaction.receiverAddress}\n`;
        message += `   Status: ${transaction.status}\n`;
        message += `   Hash: ${transaction.transactionHash}\n`;
        message += `   Date: ${transaction.createdAt.toDateString()}\n\n`;
    });

    // Send the constructed message
    await ctx.replyWithMarkdown(message);
});


bot.launch()


























// bot.action('send_token', async (ctx) => {
//     if (testnet) {
//         const accountButtons = TestChainList.map((name, index) => [
//             Markup.button.callback(`${name}`, `selecteChain_${name}`)
//         ]);
//         await ctx.reply(`Selecte chain to do transaction in testnet :`, Markup.inlineKeyboard(accountButtons));
//     } else {
//         const accountButtons = MainChainList.map((name, index) => [
//             Markup.button.callback(`${name}`, `selecteChain_${name}`)
//         ]);
//         await ctx.reply(`Selecte chain to do transaction :`, Markup.inlineKeyboard(accountButtons));
//     }

//     ctx.reply('To send TBNB, please enter the command in the following format:\n/sendto [receiver_address] [amount]\n\nExample:\n/sendto 0x1234abcde... 10.5');
// });

// bot.action(/^selecteChain_\w+$/, async (ctx) => {
//     const chainName = (ctx.match[0].split('_')[1]).toString();
//     // transactionData.chainName = ''
//     // transactionData.senderAddr = ''
//     // transactionData.resceiverAddr = ''
//     // transactionData.privateKeyOfSender = ''
//     // transactionData.amount = ''
//     // transactionData.status = ''
//     // transactionData.transactionHash = ''

//     transactionData.chainName = chainName;
//     try {
//         ctx.reply('Transaction details saved. Please choose an account to send from.');

//         // You can now pass the transaction ID or use another method to link to the account selection
//         const user = await User.findOne({ telegramId: ctx.from.id.toString() });

//         if (!user || user.accounts.length === 0) {
//             ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
//             return;
//         }

//         const accountButtons = user.accounts.map((account, index) =>
//             [Markup.button.callback(`${account.name}: ${account.address}`, `selectAccount_${index}`)]
//         );

//         ctx.reply('Select an account to send from:', Markup.inlineKeyboard(accountButtons));
//     } catch (error) {
//         console.error('Failed to save transaction:', error);
//         ctx.reply('Failed to prepare the transaction due to a server error.');
//     }
// })

// bot.action(/^selectAccount_(\w+)$/, async (ctx) => {
//     const telegramId = ctx.from.id.toString();
//     const addressIdx = (ctx.match[0].split('_')[1]).toString();
//     const user = await User.findOne({ telegramId })
//     const accountAddr = user.accounts[addressIdx].address;
//     const priKey = user.accounts[addressIdx].privateKey;

//     transactionData.senderAddr = accountAddr;
//     transactionData.privateKeyOfSender = priKey;

//     console.log("Transaction data - > ", transactionData);
// })

// bot.command('sendto', async (ctx) => {
//     const parts = ctx.message.text.split(' ');
//     if (parts.length < 3) {
//         ctx.reply('Usage: /sendto [receiver_address] [amount]');
//         return;
//     }

//     const receiverAddress = parts[1];
//     const amount = parseFloat(parts[2]);

//     if (!ethers.utils.isAddress(receiverAddress) || isNaN(amount) || amount <= 0) {
//         ctx.reply('Invalid receiver address or amount. Please enter valid data.');
//         return;
//     }

//     try {
//         const newTransaction = new Transaction({
//             telegramId: ctx.from.id.toString(),
//             receiverAddress,
//             amount,
//             transactionHash: "not get..",
//         });
//         await newTransaction.save();

//         ctx.reply('Transaction details saved. Please choose an account to send from.');

//         // You can now pass the transaction ID or use another method to link to the account selection
//         const user = await User.findOne({ telegramId: ctx.from.id.toString() });

//         if (!user || user.accounts.length === 0) {
//             ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
//             return;
//         }

//         const accountButtons = user.accounts.map((account, index) =>
//             [Markup.button.callback(`${account.name}: ${account.address}`, `select_account_${index}_${newTransaction._id}`)]
//         );

//         ctx.reply('Select an account to send from:', Markup.inlineKeyboard(accountButtons));
//     } catch (error) {
//         console.error('Failed to save transaction:', error);
//         ctx.reply('Failed to prepare the transaction due to a server error.');
//     }
// });

// bot.action(/^select_account_(\d+)_(\w+)$/, async (ctx) => {
//     const index = parseInt(ctx.match[1]);
//     const transactionId = ctx.match[2].toString(); // Convert transactionId to string
//     const telegramId = ctx.from.id.toString();
//     const user = await User.findOne({ telegramId });

//     if (!user || index >= user.accounts.length) {
//         ctx.reply("Invalid account selected.");
//         return;
//     }

//     const selectedAccount = user.accounts[index];

//     try {
//         const transaction = await Transaction.findById(transactionId);

//         if (!transaction) {
//             ctx.reply("Transaction not found.");
//             return;
//         }

//         const dummyTransaction = {
//             to: transaction.receiverAddress,
//             value: ethers.utils.parseEther(transaction.amount.toString()),
//         };

//         const wallet = new ethers.Wallet(selectedAccount.privateKey, provider);
//         const estimatedGasLimit = await provider.estimateGas(dummyTransaction);
//         const gasPrice = await provider.getGasPrice();
//         const estimatedFee = estimatedGasLimit.mul(gasPrice);
//         const balance = await wallet.getBalance();

//         // Check if the balance is sufficient
//         if (balance.sub(estimatedFee).lt(ethers.utils.parseEther(transaction.amount.toString()))) {
//             ctx.reply('Insufficient balance to cover the transfer amount and network fee. Transaction canceled. ❌ ');
//             return;
//         }

//         // Ask for user confirmation to proceed
//         ctx.reply(`Confirm transaction:\nSend ${transaction.amount} TBNB to ${transaction.receiverAddress}\nEstimated network fee: ${ethers.utils.formatEther(estimatedFee)} TBNB`,
//             Markup.inlineKeyboard([
//                 Markup.button.callback('Confirm Transaction', `confirm_transaction_${index}_${transactionId}`),
//                 Markup.button.callback('Cancel Transaction', `cancel_transaction_${index}_${transactionId}`)
//             ])
//         );

//     } catch (error) {
//         console.error('Error preparing transaction:', error);
//         ctx.reply('Failed to prepare the transaction due to an error.');
//     }
// });

// bot.action(/^confirm_transaction_(\d+)_(\w+)$/, async (ctx) => {
//     const index = parseInt(ctx.match[1]);
//     const transactionId = ctx.match[2].toString();
//     const telegramId = ctx.from.id.toString();
//     const user = await User.findOne({ telegramId });

//     if (!user || index >= user.accounts.length) {
//         ctx.reply("Invalid account selected.");
//         return;
//     }

//     const selectedAccount = user.accounts[index];

//     try {
//         const transaction = await Transaction.findById(transactionId);
//         console.log("tra ==> ", transaction, transactionId);
//         if (!transaction) {
//             ctx.reply("Transaction not found.");
//             return;
//         }

//         const tx = {
//             to: transaction.receiverAddress,
//             value: ethers.utils.parseEther(transaction.amount.toString()),
//         };

//         const wallet = new ethers.Wallet(selectedAccount.privateKey, provider);
//         const txResponse = await wallet.sendTransaction(tx);

//         ctx.reply(`Transaction successful! ✅🥳 [${txResponse.hash}](https://testnet.bscscan.com/tx/${txResponse.hash})`, { parse_mode: 'Markdown' });


//         transaction.transactionHash = txResponse.hash;
//         transaction.status = 'confirmed';

//         const account = user.accounts[index];
//         account.transactions.push(transaction);

//         await user.save();

//         await transaction.save();

//     } catch (error) {
//         console.error('Error sending transaction:', error);
//         ctx.reply('Failed to send the transaction. Please check the details and try again.');
//     }
// });

// bot.action('cancel_transaction', async (ctx) => {
//     try {
//         const { userId } = ctx.match;
//         // Assuming you have the transaction ID stored somewhere
//         const transaction = await Transaction.findByIdAndDelete(userId);

//         if (!transaction) {
//             ctx.reply('Transaction not found.');
//             return;
//         }

//         ctx.reply('Transaction canceled. ❌');
//     } catch (error) {
//         console.error('Error canceling transaction:', error);
//         ctx.reply('Failed to cancel the transaction. Please try again later.');
//     }
// });

// bot.action('view_transactions', async (ctx) => {
//     const telegramId = ctx.from.id.toString();
//     const user = await User.findOne({ telegramId }).populate({
//         path: 'accounts',
//         populate: { path: 'transactions' }
//     });

//     if (!user || user.accounts.length === 0) {
//         ctx.reply("You don't have any accounts yet. Use /create_account to create one.");
//         return;
//     }

//     const accountButtons = user.accounts.map((account, index) => [
//         Markup.button.callback(`${account.name}: ${account.address}`, `show_transactions_${index}`)]
//     );

//     ctx.reply('Select an account to view transactions:', Markup.inlineKeyboard(accountButtons));
// });

// bot.action(/^show_transactions_\d+$/, async (ctx) => {
//     const index = parseInt(ctx.match[0].split('_')[2]);
//     const telegramId = ctx.from.id.toString();
//     const user = await User.findOne({ telegramId }).populate({
//         path: 'accounts',
//         populate: { path: 'transactions' }
//     });

//     if (!user || index >= user.accounts.length) {
//         ctx.reply("Invalid account selected.");
//         return;
//     }

//     const selectedAccount = user.accounts[index];
//     console.log("Selected ts ==> ", selectedAccount, index);
//     let message = `Confirmed Transactions for ${selectedAccount.name}:\n`;

//     // Filter out only the confirmed transactions
//     const confirmedTransactions = selectedAccount.transactions.filter(transaction => transaction.status === 'confirmed');

//     if (confirmedTransactions.length === 0) {
//         ctx.reply("No confirmed transactions found for this account.");
//         return;
//     }

//     confirmedTransactions.forEach(t => {
//         message += `===> To: ${t.receiverAddress} - Amount: ${t.amount} TBNB - Hash: ${t.transactionHash}\n`;
//     });

//     ctx.reply(message);
// });

// bot.action(/^cancel_send_(\d+)$/, (ctx) => {
//     const userId = ctx.match[1];
//     delete pendingTransactions[userId]; // Clean up the stored transaction data
//     ctx.reply('Transaction canceled. ❌ ');
// });





// if (transaction.chainName === 'Solana') {
//     const { Connection, PublicKey, Transaction: SolanaTransaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');

//     const connection = new Connection(process.env.SOLANA_RPC_URL);
//     const senderPublicKey = new PublicKey(transaction.senderAddr);
//     const receiverPublicKey = new PublicKey(transaction.receiverAddress);
//     const signer = {
//         publicKey: senderPublicKey,
//         secretKey: new Uint8Array(JSON.parse(transaction.privateKeyOfSender)), // Assuming the private key is stored securely and serialized
//     };

//     const solanaTx = new SolanaTransaction().add(
//         SystemProgram.transfer({
//             fromPubkey: senderPublicKey,
//             toPubkey: receiverPublicKey,
//             lamports: SolanaTransaction.lamportsPerSol * parseFloat(transaction.amount), // Convert SOL to lamports
//         })
//     );

//     try {
//         const signature = await sendAndConfirmTransaction(connection, solanaTx, [signer]);
//         return { success: true, hash: signature };
//     } catch (error) {
//         console.error('Failed to execute Solana transaction:', error);
//         return { success: false, error: error.message };
//     }
// }
