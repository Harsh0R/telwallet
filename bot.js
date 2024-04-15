import { Telegraf, Markup } from 'telegraf';
import { connectDB } from './db';
import { handleStart, handleTestSession, handleDeposit, handleAllChains, handleCreateAccount, handleEthereumPrice, handleSendTBNB, handleSendTo, handleCheckBalance, handleViewTransactions, handleShowTransactions, handleCancelTransaction, handleBalance } from './handlers';

connectDB();

export const telbot = new Telegraf('7190257079:AAGPN69Y9q9irb4Dx6l-G4yOudDck21W97c');

bot.start(handleStart);
bot.help(handleHelp);
bot.command('testsession', handleTestSession);
bot.action('deposit', handleDeposit);
bot.action('allChains', handleAllChains);
bot.action('create_account', handleCreateAccount);
bot.action('ethereum_price', handleEthereumPrice);
bot.action('send_TBNB', handleSendTBNB);
bot.command('sendto', handleSendTo);
bot.action(/^select_account_(\d+)_(\w+)$/, handleSelectAccount);
bot.action(/^confirm_transaction_(\d+)_(\w+)$/, handleConfirmTransaction);
bot.action('cancel_transaction', handleCancelTransaction);
bot.action('view_transactions', handleViewTransactions);
bot.action(/^show_transactions_\d+$/, handleShowTransactions);
bot.action(/^cancel_send_(\d+)$/, handleCancelSend);
bot.action('check_balance', handleCheckBalance);
bot.action(/^balance_\d+$/, handleBalance);
