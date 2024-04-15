import { Markup } from 'telegraf';
import { ethers } from 'ethers';
import axios from 'axios';
import QRCode from 'qrcode';
import { User, Transaction } from './models';

export async function handleStart(ctx) {
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
}

export async function handleTestSession(ctx) {
    if (!ctx.session.counter) ctx.session.counter = 0;
    ctx.session.counter++;
    ctx.reply(`Counter is ${ctx.session.counter}`);
}

export async function handleDeposit(ctx) {
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
}


export async function handleAllChains(ctx) {
    const ChainList = ['Amoy', 'BNB', 'Sepolia_Eth', 'Goerli_Eth'];

    if (!ChainList || ChainList.length === 0) {
        await ctx.reply("No chain available.");
        return;
    }

    // Generate inline keyboard buttons for each chain
    const chainButtons = ChainList.map((name, index) => [
        Markup.button.callback(name, `chain_${index}`)
    ]);

    // Send a message with the chains listed
    await ctx.reply('Select a chain:', Markup.inlineKeyboard(chainButtons));
}

export async function handleCreateAccount(ctx) {
    const telegramId = ctx.from.id.toString();
    const user = await User.findOne({ telegramId });

    if (!user) {
        console.error('User not found');
        await ctx.reply('Error: User not found. Please start the bot with /start.');
        return;
    }

    // Generate a new Ethereum wallet
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;
    const accountName = `Account${user.accounts.length + 1}`;

    // Add the new account to the user's accounts array
    user.accounts.push({ name: accountName, address, privateKey });
    await user.save();

    // Send a message with the details of the created account
    await ctx.reply(`
    Account Created 🎉:
    Name: \`${accountName}\`
    Address: \`${address}\`
    ⚠️ Please store your private key securely!
    `, { parse_mode: 'Markdown' });
}


export async function handleEthereumPrice(ctx) {
    try {
        // Fetch Ethereum price from an API
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const ethereumPrice = response.data.ethereum.usd;

        // Reply to the user with the Ethereum price
        await ctx.reply(`Hello, today the Ethereum price is ${ethereumPrice} USD`);
    } catch (error) {
        console.error('Error fetching Ethereum price:', error);
        await ctx.reply('Failed to fetch Ethereum price. Please try again later.');
    }
}


export async function handleSendTBNB(ctx) {
    // Your implementation for handling 'send_TBNB' action
}

export async function handleSendTo(ctx) {
    // Your implementation for handling 'sendto' command
}

export async function handleSelectAccount(ctx) {
    // Your implementation for handling account selection
}

export async function handleConfirmTransaction(ctx) {
    // Your implementation for confirming transaction
}

export async function handleCancelTransaction(ctx) {
    // Your implementation for canceling transaction
}

export async function handleViewTransactions(ctx) {
    // Your implementation for handling 'view_transactions' action
}

export async function handleShowTransactions(ctx) {
    // Your implementation for showing transactions
}

export async function handleCancelSend(ctx) {
    // Your implementation for canceling send action
}

export async function handleCheckBalance(ctx) {
    // Your implementation for handling 'check_balance' action
}

export async function handleBalance(ctx) {
    // Your implementation for checking balance
}
