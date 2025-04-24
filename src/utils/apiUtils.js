/**
 * API Utilities for SolGuardian
 * Provides optimized API request handling with caching and request management
 */
import axios from 'axios';

// API token - in a production app, this would be stored in environment variables
const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NDUwNjUxNjg4NjAsImVtYWlsIjoiaGFycGFsc2luaDc5ODRAZ21haWwuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzQ1MDY1MTY4fQ.e-2IFl1ziEjHO4-g6f4PYEdc36aaccDnAPWi_bgOzNc";

// Cache for API responses
const apiCache = {
  cache: new Map(),

  // Get cached response if it exists and is not expired
  get: (cacheKey, maxAgeMs = 30000) => { // Default 30 second cache
    const cachedData = apiCache.cache.get(cacheKey);
    if (!cachedData) return null;

    const isExpired = Date.now() - cachedData.timestamp > maxAgeMs;
    return isExpired ? null : cachedData.data;
  },

  // Set cache entry
  set: (cacheKey, data) => {
    apiCache.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  },

  // Clear specific cache entry
  clear: (cacheKey) => {
    apiCache.cache.delete(cacheKey);
  },

  // Clear all cache
  clearAll: () => {
    apiCache.cache.clear();
  },

  // Prune expired entries
  prune: (maxAgeMs = 60000) => { // Default 1 minute expiry
    const now = Date.now();
    for (const [key, value] of apiCache.cache.entries()) {
      if (now - value.timestamp > maxAgeMs) {
        apiCache.cache.delete(key);
      }
    }
  }
};

// In-flight request tracker to prevent duplicate requests
const pendingRequests = new Map();

/**
 * Make an API request with caching and deduplication
 * @param {Object} options - Request options
 * @param {string} options.url - API endpoint URL
 * @param {Object} options.params - Query parameters
 * @param {boolean} options.useCache - Whether to use cache (default: true)
 * @param {number} options.cacheMaxAge - Max age for cached data in ms (default: 30000)
 * @param {boolean} options.deduplicate - Whether to deduplicate in-flight requests (default: true)
 * @returns {Promise<Object>} - API response data
 */
export const makeApiRequest = async ({
  url,
  params = {},
  useCache = true,
  cacheMaxAge = 30000,
  deduplicate = true
}) => {
  // Create a cache key from the URL and params
  const cacheKey = `${url}:${JSON.stringify(params)}`;

  // Check cache first if enabled
  if (useCache) {
    const cachedData = apiCache.get(cacheKey, cacheMaxAge);
    if (cachedData) {
      console.log(`Using cached data for ${cacheKey}`);
      return cachedData;
    }
  }

  // Check for in-flight requests if deduplication is enabled
  if (deduplicate && pendingRequests.has(cacheKey)) {
    console.log(`Reusing in-flight request for ${cacheKey}`);
    return pendingRequests.get(cacheKey);
  }

  // Create the request promise
  const requestPromise = axios.request({
    method: "get",
    url,
    params,
    headers: {
      "accept": "application/json",
      "token": API_TOKEN
    }
  })
  .then(response => {
    // Store successful response in cache
    if (useCache && response.data) {
      apiCache.set(cacheKey, response.data);
    }

    // Remove from pending requests
    pendingRequests.delete(cacheKey);

    return response.data;
  })
  .catch(error => {
    // Remove from pending requests
    pendingRequests.delete(cacheKey);

    // Rethrow the error
    throw error;
  });

  // Store the request promise if deduplication is enabled
  if (deduplicate) {
    pendingRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
};

/**
 * Fetch transfers for a wallet
 * @param {string} address - Wallet address
 * @param {Object} options - Request options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Page size (default: 20)
 * @param {string} options.sortBy - Sort field (default: "block_time")
 * @param {string} options.sortOrder - Sort order (default: "desc")
 * @param {boolean} options.useCache - Whether to use cache (default: true)
 * @param {number} options.cacheMaxAge - Max age for cached data in ms (default: 30000)
 * @returns {Promise<Object>} - API response data
 */
export const fetchWalletTransfers = async (
  address,
  {
    page = 1,
    pageSize = 20,
    sortBy = "block_time",
    sortOrder = "desc",
    useCache = true,
    cacheMaxAge = 30000
  } = {}
) => {
  // Validate page size (Solscan API requires specific values)
  const validPageSizes = [10, 20, 30, 40, 60, 100];
  const validatedPageSize = validPageSizes.includes(pageSize)
    ? pageSize
    : validPageSizes.find(size => size >= pageSize) || 10;

  return makeApiRequest({
    url: "https://pro-api.solscan.io/v2.0/account/transfer",
    params: {
      address,
      page,
      page_size: validatedPageSize,
      sort_by: sortBy,
      sort_order: sortOrder
    },
    useCache,
    cacheMaxAge
  });
};

/**
 * Fetch token holdings for a wallet
 * @param {string} address - Wallet address
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - API response data
 */
export const fetchWalletTokens = async (
  address,
  {
    page = 1,
    pageSize = 10,
    type = "token",
    useCache = true,
    cacheMaxAge = 60000 // Token data can be cached longer
  } = {}
) => {
  return makeApiRequest({
    url: "https://pro-api.solscan.io/v2.0/account/token-accounts",
    params: {
      address,
      page,
      page_size: pageSize,
      type
    },
    useCache,
    cacheMaxAge
  });
};

/**
 * Fetch token metadata
 * @param {string} tokenAddress - Token address
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - API response data
 */
export const fetchTokenMetadata = async (
  tokenAddress,
  {
    useCache = true,
    cacheMaxAge = 3600000 // Token metadata can be cached for longer (1 hour)
  } = {}
) => {
  return makeApiRequest({
    url: "https://pro-api.solscan.io/v2.0/token/meta",
    params: {
      token_address: tokenAddress
    },
    useCache,
    cacheMaxAge
  });
};

/**
 * Fetch latest transactions
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - API response data
 */
export const fetchLatestTransactions = async (
  {
    limit = 10,
    filter = "exceptVote",
    useCache = true,
    cacheMaxAge = 10000 // Latest transactions should have shorter cache (10 seconds)
  } = {}
) => {
  return makeApiRequest({
    url: "https://pro-api.solscan.io/v2.0/transaction/last",
    params: {
      limit,
      filter
    },
    useCache,
    cacheMaxAge
  });
};

/**
 * Map API response to consistent transaction format
 * @param {Array} transactions - Raw transactions from API
 * @returns {Array} - Normalized transactions
 */
export const normalizeTransactions = (transactions = []) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  return transactions.map(tx => ({
    // Map the fields from the API response to our expected format
    src: tx.from_address || tx.src,
    dst: tx.to_address || tx.dst,
    block_time: tx.block_time || tx.blockTime,
    amount: tx.amount,
    lamport: tx.amount, // Store the amount in lamports for consistency
    trans_id: tx.trans_id || tx.tx_hash || tx.signature, // Transaction ID/hash
    token_address: tx.token_address,
    token_decimals: tx.token_decimals || 9, // Default to 9 decimals for SOL
    flow: tx.flow, // 'in' or 'out'
    time: tx.time,
    // Keep the original data for reference
    _original: tx
  }));
};

/**
 * Deduplicate transactions using transaction IDs
 * @param {Array} transactions - Transactions to deduplicate
 * @returns {Array} - Deduplicated transactions
 */
export const deduplicateTransactions = (transactions = []) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  const uniqueTransfers = [];
  const seen = new Set();

  transactions.forEach(tx => {
    // Use transaction ID if available, otherwise create a composite key
    const txId = tx.trans_id ||
      `${tx.src}-${tx.dst}-${tx.block_time || tx.blockTime}-${tx.lamport || tx.amount}`;

    if (!seen.has(txId)) {
      seen.add(txId);
      uniqueTransfers.push(tx);
    }
  });

  return uniqueTransfers;
};

/**
 * Filter transactions by amount threshold
 * @param {Array} transactions - Transactions to filter
 * @param {number} threshold - Minimum amount in SOL
 * @returns {Array} - Filtered transactions
 */
export const filterTransactionsByAmount = (transactions = [], threshold = 10000) => {
  if (!transactions || !Array.isArray(transactions)) return [];

  return transactions.filter(tx => {
    const amount = (tx.lamport || tx.amount) / 1000000000; // Convert to SOL
    return amount >= threshold;
  });
};

/**
 * Filter transactions by token type
 * @param {Array} transactions - Transactions to filter
 * @param {string} tokenType - Token type ('all', 'sol', 'usdc', etc.)
 * @returns {Array} - Filtered transactions
 */
export const filterTransactionsByToken = (transactions = [], tokenType = 'all') => {
  if (!transactions || !Array.isArray(transactions) || tokenType === 'all') {
    return transactions;
  }

  return transactions.filter(tx => {
    // This is a simplified filter - in a real app, you'd check the token address
    // For now, we'll just assume all transactions are SOL if no token_address is specified
    if (tokenType === 'sol') {
      return !tx.token_address || tx.token_address === '';
    }

    // For other tokens, check the token_address
    // This would need to be expanded with actual token addresses
    return false;
  });
};

// Periodically prune expired cache entries
setInterval(() => {
  apiCache.prune();
}, 60000); // Run every minute



export default {
  fetchWalletTransfers,
  fetchWalletTokens,
  fetchTokenMetadata,
  fetchLatestTransactions,
  normalizeTransactions,
  deduplicateTransactions,
  filterTransactionsByAmount,
  filterTransactionsByToken,
  apiCache
};
