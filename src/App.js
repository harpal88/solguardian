import React, { useState, useEffect } from 'react';
import './App.css';

// Import components
import WhaleWatchlist from './components/WhaleWatchlist';
import WalletProfile from './components/WalletProfile';
import TransactionFlow from './components/TransactionFlow';
import TransactionTrends from './components/TransactionTrends';
import LiveWhaleTracker from './components/LiveWhaleTracker';

// Import component styles
import './components/styles/behavior-tags.css';
import './components/styles/live-whale-tracker.css';

// Import utilities
import { formatAddress, formatSOL, formatDate, timeAgo } from './utils/formatUtils';
import { THRESHOLDS } from './utils/walletUtils';
import { getKnownWalletInfo } from './data/knownWallets';
import {
  fetchWalletTransfers,
  normalizeTransactions,
  deduplicateTransactions,
  filterTransactionsByAmount
} from './utils/apiUtils';

function App() {
  // State for wallet and transaction data
  const [transfers, setTransfers] = useState([]);
  const [historicalTransfers, setHistoricalTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState("vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg");

  // State for UI controls
  const [activeTab, setActiveTab] = useState('whales');
  const [solThreshold, setSolThreshold] = useState(THRESHOLDS.LARGE_SOL_TRANSFER);

  // State for tracking large transactions (used for filtering)
  // eslint-disable-next-line no-unused-vars
  const [largeTransactions, setLargeTransactions] = useState([]);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);

    // Basic validation for Solana wallet address
    if (!walletAddress || walletAddress.trim() === "") {
      setError("Please enter a wallet address");
      setLoading(false);
      return;
    }

    // Solana addresses are base58 encoded and typically 32-44 characters
    // This is a basic check - the API will do more thorough validation
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(walletAddress) || walletAddress.length < 32 || walletAddress.length > 44) {
      setError("Invalid wallet address format. Solana addresses use base58 characters and are typically 32-44 characters long.");
      setLoading(false);
      return;
    }

    try {
      // Reset pagination when fetching new wallet
      if (currentPage === 1) {
        setHistoricalTransfers([]);
      }

      // Use our optimized API utility with caching
      const response = await fetchWalletTransfers(walletAddress, {
        page: currentPage,
        pageSize: 40, // Valid values: 10, 20, 30, 40, 60, 100
        useCache: currentPage > 1, // Only cache pages beyond the first one
        cacheMaxAge: 60000 // 1 minute cache
      });

      if (response.success) {
        const transactionData = response.data || [];

        // Normalize the transaction data using our utility
        const mappedTransactions = normalizeTransactions(transactionData);

        // Update historical transfers by combining existing with new data
        setHistoricalTransfers(prevData => {
          // Combine with existing transfers and deduplicate
          const combined = [...mappedTransactions, ...prevData];
          const uniqueTransfers = deduplicateTransactions(combined);
          return uniqueTransfers;
        });

        // If this is the first page, set transfers directly with mapped data
        if (currentPage === 1) {
          setTransfers(mappedTransactions);
        }

        // Check if we have more data to load
        setHasMoreData(transactionData.length === 40); // Using the page size we requested

        // Filter large transactions using our utility
        const large = filterTransactionsByAmount(mappedTransactions, THRESHOLDS.LARGE_SOL_TRANSFER);
        setLargeTransactions(large);

        setError(null);
      } else {
        // Extract error message from the response
        let errorMsg = "Unknown error";

        if (response.errors && response.errors.message) {
          errorMsg = response.errors.message;
        } else if (response.message) {
          errorMsg = response.message;

          if (errorMsg.includes("not found") || response.data === null) {
            errorMsg = `No transactions found for wallet address: ${walletAddress}. Please verify the address is correct and has transaction history.`;
          }
        }

        setError(errorMsg);
      }
    } catch (err) {
      // Handle errors
      let errorMsg = "Network error. Please try again.";

      if (err.response) {
        // Handle API error responses
        switch (err.response.status) {
          case 400:
            errorMsg = err.response.data?.errors?.message ||
                      err.response.data?.message ||
                      "Invalid parameters";
            break;
          case 401:
            errorMsg = "Unauthorized: Invalid API token";
            break;
          case 404:
            errorMsg = "Wallet not found or has no transactions";
            break;
          case 429:
            errorMsg = "Rate limit exceeded - try again later";
            break;
          default:
            errorMsg = `API Error: ${err.response.status}`;
        }
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset pagination when wallet address changes
    setCurrentPage(1);
    setHasMoreData(true);
    fetchTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  // Effect to fetch data when currentPage changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchTransfers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Handle tab switching
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Listen for custom event to switch to live tab
  useEffect(() => {
    const handleSwitchToLiveTab = (event) => {
      setActiveTab('live');
      // If an address was provided, set it as the current wallet
      if (event.detail && event.detail.address) {
        setWalletAddress(event.detail.address);
      }
    };

    window.addEventListener('switchToLiveTab', handleSwitchToLiveTab);

    return () => {
      window.removeEventListener('switchToLiveTab', handleSwitchToLiveTab);
    };
  }, []);

  // Handle threshold change - optimized with our utility function
  const handleThresholdChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setSolThreshold(value);

      // Update large transactions based on new threshold using our utility
      const large = filterTransactionsByAmount(transfers, value);
      setLargeTransactions(large);
    }
  };

  // Handle selecting a wallet from the whale watchlist
  const handleSelectWhaleWallet = (address) => {
    setWalletAddress(address);
    setActiveTab('transactions'); // Switch to transactions tab when selecting a wallet
    setLoading(true); // Show loading state
    // Clear previous error and transfers
    setError(null);
    setTransfers([]);
    setHistoricalTransfers([]);
    // fetchTransfers will be called by the useEffect when walletAddress changes
  };

  // Handle returning to watchlist
  const handleBackToWatchlist = () => {
    setActiveTab('whales');
  };

  // Handle loading more historical data
  const handleLoadMoreData = () => {
    if (hasMoreData) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>SolGuardian</h1>
        <p>Monitor Solana wallet transactions, track whales, and analyze wallet profiles</p>
      </header>

      <div className="dashboard">
        {loading && (
          <div className="loading-message">
            <p>Loading transaction data...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchTransfers}>Retry</button>
          </div>
        )}

        {!loading && !error && (activeTab === 'whales' || transfers.length > 0 || activeTab === 'live') && (
          <>
            <div className="tabs">
              <div
                className={`tab ${activeTab === 'whales' ? 'active' : ''}`}
                onClick={() => handleTabChange('whales')}
              >
                Whale Watchlist
              </div>
              <div
                className={`tab ${
                  activeTab === 'transactions' ||
                  activeTab === 'profile' ||
                  activeTab === 'flow' ||
                  activeTab === 'trends' ? 'active' : ''
                }`}
                onClick={() => handleTabChange('transactions')}
              >
                Wallet Track
              </div>
              <div
                className={`tab ${activeTab === 'live' ? 'active' : ''}`}
                onClick={() => handleTabChange('live')}
              >
                Live Whale Tracker
              </div>
            </div>

            {(activeTab === 'transactions' || activeTab === 'profile' || activeTab === 'flow' || activeTab === 'trends') && (
              <div className="controls">
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter Solana wallet address"
                />
                <button onClick={fetchTransfers} disabled={loading}>
                  {loading ? 'Loading...' : 'Fetch Transactions'}
                </button>
                <div className="threshold-control">
                  <label htmlFor="threshold">Large Transaction Threshold:</label>
                  <input
                    id="threshold"
                    type="number"
                    value={solThreshold}
                    onChange={handleThresholdChange}
                    min="1"
                  />
                  <span>SOL</span>
                </div>
              </div>
            )}

            <div className="tab-content">
              {activeTab === 'live' && <LiveWhaleTracker />}

              {activeTab === 'whales' && (
                <WhaleWatchlist
                  onSelectWallet={handleSelectWhaleWallet}
                />
              )}

              {(activeTab === 'transactions' || activeTab === 'profile' || activeTab === 'flow' || activeTab === 'trends') && (
                <div className="wallet-track-container">
                  <div className="wallet-track-tabs">
                    <div
                      className={`wallet-tab ${activeTab === 'transactions' ? 'active' : ''}`}
                      onClick={() => handleTabChange('transactions')}
                    >
                      Transactions
                    </div>
                    <div
                      className={`wallet-tab ${activeTab === 'profile' ? 'active' : ''}`}
                      onClick={() => handleTabChange('profile')}
                    >
                      Wallet Profile
                    </div>
                    <div
                      className={`wallet-tab ${activeTab === 'flow' ? 'active' : ''}`}
                      onClick={() => handleTabChange('flow')}
                    >
                      Transaction Flow
                    </div>
                    <div
                      className={`wallet-tab ${activeTab === 'trends' ? 'active' : ''}`}
                      onClick={() => handleTabChange('trends')}
                    >
                      Transaction Trends
                    </div>
                  </div>

                  {activeTab === 'transactions' && (
                    <div className="transfers-list">
                      <h2>Recent Transfers</h2>
                      <table>
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Amount</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transfers.map((transfer, index) => {
                            const amount = (transfer.lamport || transfer.amount) / 1000000000;
                            const isLarge = amount >= solThreshold;
                            const timestamp = transfer.block_time || transfer.blockTime;
                            const fromInfo = getKnownWalletInfo(transfer.src);
                            const toInfo = getKnownWalletInfo(transfer.dst);

                            return (
                              <tr key={index} className={isLarge ? 'large-transfer' : ''}>
                                <td>
                                  <div>{formatDate(timestamp)}</div>
                                  <div className="time-ago">{timeAgo(timestamp)}</div>
                                </td>
                                <td className="address" title={transfer.src}>
                                  <div className="address-container">
                                    <div className="address-row">
                                      {fromInfo ? (
                                        <span className="known-address">{fromInfo.name}</span>
                                      ) : (
                                        <span className="wallet-address-text">{formatAddress(transfer.src)}</span>
                                      )}
                                      <a
                                        href={`https://solscan.io/account/${transfer.src}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="view-link"
                                        title="View on Solscan"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        View
                                      </a>
                                    </div>
                                  </div>
                                </td>
                                <td className="address" title={transfer.dst}>
                                  <div className="address-container">
                                    <div className="address-row">
                                      {toInfo ? (
                                        <span className="known-address">{toInfo.name}</span>
                                      ) : (
                                        <span className="wallet-address-text">{formatAddress(transfer.dst)}</span>
                                      )}
                                      <a
                                        href={`https://solscan.io/account/${transfer.dst}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="view-link"
                                        title="View on Solscan"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        View
                                      </a>
                                    </div>
                                  </div>
                                </td>
                                <td className={isLarge ? 'amount alert' : 'amount'}>
                                  {formatSOL(transfer.lamport || transfer.amount)} SOL
                                  {isLarge && ' ⚠️'}
                                </td>
                                <td>
                                  {transfer.src === walletAddress ?
                                    <span className="outgoing">Outgoing</span> :
                                    <span className="incoming">Incoming</span>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    transfers.length === 0 ? (
                      <div className="no-transactions">
                        <p>Cannot generate a profile for wallet <span className="wallet-address">{formatAddress(walletAddress)}</span> because no transactions were found.</p>
                        <div>
                          <button onClick={fetchTransfers}>Refresh</button>
                          <button className="secondary" onClick={handleBackToWatchlist}>Back to Watchlist</button>
                        </div>
                      </div>
                    ) : (
                      <WalletProfile
                        walletAddress={walletAddress}
                        transactions={transfers}
                      />
                    )
                  )}

                  {activeTab === 'flow' && (
                    transfers.length === 0 ? (
                      <div className="no-transactions">
                        <p>Cannot analyze transaction flow for wallet <span className="wallet-address">{formatAddress(walletAddress)}</span> because no transactions were found.</p>
                        <div>
                          <button onClick={fetchTransfers}>Refresh</button>
                          <button className="secondary" onClick={handleBackToWatchlist}>Back to Watchlist</button>
                        </div>
                      </div>
                    ) : (
                      <TransactionFlow
                        walletAddress={walletAddress}
                        transactions={transfers}
                      />
                    )
                  )}

                  {activeTab === 'trends' && (
                    historicalTransfers.length === 0 ? (
                      <div className="no-transactions">
                        <p>Cannot analyze trends for wallet <span className="wallet-address">{formatAddress(walletAddress)}</span> because no transactions were found.</p>
                        <div>
                          <button onClick={fetchTransfers}>Refresh</button>
                          <button className="secondary" onClick={handleBackToWatchlist}>Back to Watchlist</button>
                        </div>
                      </div>
                    ) : (
                      <TransactionTrends
                        walletAddress={walletAddress}
                        transactions={historicalTransfers}
                      />
                    )
                  )}

                  {hasMoreData && activeTab === 'trends' && (
                    <div className="load-more-container">
                      <button onClick={handleLoadMoreData} className="load-more-button">
                        Load More Historical Data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {!loading && !error && transfers.length === 0 && activeTab !== 'whales' && activeTab !== 'live' && (
          <div className="no-transactions">
            <p>No transfers found for wallet address: <span className="wallet-address">{formatAddress(walletAddress)}</span></p>
            <p>This could be because:</p>
            <ul>
              <li>The wallet is new or inactive</li>
              <li>The wallet address may be incorrect</li>
              <li>There might be an issue with the API service</li>
            </ul>
            <div>
              <button onClick={fetchTransfers}>Refresh</button>
              <button className="secondary" onClick={handleBackToWatchlist}>Back to Watchlist</button>
              <a
                href={`https://solscan.io/account/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Solscan Explorer
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
