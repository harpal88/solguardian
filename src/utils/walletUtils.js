/**
 * Utility functions for wallet analysis and transaction processing
 */
import { isExchange, isDEX, isWhale } from '../data/knownWallets';

// Constants for transaction thresholds
export const THRESHOLDS = {
  LARGE_SOL_TRANSFER: 10000, // 10K SOL
  LARGE_USDC_TRANSFER: 10000, // 10K USDC
  LARGE_USDT_TRANSFER: 10000, // 10K USDT
};

// Token identifiers (simplified for demo)
export const TOKEN_IDENTIFIERS = {
  SOL: 'SOL',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC SPL token address
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT SPL token address
};

/**
 * Determines if a transaction is considered "large" based on amount and token type
 * @param {number} amount - Transaction amount
 * @param {string} tokenType - Token identifier
 * @returns {boolean} - Whether the transaction is considered large
 */
export const isLargeTransaction = (amount, tokenType = TOKEN_IDENTIFIERS.SOL) => {
  switch (tokenType) {
    case TOKEN_IDENTIFIERS.SOL:
      return amount >= THRESHOLDS.LARGE_SOL_TRANSFER;
    case TOKEN_IDENTIFIERS.USDC:
      return amount >= THRESHOLDS.LARGE_USDC_TRANSFER;
    case TOKEN_IDENTIFIERS.USDT:
      return amount >= THRESHOLDS.LARGE_USDT_TRANSFER;
    default:
      return false;
  }
};

/**
 * Wallet type classification
 */
export const WALLET_TYPES = {
  EXCHANGE: 'exchange',
  DEX: 'dex',
  WHALE: 'whale',
  PERSONAL: 'personal',
  UNKNOWN: 'unknown',
};

/**
 * Wallet activity profiles
 */
export const WALLET_PROFILES = {
  FREQUENT_TRADER: 'frequent_trader',
  EARLY_BUYER: 'early_buyer',
  SUDDEN_DUMPER: 'sudden_dumper',
  HODLER: 'hodler',
  INACTIVE: 'inactive',
  NEW: 'new',
  WHALE_ACCUMULATOR: 'whale_accumulator',
  SMART_MONEY: 'smart_money',
  SWING_TRADER: 'swing_trader',
  INSTITUTIONAL: 'institutional',
  BOT_TRADER: 'bot_trader'
};

/**
 * Calculate wallet profile score based on transaction history
 * @param {Array} transactions - Array of transactions
 * @returns {Object} - Wallet profile with scores
 */
export const calculateWalletProfile = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      type: WALLET_PROFILES.NEW,
      score: 0,
      tradingFrequency: 0,
      holdingPeriod: 0,
      largeTransactions: 0,
      volatility: 0,
      avgTransactionSize: 0,
      exchangeInteractions: 0,
      dexInteractions: 0,
      whaleInteractions: 0,
      transactionSizeVariance: 0,
      patternScore: 0
    };
  }

  // Sort transactions by time
  const sortedTransactions = [...transactions].sort((a, b) =>
    (a.block_time || a.blockTime) - (b.block_time || b.blockTime)
  );

  // Calculate metrics
  const totalTransactions = transactions.length;
  const firstTransactionTime = sortedTransactions[0].block_time || sortedTransactions[0].blockTime;
  const lastTransactionTime = sortedTransactions[sortedTransactions.length - 1].block_time ||
                             sortedTransactions[sortedTransactions.length - 1].blockTime;

  // Time period in days
  const timePeriodDays = (lastTransactionTime - firstTransactionTime) / (60 * 60 * 24);

  // Trading frequency (transactions per day)
  const tradingFrequency = timePeriodDays > 0 ? totalTransactions / timePeriodDays : 0;

  // Count large transactions
  const largeTransactions = transactions.filter(tx => {
    const amount = (tx.lamport || tx.amount) / 1000000000; // Convert lamports to SOL
    return isLargeTransaction(amount);
  }).length;

  // Calculate holding period (if applicable)
  const holdingPeriod = timePeriodDays;

  // Calculate transaction sizes
  const transactionSizes = transactions.map(tx => (tx.lamport || tx.amount) / 1000000000);
  const totalVolume = transactionSizes.reduce((sum, size) => sum + size, 0);
  const avgTransactionSize = totalVolume / totalTransactions;

  // Calculate transaction size variance (volatility indicator)
  const squaredDiffs = transactionSizes.map(size => Math.pow(size - avgTransactionSize, 2));
  const transactionSizeVariance = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / totalTransactions);

  // Calculate volatility (based on transaction timing and size patterns)
  const timeGaps = [];
  for (let i = 1; i < sortedTransactions.length; i++) {
    const currentTime = sortedTransactions[i].block_time || sortedTransactions[i].blockTime;
    const prevTime = sortedTransactions[i-1].block_time || sortedTransactions[i-1].blockTime;
    timeGaps.push(currentTime - prevTime);
  }

  // Standard deviation of time gaps indicates volatility in trading pattern
  const avgTimeGap = timeGaps.length > 0 ? timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length : 0;
  const timeGapVariance = timeGaps.length > 0 ?
    Math.sqrt(timeGaps.map(gap => Math.pow(gap - avgTimeGap, 2)).reduce((sum, diff) => sum + diff, 0) / timeGaps.length) : 0;

  // Normalize time gap variance to a 0-100 scale
  const volatility = Math.min(100, (timeGapVariance / (60 * 60 * 24)) * 10); // Scale factor to make it more readable

  // Count interactions with different wallet types
  let exchangeInteractions = 0;
  let dexInteractions = 0;
  let whaleInteractions = 0;

  // Helper function to safely check wallet types
  const safeIsExchange = (address) => address && isExchange(address);
  const safeIsDEX = (address) => address && isDEX(address);
  const safeIsWhale = (address) => address && isWhale(address);

  transactions.forEach(tx => {
    // Check source and destination for known wallet types
    if (safeIsExchange(tx.src) || safeIsExchange(tx.dst)) exchangeInteractions++;
    if (safeIsDEX(tx.src) || safeIsDEX(tx.dst)) dexInteractions++;
    if (safeIsWhale(tx.src) || safeIsWhale(tx.dst)) whaleInteractions++;
  });

  // Calculate pattern score (higher means more predictable patterns)
  // This looks for regular intervals between transactions
  let patternScore = 0;
  if (timeGaps.length > 5) { // Need enough transactions to detect patterns
    const timeGapRatios = [];
    for (let i = 1; i < timeGaps.length; i++) {
      if (timeGaps[i-1] > 0) {
        timeGapRatios.push(timeGaps[i] / timeGaps[i-1]);
      }
    }

    // If ratios are consistent, it indicates a pattern
    const avgRatio = timeGapRatios.reduce((sum, ratio) => sum + ratio, 0) / timeGapRatios.length;
    const ratioVariance = Math.sqrt(
      timeGapRatios.map(ratio => Math.pow(ratio - avgRatio, 2)).reduce((sum, diff) => sum + diff, 0) / timeGapRatios.length
    );

    // Lower variance means more consistent patterns
    patternScore = Math.max(0, 100 - (ratioVariance * 20));
  }

  // Calculate overall score (enhanced algorithm)
  let score = 0;
  score += tradingFrequency * 5; // More frequent trading increases score
  score += largeTransactions * 15; // Large transactions have bigger impact
  score += holdingPeriod > 30 ? 10 : 0; // Long-term holders get bonus
  score += volatility * 0.5; // More volatile wallets get higher scores
  score += (exchangeInteractions / totalTransactions) * 100 * 0.3; // Exchange interactions
  score += (dexInteractions / totalTransactions) * 100 * 0.2; // DEX interactions
  score += (whaleInteractions / totalTransactions) * 100 * 0.4; // Whale interactions are important
  score += avgTransactionSize > THRESHOLDS.LARGE_SOL_TRANSFER / 10 ? 20 : 0; // Bonus for large avg transaction size
  score += patternScore * 0.2; // Regular patterns might indicate bots or institutional traders

  // Normalize score to 0-10 scale for wallet scoring badge
  const normalizedScore = Math.min(10, Math.max(0, score / 100));

  // Calculate time between transfers (average in hours)
  const avgTimeBetweenTransfers = timeGaps.length > 0 ?
    (timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length) / 3600 : 0;

  // Calculate protocol interaction metrics
  const protocolInteractions = {
    dex: dexInteractions,
    exchange: exchangeInteractions,
    whale: whaleInteractions,
    // Mock data for other protocol types (in a real app, these would be calculated from actual data)
    nft: Math.floor(Math.random() * 5),
    staking: Math.floor(Math.random() * 3),
    lending: Math.floor(Math.random() * 2)
  };

  // Calculate buy/sell ratio (mock data - in a real app, this would be calculated from actual transaction directions)
  const incomingTxCount = transactions.filter(tx => tx.dst === transactions[0].dst).length;
  const outgoingTxCount = totalTransactions - incomingTxCount;
  const buySellRatio = outgoingTxCount > 0 ? incomingTxCount / outgoingTxCount : incomingTxCount;

  // Generate behavior tags based on metrics
  const behaviorTags = [];

  if (avgTransactionSize > THRESHOLDS.LARGE_SOL_TRANSFER / 10) behaviorTags.push('🐋 Whale');
  if (tradingFrequency > 5) behaviorTags.push('🔄 Active Trader');
  if (holdingPeriod > 180) behaviorTags.push('💎 Holder');
  if (volatility > 70) behaviorTags.push('⚡ Volatile');
  if (patternScore > 80) behaviorTags.push('🤖 Bot-like');
  if (exchangeInteractions > 5) behaviorTags.push('💱 Exchange User');
  if (dexInteractions > 5) behaviorTags.push('🔁 DEX Trader');
  if (avgTimeBetweenTransfers < 1) behaviorTags.push('⏱️ High Frequency');
  if (buySellRatio > 2) behaviorTags.push('📈 Accumulator');
  if (buySellRatio < 0.5) behaviorTags.push('📉 Distributor');

  // Determine profile type with enhanced classification
  let profileType = WALLET_PROFILES.NEW;

  // Bot traders have very regular patterns and high frequency
  if (patternScore > 80 && tradingFrequency > 10) {
    profileType = WALLET_PROFILES.BOT_TRADER;
  }
  // Smart money moves before market trends, often has whale connections and good timing
  else if (whaleInteractions > 3 && largeTransactions > 1 && holdingPeriod > 90) {
    profileType = WALLET_PROFILES.SMART_MONEY;
  }
  // Whale accumulators consistently acquire large amounts
  else if (largeTransactions > 5 && avgTransactionSize > THRESHOLDS.LARGE_SOL_TRANSFER / 5) {
    profileType = WALLET_PROFILES.WHALE_ACCUMULATOR;
  }
  // Institutional traders have large, regular transactions with low volatility
  else if (avgTransactionSize > THRESHOLDS.LARGE_SOL_TRANSFER / 10 && volatility < 30 && totalTransactions > 10) {
    profileType = WALLET_PROFILES.INSTITUTIONAL;
  }
  // Swing traders have high volatility and frequent trades
  else if (volatility > 70 && tradingFrequency > 3) {
    profileType = WALLET_PROFILES.SWING_TRADER;
  }
  // Frequent traders make regular transactions
  else if (tradingFrequency > 5) {
    profileType = WALLET_PROFILES.FREQUENT_TRADER;
  }
  // Hodlers hold for long periods
  else if (holdingPeriod > 180) { // 6 months
    profileType = WALLET_PROFILES.HODLER;
  }
  // Sudden dumpers make large transactions in short periods
  else if (largeTransactions > 3 && timePeriodDays < 30) {
    profileType = WALLET_PROFILES.SUDDEN_DUMPER;
  }
  // Early buyers have been around for a long time
  else if (firstTransactionTime < (Date.now() / 1000 - 31536000)) { // More than 1 year
    profileType = WALLET_PROFILES.EARLY_BUYER;
  }
  // Inactive wallets haven't had transactions recently
  else if (totalTransactions === 0 || lastTransactionTime < (Date.now() / 1000 - 7776000)) { // No activity for 90 days
    profileType = WALLET_PROFILES.INACTIVE;
  }

  return {
    type: profileType,
    score: Math.round(score),
    normalizedScore: parseFloat(normalizedScore.toFixed(1)),
    tradingFrequency: parseFloat(tradingFrequency.toFixed(2)),
    holdingPeriod: Math.round(holdingPeriod),
    largeTransactions,
    volatility: parseFloat(volatility.toFixed(2)),
    avgTransactionSize: parseFloat(avgTransactionSize.toFixed(2)),
    exchangeInteractions,
    dexInteractions,
    whaleInteractions,
    transactionSizeVariance: parseFloat(transactionSizeVariance.toFixed(2)),
    patternScore: parseFloat(patternScore.toFixed(2)),
    avgTimeBetweenTransfers: parseFloat(avgTimeBetweenTransfers.toFixed(2)),
    protocolInteractions,
    buySellRatio: parseFloat(buySellRatio.toFixed(2)),
    behaviorTags,
    insightLevel: score > 150 ? 'Advanced' : score > 80 ? 'Intermediate' : 'Basic'
  };
};

/**
 * Get human-readable profile description
 * @param {string} profileType - Profile type from WALLET_PROFILES
 * @returns {string} - Human-readable description
 */
export const getProfileDescription = (profileType) => {
  switch (profileType) {
    case WALLET_PROFILES.FREQUENT_TRADER:
      return "Frequent Trader: Makes regular transactions, likely an active trader";
    case WALLET_PROFILES.EARLY_BUYER:
      return "Early Buyer: Has been in the ecosystem for a long time";
    case WALLET_PROFILES.SUDDEN_DUMPER:
      return "Sudden Dumper: Makes large transactions in short periods";
    case WALLET_PROFILES.HODLER:
      return "Hodler: Tends to hold assets for long periods";
    case WALLET_PROFILES.INACTIVE:
      return "Inactive: No recent transaction activity";
    case WALLET_PROFILES.NEW:
      return "New Wallet: Limited transaction history";
    case WALLET_PROFILES.WHALE_ACCUMULATOR:
      return "Whale Accumulator: Consistently acquires large amounts of tokens";
    case WALLET_PROFILES.SMART_MONEY:
      return "Smart Money: Shows sophisticated trading patterns and connections to whales";
    case WALLET_PROFILES.SWING_TRADER:
      return "Swing Trader: High volatility trading with frequent position changes";
    case WALLET_PROFILES.INSTITUTIONAL:
      return "Institutional: Large, regular transactions with low volatility patterns";
    case WALLET_PROFILES.BOT_TRADER:
      return "Bot Trader: Extremely regular transaction patterns and high frequency";
    default:
      return "Unknown profile";
  }
};

/**
 * Get risk assessment for a wallet based on its profile and metrics
 * @param {Object} profile - Wallet profile object from calculateWalletProfile
 * @returns {Object} - Risk assessment with level and description
 */
export const getWalletRiskAssessment = (profile) => {
  // Default risk level is medium
  let riskLevel = 'medium';
  let riskDescription = 'Standard trading activity';

  // Determine risk based on profile type and metrics
  switch (profile.type) {
    case WALLET_PROFILES.SUDDEN_DUMPER:
      riskLevel = 'high';
      riskDescription = 'High risk due to sudden large transactions';
      break;
    case WALLET_PROFILES.BOT_TRADER:
      riskLevel = 'medium-high';
      riskDescription = 'Automated trading patterns may indicate market manipulation';
      break;
    case WALLET_PROFILES.WHALE_ACCUMULATOR:
      riskLevel = 'medium-high';
      riskDescription = 'Large holdings could impact market if sold';
      break;
    case WALLET_PROFILES.HODLER:
      riskLevel = 'low';
      riskDescription = 'Long-term holder with stable behavior';
      break;
    case WALLET_PROFILES.INSTITUTIONAL:
      riskLevel = 'low-medium';
      riskDescription = 'Institutional-like patterns suggest professional management';
      break;
    case WALLET_PROFILES.SMART_MONEY:
      riskLevel = 'medium';
      riskDescription = 'Connected to whale activity with strategic timing';
      break;
    default:
      // Adjust risk based on metrics for other profile types
      if (profile.volatility > 80) {
        riskLevel = 'high';
        riskDescription = 'Highly volatile transaction patterns';
      } else if (profile.largeTransactions > 5) {
        riskLevel = 'medium-high';
        riskDescription = 'Multiple large transactions detected';
      } else if (profile.tradingFrequency > 10) {
        riskLevel = 'medium-high';
        riskDescription = 'Very frequent trading activity';
      } else if (profile.whaleInteractions > 5) {
        riskLevel = 'medium-high';
        riskDescription = 'Significant interactions with whale wallets';
      }
  }

  return {
    level: riskLevel,
    description: riskDescription
  };
};
