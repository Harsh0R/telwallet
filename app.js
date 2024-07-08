import { Telegraf, session, Markup } from "telegraf";
import { ethers } from "ethers";
import axios from "axios";
import QRCode from "qrcode";
import mongoose from "mongoose";
import { Network, Alchemy } from "alchemy-sdk";
import dotenv from "dotenv";
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAF_TOKEN);
const settings = {
  apiKey: process.env.ALCHAMY_API,
  network: Network.ETH_MAINNET,
};

const networkUrls = {
  ETH: process.env.ETH,
  Polygon: process.env.POLYGON,
  Arbitrum: process.env.ARBITRUM,
  Optimism: process.env.OPTIMISM,
  Amoy: process.env.AMOY,
  Base: process.env.BASE,
};

const alchemy = new Alchemy(settings);
const transactionData = {
  chainName: "",
  senderAddr: "",
  receiverAddr: "",
  privateKeyOfSender: "",
  amount: "",
  status: "",
  transactionHash: "",
};

const testChainData = [
  {
    name: "Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology/",
  },
  {
    name: "tBNB",
    rpcUrl: "https://bsc-testnet-rpc.publicnode.com",
  },
];

let testnet = true;

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
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
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  privateKey: { type: String, required: true },
  balance: { type: Number, default: 0 },
  transactions: [transactionSchema],
});

const userSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true, required: true },
  username: String,
  accounts: [accountSchema],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

const TestChainList = ["Amoy"];
const MainChainList = ["ETH", "Polygon", "Arbitrum", "Optimism", "Base"];

function getMainMenu() {
  if (testnet) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(" 🚀 Create Account", "create_account"),
        Markup.button.callback(" 💵 Deposit Token", "deposit"),
      ],
      [
        Markup.button.callback(" ✅ testnet", "testnetOn"),
        Markup.button.callback("  mainnet", "mainetOn"),
      ],
      [
        Markup.button.callback(" 💰 Check Balance", "check_balance"),
        Markup.button.callback(" 💸 Send Token", "send_token"),
      ],
      [
        Markup.button.callback(" 🔗 Show Account ", "allAccount"),
        Markup.button.callback(" 🪙 ETH Pice", "ethereum_price"),
      ],
      [
        Markup.button.callback(" 📝 View Transactions", "view_transactions"),
        Markup.button.callback(" 💫 All Network", "all_network"),
      ],
      [Markup.button.callback(" 🔑 Show Privetkey", "Show_Privetkey")],
    ]);
  } else {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(" 🚀 Create Account", "create_account"),
        Markup.button.callback(" 💵 Deposit Token", "deposit"),
      ],
      [
        Markup.button.callback("  testnet", "testnetOn"),
        Markup.button.callback(" ✅ mainnet", "mainetOn"),
      ],
      [
        Markup.button.callback(" 💰 Check Balance", "check_balance"),
        Markup.button.callback(" 💸 Send Token", "send_token"),
      ],
      [
        Markup.button.callback(" 🔗 Show Account ", "allAccount"),
        Markup.button.callback(" 🪙 ETH Pice", "ethereum_price"),
      ],
      [
        Markup.button.callback(" 📝 View Transactions", "view_transactions"),
        Markup.button.callback(" 💫 All Network", "all_network"),
      ],
      [Markup.button.callback(" 🔑 Show Privetkey", "Show_Privetkey")],
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
      await ctx.reply(
        `Welcome 👋, ${username}! How can I assist you?`,
        getMainMenu()
      );
    } else {
      await ctx.reply(
        `Welcome back 👋, ${username}! How can I assist you today?`,
        getMainMenu()
      );
    }
  } catch (error) {
    console.error("Error handling bot start:", error);
    ctx.reply("Failed to start the bot. Please try again later.");
  }
});

bot.action("mainetOn", async (ctx) => {
  testnet = false;
  try {
    await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
  } catch (error) {
    console.error("Error deleting message:", error);
  }
  ctx.reply(" ⚠️ Mainnet activated.", getMainMenu(testnet));
});

bot.action("testnetOn", async (ctx) => {
  testnet = true;
  try {
    await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
  } catch (error) {
    console.error("Error deleting message:", error);
  }
  ctx.reply(" ✅ Testnet activated.", getMainMenu(testnet));
});

bot.action("testnets", async (ctx) => {
  if (!ChainList) {
    await ctx.reply("No chain Avalabale.");
    return;
  }

  const accountButtons = ChainList.map((name, index) => [
    Markup.button.callback(`${name}`, `deposit_${index}`),
  ]);

  await ctx.reply(
    "Select chain to deposit into:",
    Markup.inlineKeyboard(accountButtons)
  );
});

bot.action("deposit", async (ctx) => {
  const telegramId = ctx.from.id.toString();

  const user = await User.findOne({ telegramId });
  if (!user || user.accounts.length === 0) {
    await ctx.reply(
      "You haven't created any accounts yet. Use /create_account to create one."
    );
    return;
  }
  const accountButtons = user.accounts.map((account, index) => [
    Markup.button.callback(
      `${account.name}: ${account.address}`,
      `deposit_${index}`
    ),
  ]);
  await ctx.reply(
    "Select an account to deposit into:",
    Markup.inlineKeyboard(accountButtons)
  );
});

bot.action("all_network", async (ctx) => {
  const telegramId = ctx.from.id.toString();

  if (testnet) {
    const accountButtons = TestChainList.map((name, index) => [
      Markup.button.callback(`${name}`, `network_`),
    ]);
    await ctx.reply(
      "List of Testnet network :",
      Markup.inlineKeyboard(accountButtons)
    );
  } else {
    const accountButtons = MainChainList.map((name, index) => [
      Markup.button.callback(`${name}`, `network_`),
    ]);
    await ctx.reply(
      "List of Mainnet network :",
      Markup.inlineKeyboard(accountButtons)
    );
  }
});

bot.action("allAccount", async (ctx) => {
  const telegramId = ctx.from.id.toString();

  const user = await User.findOne({ telegramId: ctx.from.id.toString() });

  if (!user || user.accounts.length === 0) {
    await ctx.reply(
      "You don't have any accounts yet. Use /create_account to create one."
    );
    return;
  }

  let messageText = "List of your all accounts:\n";
  user.accounts.forEach((account, index) => {
    // Display each account in a message formatted as code for easy copying
    messageText += `\n${index + 1}. <b>${account.name}</b>: ${account.address}`;
  });

  await ctx.reply(messageText, { parse_mode: "HTML" });
});

bot.action("network_", async (ctx) => {
  return;
});

bot.action(/^deposit_\d+$/, async (ctx) => {
  const index = parseInt(ctx.match[0].split("_")[1]);
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

    await ctx.replyWithPhoto(
      { source: Buffer.from(depositQR.split(",")[1], "base64") },
      {
        caption: `Scan this QR code to deposit token into ${selectedAccount.name}.`,
      }
    );

    await ctx.replyWithMarkdown(
      `To deposit into *${selectedAccount.name}* , send token to the following address:\n\`${selectedAccount.address}\`\n\n⚠️ Please double-check the address before sending.`
    );
  } catch (error) {
    console.error("Error generating QR code:", error);
    await ctx.reply("Failed to generate QR code. Please try again later.");
  }
});

bot.help((ctx) => {
  ctx.reply(`Here are the commands you can use:
- /start - Start interacting with the bot
- /sendto <receiver_address> <amount> - Send token to another account
- /help - Show this help message`);
});

bot.action("quit", async (ctx) => {
  await ctx.reply("Goodbye! If you need further assistance, just type /start.");
  ctx.leaveChat();
});

bot.action("create_account", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });

  if (!user) {
    console.error("User not found");
    await ctx.reply("Error: User not found. Please start the bot with /start.");
    return;
  }

  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;
  const privateKey = wallet.privateKey;
  // const accountName = generateFunnyName();
  const accountName = `Account${user.accounts.length + 1}`;
  user.accounts.push({ name: accountName, address, privateKey });
  await user.save();

  ctx.reply(
    `
    Account Created 🎉:
    Name : \`${accountName}\`
    Address : \`${address}\`
    ⚠️ Please store your private key securely!
    `,
    { parse_mode: "Markdown" }
  );
});

bot.action("ethereum_price", async (ctx) => {
  const response = await axios.get(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  const rate = response.data.ethereum.usd;
  ctx.reply(`Hello 👋, today the Ethereum price is ${rate} USD`);
});

// for Token Transactions

bot.action("send_token", async (ctx) => {
  if (testnet) {
    const accountButtons = TestChainList.map((name, index) => [
      Markup.button.callback(`${name}`, `selecteChain_${name}`),
    ]);
    await ctx.reply(
      `Selecte chain to do transaction in testnet :`,
      Markup.inlineKeyboard(accountButtons)
    );
  } else {
    const accountButtons = MainChainList.map((name, index) => [
      Markup.button.callback(`${name}`, `selecteChain_${name}`),
    ]);
    await ctx.reply(
      `Selecte chain to do transaction in mainnet :`,
      Markup.inlineKeyboard(accountButtons)
    );
  }
});

bot.action(/^selecteChain_\w+$/, async (ctx) => {
  const chainName = ctx.match[0].split("_")[1].toString();
  transactionData.chainName = chainName;
  try {
    const user = await User.findOne({ telegramId: ctx.from.id.toString() });

    if (!user || user.accounts.length === 0) {
      ctx.reply(
        "You don't have any accounts yet. Use /create_account to create one."
      );
      return;
    }

    const accountButtons = user.accounts.map((account, index) => [
      Markup.button.callback(
        `${account.name}: ${account.address}`,
        `selectAccount_${index}`
      ),
    ]);

    ctx.reply(
      "Select an account to send from:",
      Markup.inlineKeyboard(accountButtons)
    );
  } catch (error) {
    console.error("Failed to save transaction:", error);
    ctx.reply("Failed to prepare the transaction due to a server error.");
  }
});

bot.action(/^selectAccount_(\w+)$/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const addressIdx = ctx.match[0].split("_")[1].toString();
  const user = await User.findOne({ telegramId });
  const accountAddr = user.accounts[addressIdx].address;
  const priKey = user.accounts[addressIdx].privateKey;

  transactionData.senderAddr = accountAddr;
  transactionData.privateKeyOfSender = priKey;

  ctx.reply(
    "To send Token, please enter the command in the following format:\n\n/sendto [receiver_address] [amount]\n\nExample:\n/sendto 0x1234abcde... 10.5"
  );
  // console.log("Transaction data - > ", transactionData);
});

bot.command("sendto", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  if (parts.length < 3) {
    return ctx.reply("Usage: /sendto [receiver_address] [amount]");
  }

  const receiverAddress = parts[1];
  const amount = parseFloat(parts[2]);
  if (
    !ethers.utils.isAddress(receiverAddress) ||
    isNaN(amount) ||
    amount <= 0
  ) {
    return ctx.reply(
      "Invalid receiver address or amount. Please enter valid data."
    );
  }

  transactionData.receiverAddr = receiverAddress;
  transactionData.amount = amount.toString();
  transactionData.status = "pending";

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
      throw new Error("Unsupported network or network configuration missing.");
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const priKey = transaction.privateKeyOfSender;
    const wallet = new ethers.Wallet(priKey, provider);
    const estimatedGasLimit = await provider.estimateGas(dummyTransaction);
    const gasPrice = await provider.getGasPrice();
    const estimatedFee = estimatedGasLimit.mul(gasPrice);
    const balance = await wallet.getBalance();
    const formattedFeeString = ethers.utils.formatUnits(estimatedFee, "ether");
    const formattedFee = parseFloat(formattedFeeString).toFixed(5);

    if (
      balance
        .sub(estimatedFee)
        .lt(ethers.utils.parseEther(transaction.amount.toString()))
    ) {
      ctx.reply(`estimatedFee : ${formattedFee} and Amount : ${transaction.amount} and Balance : ${balance}
            Insufficient balance to cover the transfer amount and network fee. Transaction canceled. ❌ `);
      return;
    }

    ctx.reply(
      `Confirm transaction:\n- Amount: ${transaction.amount} ${transaction.chainName} Tokens\n- To: ${transaction.receiverAddr}\n- Fee: ${formattedFee} ${transaction.chainName} Tokens\nPress 'Confirm' to proceed or 'Cancel' to abort. `,
      Markup.inlineKeyboard([
        Markup.button.callback("Confirm ✅", `confirm_transaction`),
        Markup.button.callback("Cancel ❌", `cancel_transaction`),
      ])
    );
  } catch (error) {
    console.error("Error preparing transaction:", error);
    ctx.reply("Failed to prepare the transaction due to an error.");
  }
}

bot.action("confirm_transaction", async (ctx) => {
  const transaction = transactionData;

  ctx.reply(`Please wait, transaction is in process... ⚠️`);
  const result = await executeBlockchainTransaction(transaction);

  if (result.success) {
    transaction.transactionHash = result.hash;
    transaction.status = "confirmed";

    const newTransaction = new Transaction({
      telegramId: ctx.from.id,
      senderAddress: transaction.senderAddr,
      receiverAddress: transaction.receiverAddr,
      amount: transaction.amount,
      transactionHash: transaction.transactionHash,
      chainName: transaction.chainName,
      status: transaction.status,
    });

    const explorerUrl = getExplorerUrl(
      transaction.chainName,
      transaction.transactionHash
    );

    try {
      await newTransaction.save();
    } catch (error) {
      console.error("Failed to save transaction:", error);
      ctx.reply(
        `Transaction confirmed, but failed to save in the database. ❌ Check here: ${explorerUrl}`
      );
      return;
    }
    ctx.reply(
      `Transaction confirmed! ✅ Transaction Hash: ${transaction.transactionHash}\nCheck here: ${explorerUrl}`
    );
  } else {
    ctx.reply(`Transaction failed to execute: ❌ ${result.error}`);
  }
});

bot.action("cancel_transaction", async (ctx) => {
  ctx.reply("Transaction canceled.");
});
function getExplorerUrl(chainName, transactionHash) {
  const explorerUrls = {
    ETH: `https://etherscan.io/tx/${transactionHash}`,
    Polygon: `https://polygonscan.com/tx/${transactionHash}`,
    Arbitrum: `https://arbiscan.io/tx/${transactionHash}`,
    Optimism: `https://optimistic.etherscan.io/tx/${transactionHash}`,
    Amoy: `https://oklink.com/amoy/tx/${transactionHash}`,
    Base: `https://base.explorer.alchemy.com/tx/${transactionHash}`,
  };
  return (
    explorerUrls[chainName] || `Transaction URL not available for ${chainName}`
  );
}

async function executeBlockchainTransaction(transaction) {
  try {
    const rpcUrl = networkUrls[transaction.chainName];
    if (!rpcUrl) {
      throw new Error("Unsupported network or network configuration missing.");
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
    console.error("Failed to execute transaction:", error);
    return { success: false, error: error.message };
  }
}

// for balance chack

bot.action("check_balance", async (ctx) => {
  if (testnet) {
    const accountButtons = TestChainList.map((name, index) => [
      Markup.button.callback(`${name}`, `balance_${name}`),
    ]);
    await ctx.reply(
      `Selecte chain for show balance :`,
      Markup.inlineKeyboard(accountButtons)
    );
  } else {
    const accountButtons = MainChainList.map((name, index) => [
      Markup.button.callback(`${name}`, `balance_${name}`),
    ]);
    await ctx.reply(
      `Selecte chain for show balance :`,
      Markup.inlineKeyboard(accountButtons)
    );
  }
});

bot.action(/^balance_\w+$/, async (ctx) => {
  const chainName = ctx.match[0].split("_")[1].toString();
  const telegramId = ctx.from.id.toString();

  // await ctx.replyWithMarkdown(`Select an account to check the balance for *${chainName} chain* :`, Markup.inlineKeyboard(accountButtons));

  const user = await User.findOne({ telegramId });
  if (!user || user.accounts.length === 0) {
    await ctx.reply(
      "You don't have any accounts yet. Use /create_account to create one."
    );
    return;
  }
  const accountButtons = user.accounts.map((account, index) => [
    Markup.button.callback(
      `${account.name} - ${account.address}`,
      `showBalance_${index}_${chainName}`
    ),
  ]);

  await ctx.replyWithMarkdown(
    `Select an account to check the balance for *${chainName} chain* :`,
    Markup.inlineKeyboard(accountButtons)
  );
});

function getProvider(chainName) {
  const rpcUrls = {
    Amoy: process.env.AMOY, // Make sure to define these in your environment or configuration
    ETH: process.env.ETH,
    Polygon: process.env.POLYGON,
    Arbitrum: process.env.ARBITRUM,
    Optimism: process.env.OPTIMISM,
    Base: process.env.BASE,
  };

  const rpcUrl = rpcUrls[chainName];
  if (!rpcUrl) {
    throw new Error(`Unsupported or undefined RPC URL for ${chainName}`);
  }

  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

bot.action(/^showBalance_(\d+)_(\w+)$/, async (ctx) => {
  const accountIdx = parseInt(ctx.match[1]);
  const chainName = ctx.match[2];
  const telegramId = ctx.from.id.toString();

  const user = await User.findOne({ telegramId });
  if (!user || accountIdx >= user.accounts.length) {
    await ctx.reply("Invalid account selected.");
    return;
  }

  const selectedAccount = user.accounts[accountIdx];
  const accountAddress = selectedAccount.address;

  try {
    const provider = getProvider(chainName);
    const etherBalance = await provider.getBalance(accountAddress);
    const formattedEtherBalance = ethers.utils.formatEther(etherBalance);
    await ctx.replyWithMarkdown(
      `Balance for *${selectedAccount.name}* on ${chainName}:\n${formattedEtherBalance} ${chainName} Tokens`
    );
  } catch (error) {
    console.error("Error fetching balances: ", error);
    await ctx.reply(`Failed to fetch balances: ${error.message}`);
  }
});

//Show Privet Key

bot.action("Show_Privetkey", async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });
  if (!user) {
    await ctx.reply("You are not authorized to use this feature.");
    return;
  }

  const accountButtons = user.accounts.map((account, index) => [
    Markup.button.callback(
      `${account.name}: ${account.address}`,
      `selectAccounts_${index}`
    ),
  ]);
  await ctx.reply(
    "Select the account to view the private key:",
    Markup.inlineKeyboard(accountButtons)
  );
});

bot.action(/^selectAccounts_(\d+)$/, async (ctx) => {
  const accountIndex = parseInt(ctx.match[1]);
  const telegramId = ctx.from.id.toString();
  const user = await User.findOne({ telegramId });

  if (!user || accountIndex >= user.accounts.length) {
    await ctx.reply("Invalid account selected.");
    return;
  }

  const selectedAccount = user.accounts[accountIndex];
  if (selectedAccount && selectedAccount.privateKey) {
    await ctx.replyWithMarkdown(
      `Private Key for *${selectedAccount.name}*\n\`${selectedAccount.privateKey}\``
    );
  } else {
    await ctx.reply("Private key not found for the selected account.");
  }
});

//view Transaction

// Function to split message into chunks
function splitMessage(message, maxLength) {
  const parts = [];
  let currentPart = "";

  message.split("\n").forEach((line) => {
    if ((currentPart + line + "\n").length > maxLength) {
      parts.push(currentPart);
      currentPart = line + "\n";
    } else {
      currentPart += line + "\n";
    }
  });

  if (currentPart.length > 0) {
    parts.push(currentPart);
  }

  return parts;
}

bot.action("view_transactions", async (ctx) => {
  const telegramId = ctx.from.id.toString();

  const transactions = await Transaction.find({ telegramId });
  if (!transactions || transactions.length === 0) {
    await ctx.reply("You don't have any transactions yet.");
    return;
  }

  let message = "📜 Transaction History:\n";
  transactions.forEach((transaction, index) => {
    message += `${index + 1}. Amount: ${transaction.amount} ${
      transaction.chainName
    } Tokens\n`;
    message += `From: ${transaction.senderAddress}\n`;
    message += `To: ${transaction.receiverAddress}\n`;
    message += `Status: ${transaction.status}\n`;
    message += `Hash: ${transaction.transactionHash}\n`;
    message += `Date: ${transaction.createdAt.toDateString()}\n\n`;
  });

  const maxLength = 4096; // Telegram's message length limit
  const messageParts = splitMessage(message, maxLength);

  for (const part of messageParts) {
    await ctx.replyWithMarkdown(part);
  }
});

// bot.action("view_transactions", async (ctx) => {
//   const telegramId = ctx.from.id.toString();

//   const transactions = await Transaction.find({ telegramId });
//   if (!transactions || transactions.length === 0) {
//     await ctx.reply("You don't have any transactions yet.");
//     return;
//   }

//   let message = "📜 Transaction History:\n";
//   transactions.forEach((transaction, index) => {
//     message += `${index + 1}. Amount: ${transaction.amount} ${
//       transaction.chainName
//     } Tokens\n`;
//     message += `From: ${transaction.senderAddress}\n`;
//     message += `To: ${transaction.receiverAddress}\n`;
//     message += `Status: ${transaction.status}\n`;
//     message += `Hash: ${transaction.transactionHash}\n`;
//     message += `Date: ${transaction.createdAt.toDateString()}\n\n`;
//   });

//   await ctx.replyWithMarkdown(message);
// });

bot.launch();
