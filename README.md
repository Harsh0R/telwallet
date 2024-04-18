# Telegram Crypto Wallet Bot

## Quick Start

- [Start using the bot on Telegram](https://t.me/c_r_y_p_t_Bot)


## Overview
This bot allows users to manage cryptocurrency transactions within Telegram, akin to MetaMask. It supports account creation, token deposits via QR code or address, balance inquiries, and token transfers. The bot operates on both testnet and mainnet environments.

## Features
- **Account Creation**: Users can create a new wallet directly within Telegram.
- **Deposit Tokens**: Tokens can be deposited by scanning a QR code or using a wallet address.
- **Check Balance**: Users can check their account balances.
- **Transfer Tokens**: Allows users to send tokens to other accounts.
- **Supported Networks**: Includes support for multiple blockchains:
  - **Testnet**: Amoy Polygon
  - **Mainnet**: Ethereum, Polygon, Arbitrum, Optimism, and Base

## Prerequisites
- Node.js installed
- MongoDB server running
- Telegram account

## Installation

1. **Clone the repository**
   ```bash
   git clone [repository_url]
   cd [repository_folder]

2. **Install dependencies**
   ```bash
   npm install

3. **Set environment variables** :
   Create a .env file in the project root and add the following:
   ```bash
   TELEGRAF_TOKEN=[Your_Telegram_Bot_Token]
   ALCHAMY_API=[Your_Alchemy_API_Key]
   MONGO_URL=[Your_MongoDB_Connection_String]

4. **Start the bot**
   ```bash
   node index.js

## Usage

### Start the Bot
- Send `/start` to initiate the bot.

### Create Account
- Automatically prompted upon startup or accessible via the menu.

### Deposit Tokens
- Accessible via the bot's menu. Follow the prompts to deposit by QR code or address.

### Check Balance
- Choose the blockchain network and the account for balance inquiries.

### Send Tokens
- Use the menu to select the network and account, then specify the recipient and amount.

## Development

### Code Structure
- The bot is built using the Telegraf framework for handling interactions and the ethers.js library for blockchain-related operations.

### Database
- MongoDB is used for storing user and transaction data, managed via Mongoose.

## Contributing

Contributions to the bot are welcome. Please fork the repository and submit pull requests with your proposed changes.

## License

This project is released under the MIT License.
