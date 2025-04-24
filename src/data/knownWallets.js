/**
 * Database of known Solana wallets
 * Including exchanges, DEXs, and notable whales
 */

import { WALLET_TYPES } from '../utils/walletUtils';

// Known centralized exchanges
export const EXCHANGES = {};

// Known DEXs
export const DEXES = {
  // Serum/OpenBook
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": {
    name: "Serum/OpenBook DEX",
    type: WALLET_TYPES.DEX,
    dex: "Serum"
  },

  // Raydium
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": {
    name: "Raydium AMM",
    type: WALLET_TYPES.DEX,
    dex: "Raydium"
  },

  // Orca
  "8JUjWjAyXTMB4ZXcV7nk3p6Gg1fWAAoSck7xekuyADKL": {
    name: "Orca Swap Program",
    type: WALLET_TYPES.DEX,
    dex: "Orca"
  },

  // Jupiter Aggregator
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": {
    name: "Jupiter Aggregator",
    type: WALLET_TYPES.DEX,
    dex: "Jupiter"
  }
};

// Known whale wallets
export const WHALES = {
  // Historical whales
  "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg": {
    name: "Alameda Research (Historical)",
    type: WALLET_TYPES.WHALE,
    notes: "Former trading firm associated with FTX"
  },
  "2bnZ1kQLVnCLKt5VXnRY34BjL3mTEC75iHJPvLxzrAjt": {
    name: "Jump Crypto",
    type: WALLET_TYPES.WHALE,
    notes: "Major crypto trading firm"
  },
  "3FZbgi6VKQE8naSYf9JBkZ4zJCNbvyXJREEBF9gSw1jh": {
    name: "Three Arrows Capital (Historical)",
    type: WALLET_TYPES.WHALE,
    notes: "Former hedge fund"
  },
  "HN8gas72ioGsHRQ2xVWH6XKXufjzAUYJMXmAdx6GFhYT": {
    name: "Solana Foundation",
    type: WALLET_TYPES.WHALE,
    notes: "Solana Foundation treasury"
  },

  // Active whale wallets
  "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2": {
    name: "Active Whale 1",
    type: WALLET_TYPES.WHALE,
    notes: "Large SOL accumulator with recent activity"
  },
  "52C9T2T7JRojtxumYnYZhyUmrN7kqzvCLc4Ksvjk7TxD": {
    name: "Active Whale 2",
    type: WALLET_TYPES.WHALE,
    notes: "Significant SOL transfers from exchanges"
  },
  "8BseXT9EtoEhBTKFFYkwTnjKSUZwhtmdKY2Jrj8j45Rt": {
    name: "Active Whale 3",
    type: WALLET_TYPES.WHALE,
    notes: "Recent large staking activity"
  },
  "GitYucwpNcg6Dx1Y15UQ9TQn8LZMX1uuqQNn8rXxEWNC": {
    name: "Active Whale 4",
    type: WALLET_TYPES.WHALE,
    notes: "High-frequency trading with large volumes"
  },
  "9QgXqrgdbVU8KcpfskqJpAXKzbaYQJecgMAruSWoXDkM": {
    name: "Active Whale 5",
    type: WALLET_TYPES.WHALE,
    notes: "Recent large withdrawals from Binance"
  },
  "2W1VbazcNPxyMYAVebPac1zk1cvPXkujnPEby9JnC64Z": {
    name: "Active Whale 6",
    type: WALLET_TYPES.WHALE,
    notes: "Consistent accumulation pattern"
  },
  "6o5v1HC7WhBnLfRHp8mQTtCP2khdXXjhuyGyYEoy2Suy": {
    name: "Active Whale 7",
    type: WALLET_TYPES.WHALE,
    notes: "Active in DeFi protocols with large positions"
  },
  "2Em76UkVmchjPd4F56RU7WVsFUtaryzzZHsHja8PWxBd": {
    name: "Active Whale 8",
    type: WALLET_TYPES.WHALE,
    notes: "Recently reactivated after dormancy"
  }
};

// Combine all known wallets into a single object for easy lookup
export const KNOWN_WALLETS = {
  ...EXCHANGES,
  ...DEXES,
  ...WHALES
};

/**
 * Get wallet information if it's a known wallet
 * @param {string} address - Wallet address to check
 * @returns {Object|null} - Wallet info or null if not known
 */
export const getKnownWalletInfo = (address) => {
  return KNOWN_WALLETS[address] || null;
};

/**
 * Check if a wallet is a known exchange
 * @param {string} address - Wallet address to check
 * @returns {boolean} - True if wallet is a known exchange
 */
export const isExchange = (address) => {
  return KNOWN_WALLETS[address]?.type === WALLET_TYPES.EXCHANGE;
};

/**
 * Check if a wallet is a known DEX
 * @param {string} address - Wallet address to check
 * @returns {boolean} - True if wallet is a known DEX
 */
export const isDEX = (address) => {
  return KNOWN_WALLETS[address]?.type === WALLET_TYPES.DEX;
};

/**
 * Check if a wallet is a known whale
 * @param {string} address - Wallet address to check
 * @returns {boolean} - True if wallet is a known whale
 */
export const isWhale = (address) => {
  return KNOWN_WALLETS[address]?.type === WALLET_TYPES.WHALE;
};
