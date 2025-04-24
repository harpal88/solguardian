/**
 * Utility functions for formatting data
 */

/**
 * Format a wallet address for display by truncating the middle
 * @param {string} address - The wallet address to format
 * @returns {string} - Formatted address
 */
export const formatAddress = (address) => {
  if (!address) return '';
  return address.length > 12 ?
    `${address.substring(0, 6)}...${address.substring(address.length - 6)}` :
    address;
};

/**
 * Format a number with commas as thousands separators
 * @param {number} num - The number to format
 * @returns {string} - Formatted number
 */
export const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * Format an amount of SOL with proper decimal places
 * @param {number} lamports - Amount in lamports
 * @returns {string} - Formatted SOL amount
 */
export const formatSOL = (lamports) => {
  const sol = lamports / 1000000000;
  return sol.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 9
  });
};

/**
 * Format a date from a Unix timestamp
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} - Formatted date string
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown date';

  try {
    const date = new Date(timestamp * 1000);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Format: Jan 1, 2023 14:30:45
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date error';
  }
};

/**
 * Get a human-readable time ago string
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} - Time ago string (e.g., "2 hours ago")
 */
export const timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() / 1000) - timestamp);

  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + ' years ago';
  if (interval === 1) return '1 year ago';

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + ' months ago';
  if (interval === 1) return '1 month ago';

  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + ' days ago';
  if (interval === 1) return '1 day ago';

  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + ' hours ago';
  if (interval === 1) return '1 hour ago';

  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + ' minutes ago';
  if (interval === 1) return '1 minute ago';

  if (seconds < 10) return 'just now';

  return Math.floor(seconds) + ' seconds ago';
};
