import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { formatSOL, formatAddress, formatDate, timeAgo } from '../utils/formatUtils';
import { getKnownWalletInfo } from '../data/knownWallets';
import { FaExclamationTriangle, FaArrowRight, FaSync, FaPause, FaPlay, FaFilter } from 'react-icons/fa';
import {
  fetchWalletTransfers,
  normalizeTransactions,
  deduplicateTransactions,
  filterTransactionsByAmount,
  filterTransactionsByToken
} from '../utils/apiUtils';

/**
 * Live Whale Tracker Dashboard Component - Enhanced Version
 * Polls for new large transactions in real-time with improved automatic updates
 */
const LiveWhaleTracker = ({ currentWalletAddress }) => {
  // Core state
  const [liveTransfers, setLiveTransfers] = useState([]);
  const [isPolling, setIsPolling] = useState(true);
  const [lastPollTime, setLastPollTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0); // Track number of polls for debugging
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true); // Control auto-refresh
  const [notification, setNotification] = useState(null); // For displaying notifications

  // Filter state
  const [tokenFilter, setTokenFilter] = useState('all'); // 'all', 'sol', 'usdc', 'usdt', 'bonk'
  const [thresholdAmount, setThresholdAmount] = useState(10000); // Default 10K SOL
  const [thresholdInput, setThresholdInput] = useState('10000');

  // Track if values are being updated to prevent polling conflicts
  const [isUpdating, setIsUpdating] = useState(false);

  // Wallet management state
  const [currentWalletIndex, setCurrentWalletIndex] = useState(0);
  const [showWalletEditor, setShowWalletEditor] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');

  // Default wallets to monitor - known active wallets
  const defaultWallets = [
    { address: "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2", label: "Active Whale 1" },
    { address: "52C9T2T7JRojtxumYnYZhyUmrN7kqzvCLc4Ksvjk7TxD", label: "Active Whale 2" },
    { address: "8BseXT9EtoEhBTKFFYkwTnjKSUZwhtmdKY2Jrj8j45Rt", label: "Active Whale 3" },
    { address: "GitYucwpNcg6Dx1Y15UQ9TQn8LZMX1uuqQNn8rXxEWNC", label: "Active Whale 4" },
    { address: "9QgXqrgdbVU8KcpfskqJpAXKzbaYQJecgMAruSWoXDkM", label: "Active Whale 5" }
  ];

  // Load wallets from localStorage or use defaults
  const [activeWallets, setActiveWallets] = useState(() => {
    try {
      const savedWallets = localStorage.getItem('liveTrackerWallets');
      return savedWallets ? JSON.parse(savedWallets) : defaultWallets;
    } catch (e) {
      console.error('Error loading wallets from localStorage:', e);
      return defaultWallets;
    }
  });

  // Store the polling interval ID and track last fetch time
  const pollingIntervalRef = useRef(null);
  const lastFetchTimeRef = useRef(Date.now());
  const POLL_INTERVAL = 10000; // 10 seconds between polls

  // Fetch transfers for a specific wallet - optimized with our new API utilities
  const fetchTransfersForWallet = async (wallet) => {
    // If we're already updating values, don't fetch
    if (isUpdating) {
      console.log('Skipping fetch while values are being updated');
      return;
    }

    // Set loading state and clear any previous errors
    setLoading(true);
    setError(null);

    // Update last poll time to show activity
    const currentTime = new Date();
    setLastPollTime(currentTime);
    lastFetchTimeRef.current = currentTime.getTime();

    try {
      // Use our optimized API utility with caching
      // For live tracking, we want fresh data, so use a short cache time
      const response = await fetchWalletTransfers(wallet.address, {
        pageSize: 20,
        useCache: true,
        cacheMaxAge: 5000 // 5 seconds cache for live tracking
      });

      if (response.success) {
        const transactions = response.data || [];

        // Log successful fetch for debugging
        console.log(`Fetched ${transactions.length} transactions from ${wallet.label}`);

        // Normalize the transaction data
        const mappedTransactions = normalizeTransactions(transactions);

        // Filter for large transactions
        const largeTransactions = filterTransactionsByAmount(mappedTransactions, thresholdAmount);

        // Apply token filter if needed
        const filteredByToken = tokenFilter !== 'all'
          ? filterTransactionsByToken(largeTransactions, tokenFilter)
          : largeTransactions;

        console.log(`Found ${filteredByToken.length} large transactions above ${thresholdAmount} SOL`);

        // Add wallet label to each transaction
        const enhancedTransactions = filteredByToken.map(tx => ({
          ...tx,
          walletLabel: wallet.label
        }));

        // Only update if we found large transactions
        if (enhancedTransactions.length > 0) {
          // Update transfers with proper deduplication
          setLiveTransfers(prev => {
            // Combine with existing transfers
            const combined = [...enhancedTransactions, ...prev];

            // Use our optimized deduplication function
            const uniqueTransfers = deduplicateTransactions(combined);

            // Limit to 50 transactions to prevent memory issues
            return uniqueTransfers.slice(0, 50);
          });
        }

        setError(null);
      } else {
        console.log("API returned error:", response);
        setError("API returned an error. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching transfers:", error);
      // Only set error if it's a critical failure
      if (error.response && error.response.status === 401) {
        setError("API authentication error. Please check your API token.");
      }
    } finally {
      setLoading(false);

      // Increment poll count for UI feedback
      setPollCount(prev => prev + 1);
    }
  };

  // Fetch transfers from the next wallet in rotation
  const fetchNextWallet = () => {
    if (activeWallets.length === 0) {
      setError("No wallets configured for monitoring. Please add wallets below.");
      return;
    }

    // Clear any existing error
    setError(null);

    const wallet = activeWallets[currentWalletIndex];
    fetchTransfersForWallet(wallet);

    // Move to next wallet for next poll
    setCurrentWalletIndex(prevIndex => (prevIndex + 1) % activeWallets.length);
  };

  // Setup and manage the polling interval - optimized with dynamic polling
  const setupPollingInterval = useCallback(() => {
    // Clear any existing interval first
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only set up polling if it's enabled and we have wallets to monitor
    if (isPolling && autoRefreshEnabled && activeWallets.length > 0 && !isUpdating) {
      console.log('Setting up polling interval');

      // Use a dynamic polling interval based on the number of wallets
      // More wallets = slightly longer interval to prevent API rate limits
      const dynamicInterval = Math.max(POLL_INTERVAL, activeWallets.length * 2000);

      pollingIntervalRef.current = setInterval(fetchNextWallet, dynamicInterval);
    }
  }, [isPolling, autoRefreshEnabled, activeWallets.length, isUpdating]);

  // Initial data fetch and polling setup on component mount
  useEffect(() => {
    // Fetch data immediately when component mounts
    if (activeWallets.length > 0) {
      fetchNextWallet();
      setupPollingInterval();
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update polling when relevant states change
  useEffect(() => {
    setupPollingInterval();
  }, [isPolling, autoRefreshEnabled, activeWallets.length, isUpdating, setupPollingInterval]);

  // Effect to handle automatic resumption of polling after updates
  useEffect(() => {
    if (isUpdating) {
      // When updating, ensure polling is paused
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } else if (autoRefreshEnabled && isPolling) {
      // When done updating, resume polling if it should be active
      setupPollingInterval();
    }
  }, [isUpdating, autoRefreshEnabled, isPolling, setupPollingInterval]);

  // Effect to add the current wallet address to active wallets when it changes
  useEffect(() => {
    if (currentWalletAddress && currentWalletAddress.trim() !== '') {
      // Check if the wallet is already in the active wallets list
      const walletExists = activeWallets.some(wallet => wallet.address === currentWalletAddress);

      if (!walletExists) {
        // Get wallet info if available
        const knownInfo = getKnownWalletInfo(currentWalletAddress);

        // Create new wallet object
        const newWallet = {
          address: currentWalletAddress,
          label: knownInfo ? knownInfo.name : `Wallet ${formatAddress(currentWalletAddress)}`
        };

        // Add to active wallets
        const updatedWallets = [...activeWallets, newWallet];
        setActiveWallets(updatedWallets);

        // Save to localStorage
        localStorage.setItem('liveTrackerWallets', JSON.stringify(updatedWallets));

        // Show a notification that the wallet was added
        setNotification(`Added ${newWallet.label} to live tracking`);

        // Clear notification after 3 seconds
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    }
  }, [currentWalletAddress, activeWallets]);

  // Manual refresh function
  const refreshData = () => {
    // Pause any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Fetch data immediately
    fetchNextWallet();

    // Resume polling if auto-refresh is enabled
    if (autoRefreshEnabled) {
      setIsPolling(true);
      setupPollingInterval();
    }
  };

  // Toggle auto-refresh functionality with memory cleanup
  const toggleAutoRefresh = () => {
    const newState = !autoRefreshEnabled;
    setAutoRefreshEnabled(newState);

    if (!newState && pollingIntervalRef.current) {
      // If turning off auto-refresh, stop polling
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;

      // When pausing, we can trim the transfer list to save memory
      if (liveTransfers.length > 20) {
        setLiveTransfers(prev => prev.slice(0, 20));
      }
    } else if (newState && isPolling) {
      // If turning on auto-refresh and polling should be active, restart it
      setupPollingInterval();
      // Immediately fetch new data
      fetchNextWallet();
    }
  };

  // Handle token filter change - optimized with our utility functions
  const handleTokenFilterChange = (token) => {
    // Set updating flag to prevent polling conflicts
    setIsUpdating(true);

    // Update the filter
    setTokenFilter(token);
    console.log(`Token filter changed to: ${token}`);

    // Filter existing transfers with new token filter using our utility
    if (liveTransfers.length > 0) {
      const filteredTransfers = filterTransactionsByToken(liveTransfers, token);
      setLiveTransfers(filteredTransfers);
    }

    // Immediately fetch new data with the updated filter
    fetchNextWallet();

    // Clear updating flag after a short delay to ensure the fetch completes
    setTimeout(() => {
      setIsUpdating(false);
    }, 500); // Reduced delay for better responsiveness
  };

  // Handle threshold input change with auto-apply after delay
  const handleThresholdInputChange = (e) => {
    const newValue = e.target.value;
    setThresholdInput(newValue);

    // Auto-apply threshold after user stops typing (debounce)
    const debounceTimer = setTimeout(() => {
      applyThresholdChange(newValue);
    }, 800); // Wait 800ms after typing stops

    // Clear previous timer if user is still typing
    return () => clearTimeout(debounceTimer);
  };

  // Apply threshold change - optimized with our utility functions
  const applyThresholdChange = (valueToApply = null) => {
    // Use passed value or get from state
    const inputValue = valueToApply || thresholdInput;
    const value = parseInt(inputValue);

    if (!isNaN(value) && value > 0) {
      // Set updating flag to prevent polling conflicts
      setIsUpdating(true);
      console.log(`Applying new threshold: ${value} SOL`);

      // Update the threshold value
      setThresholdAmount(value);

      // Filter existing transfers with new threshold using our utility
      const filteredTransfers = filterTransactionsByAmount(liveTransfers, value);

      // Update the transfers list
      setLiveTransfers(filteredTransfers);

      // Immediately fetch new data with the updated threshold
      fetchNextWallet();

      // Clear updating flag after a short delay
      setTimeout(() => {
        setIsUpdating(false);
      }, 500); // Reduced delay for better responsiveness
    } else {
      // Reset input to current threshold if invalid
      setThresholdInput(thresholdAmount.toString());
    }
  };

  // Handle Enter key press
  const handleThresholdKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyThresholdChange();
    }
  };

  // Simple wallet type detection based on known patterns
  const getWalletTypeLabel = (address) => {
    // Get known wallet info
    const knownInfo = getKnownWalletInfo(address);

    // If we have known info, use that to determine type
    if (knownInfo) {
      const name = knownInfo.name.toLowerCase();
      if (name.includes('binance') || name.includes('ftx') || name.includes('kraken')) {
        return 'Exchange';
      }

      if (name.includes('foundation') || name.includes('treasury')) {
        return 'Treasury';
      }
    }

    // Default to 'Unknown' if we can't determine the type
    return 'Unknown';
  };

  return (
    <div className="live-whale-tracker">
      <h2>
        <span>🔴</span> Live Whale Tracker
      </h2>
      <div className="tracker-controls">
        <div className="controls-row">
          <div className="input-section">
            <div className="min-size-control">
              <label><FaExclamationTriangle /> Min Size</label>
              <div className="input-group">
                <input
                  type="number"
                  value={thresholdInput}
                  onChange={handleThresholdInputChange}
                  onKeyPress={handleThresholdKeyPress}
                  min="1"
                  className="size-input"
                />
                <span className="input-suffix">SOL</span>
                <button
                  className="apply-btn"
                  onClick={() => applyThresholdChange()}
                  title="Apply threshold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          <div className="action-section">
            <div className="refresh-control">
              <button
                className="refresh-btn"
                onClick={refreshData}
                title="Manually refresh data"
              >
                <FaSync /> Refresh
              </button>
              <button
                className={`auto-btn ${autoRefreshEnabled ? 'active' : 'paused'}`}
                onClick={toggleAutoRefresh}
                title={autoRefreshEnabled ? 'Pause auto-refresh' : 'Enable auto-refresh'}
              >
                {autoRefreshEnabled ? <FaPause /> : <FaPlay />}
                {autoRefreshEnabled ? 'Auto' : 'Manual'}
              </button>
            </div>
          </div>
        </div>

        <div className="filter-row">
          <div className="token-filter">
            <label><FaFilter /> Token Filter</label>
            <div className="filter-buttons">
              <button
                className={tokenFilter === 'all' ? 'active' : ''}
                onClick={() => handleTokenFilterChange('all')}
              >
                All
              </button>
              <button
                className={tokenFilter === 'sol' ? 'active' : ''}
                onClick={() => handleTokenFilterChange('sol')}
              >
                SOL
              </button>
              <button
                className={tokenFilter === 'usdc' ? 'active' : ''}
                onClick={() => handleTokenFilterChange('usdc')}
              >
                USDC
              </button>
              <button
                className={tokenFilter === 'usdt' ? 'active' : ''}
                onClick={() => handleTokenFilterChange('usdt')}
              >
                USDT
              </button>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="notification-message">
          <div className="notification-content">
            {notification}
          </div>
        </div>
      )}

      <div className={`live-status ${autoRefreshEnabled ? 'active' : 'paused'}`}>
        <div className="live-status-indicator"></div>
        <div className="live-status-text">
          {autoRefreshEnabled
            ? `Monitoring ${activeWallets.length} whale wallets in real-time`
            : 'Live monitoring paused'}
        </div>
        <div className="live-status-details">
          {lastPollTime && `Last updated: ${timeAgo(Math.floor(lastPollTime.getTime() / 1000))}`}
        </div>
      </div>

      <div className="monitoring-info">
        <div>Monitoring <span>{activeWallets.length}</span> active whale wallets</div>
        <button
          className="edit-wallets-btn"
          onClick={() => setShowWalletEditor(!showWalletEditor)}
          title="Edit monitored wallets"
        >
          {showWalletEditor ? 'Hide Editor' : 'Edit Wallets'}
        </button>
      </div>

      {showWalletEditor && (
        <div className="wallet-editor">
          <h3>Monitored Wallets ({activeWallets.length})</h3>
          <div className="wallet-list">
            {activeWallets.length === 0 ? (
              <div className="no-wallets">No wallets added. Add wallets below to monitor.</div>
            ) : (
              activeWallets.map((wallet, index) => (
              <div key={index} className="wallet-item">
                <div className="wallet-info">
                  <span className="wallet-label">{wallet.label || 'Unnamed Wallet'}</span>
                  <span className="wallet-address" title={wallet.address}>{formatAddress(wallet.address)}</span>
                </div>
                <button
                  className="remove-wallet"
                  onClick={() => {
                    // Get the wallet being removed
                    const walletToRemove = activeWallets[index];

                    // Remove wallet from list
                    const newWallets = [...activeWallets];
                    newWallets.splice(index, 1);
                    setActiveWallets(newWallets);

                    // Save to localStorage
                    localStorage.setItem('liveTrackerWallets', JSON.stringify(newWallets));

                    // Reset current index if needed
                    if (currentWalletIndex >= newWallets.length) {
                      setCurrentWalletIndex(0);
                    }

                    // Filter out transactions from the removed wallet
                    setLiveTransfers(prevTransfers =>
                      prevTransfers.filter(transfer =>
                        transfer.walletLabel !== walletToRemove.label
                      )
                    );
                  }}
                  title="Remove wallet"
                >
                  Remove
                </button>
              </div>
            )))
          }
          </div>

          <div className="wallet-editor-actions">
            <button
              className="reset-wallets"
              onClick={() => {
                // Reset to default wallets
                setActiveWallets(defaultWallets);
                localStorage.setItem('liveTrackerWallets', JSON.stringify(defaultWallets));

                // Clear existing transactions to start fresh with default wallets
                setLiveTransfers([]);
              }}
              title="Reset to default wallets"
            >
              Reset to Defaults
            </button>
            <button
              className="clear-wallets"
              onClick={() => {
                // Clear all wallets
                setActiveWallets([]);
                localStorage.setItem('liveTrackerWallets', JSON.stringify([]));

                // Clear all transactions
                setLiveTransfers([]);
              }}
              title="Clear all wallets"
            >
              Clear All
            </button>
          </div>

          <div className="add-wallet-form">
            <div className="form-row">
              <input
                type="text"
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value)}
                placeholder="Enter wallet address"
                className="wallet-address-input"
              />
            </div>
            <div className="form-row">
              <input
                type="text"
                value={newWalletLabel}
                onChange={(e) => setNewWalletLabel(e.target.value)}
                placeholder="Enter wallet label (optional)"
                className="wallet-label-input"
              />
              <button
                onClick={() => {
                  if (newWalletAddress && newWalletAddress.length >= 32) {
                    // Check if wallet already exists
                    const exists = activeWallets.some(w => w.address === newWalletAddress);

                    if (!exists) {
                      const newWallet = {
                        address: newWalletAddress,
                        label: newWalletLabel || 'Custom Wallet'
                      };

                      const updatedWallets = [...activeWallets, newWallet];
                      setActiveWallets(updatedWallets);

                      // Save to localStorage
                      localStorage.setItem('liveTrackerWallets', JSON.stringify(updatedWallets));

                      // Reset inputs
                      setNewWalletAddress('');
                      setNewWalletLabel('');
                    }
                  }
                }}
                disabled={!newWalletAddress || newWalletAddress.length < 32}
                className="add-wallet-button"
              >
                Add Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && liveTransfers.length === 0 && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading whale transactions...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={refreshData}>Retry</button>
        </div>
      )}

      <div className="live-transfers-list">
        <h3>
          Live Whale Transactions
          {loading && liveTransfers.length > 0 && <span className="loading-indicator"> (Updating...)</span>}
        </h3>

        {liveTransfers.length === 0 ? (
          <div className="no-transactions">
            <p>No large transactions detected yet. Waiting for activity...</p>
            <p className="api-note">Monitoring transactions above {thresholdAmount} SOL</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {liveTransfers.map((transfer, index) => {
                const amount = (transfer.lamport || transfer.amount) / 1000000000;
                const timestamp = transfer.block_time || transfer.blockTime;
                const fromInfo = getKnownWalletInfo(transfer.src);
                const toInfo = getKnownWalletInfo(transfer.dst);
                const fromType = getWalletTypeLabel(transfer.src);
                const toType = getWalletTypeLabel(transfer.dst);

                return (
                  <tr key={index} className="live-transaction-row">
                    <td>
                      <div>{formatDate(timestamp)}</div>
                      <div className="time-ago">{timeAgo(timestamp)}</div>
                    </td>
                    <td>
                      <div className="address-container">
                        <div className="address-row">
                          {fromInfo ? (
                            <span className="wallet-address-text known-address">{fromInfo.name}</span>
                          ) : (
                            <span className="wallet-address-text">{formatAddress(transfer.src)}</span>
                          )}
                          <a
                            href={`https://solscan.io/account/${transfer.src}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-link"
                            title="View on Solscan"
                          >
                            View
                          </a>
                        </div>
                        <span className={`wallet-type ${fromType.toLowerCase()}`}>{fromType}</span>
                      </div>
                    </td>
                    <td>
                      <div className="address-container">
                        <div className="address-row">
                          {toInfo ? (
                            <span className="wallet-address-text known-address">{toInfo.name}</span>
                          ) : (
                            <span className="wallet-address-text">{formatAddress(transfer.dst)}</span>
                          )}
                          <a
                            href={`https://solscan.io/account/${transfer.dst}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-link"
                            title="View on Solscan"
                          >
                            View
                          </a>
                        </div>
                        <span className={`wallet-type ${toType.toLowerCase()}`}>{toType}</span>
                      </div>
                    </td>
                    <td>
                      <div className="amount">
                        {formatSOL(transfer.lamport || transfer.amount)} SOL
                        {amount >= thresholdAmount * 2 && <FaExclamationTriangle className="alert-icon" />}
                      </div>
                    </td>
                    <td>
                      <div className="source-wallet">
                        <span className="source-label">{transfer.walletLabel || 'Unknown'}</span>
                        <span className="transfer-type">
                          {transfer.src === transfer.walletAddress ? (
                            <>Outgoing <FaArrowRight /></>
                          ) : (
                            <>Incoming <FaArrowRight /></>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LiveWhaleTracker;
