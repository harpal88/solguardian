import React, { useState, useEffect, useMemo } from 'react';
import {
  calculateWalletProfile,
  getProfileDescription,
  getWalletRiskAssessment,
  isLargeTransaction,
  THRESHOLDS,
  WALLET_PROFILES
} from '../utils/walletUtils';
import { getKnownWalletInfo } from '../data/knownWallets';
import { formatAddress, formatSOL, formatDate, timeAgo } from '../utils/formatUtils';
import { FaCoins, FaExchangeAlt, FaSnowflake, FaFrog, FaWater, FaExclamationTriangle, FaHistory } from 'react-icons/fa';
import { fetchWalletTokens, fetchTokenMetadata, filterTransactionsByAmount } from '../utils/apiUtils';

/**
 * Component for displaying wallet profile and transaction analysis
 */
const WalletProfile = ({ walletAddress, transactions }) => {
  // State for token holdings
  const [tokenHoldings, setTokenHoldings] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [tokenMetadata, setTokenMetadata] = useState({});

  // Get wallet profile based on transaction history
  const profile = calculateWalletProfile(transactions);

  // Get risk assessment
  const riskAssessment = getWalletRiskAssessment(profile);

  // Check if this is a known wallet
  const knownWalletInfo = getKnownWalletInfo(walletAddress);

  // Map transaction fields to ensure compatibility
  const mappedTransactions = transactions.map(tx => ({
    src: tx.from_address || tx.src,
    dst: tx.to_address || tx.dst,
    block_time: tx.block_time || tx.blockTime,
    amount: tx.amount,
    lamport: tx.amount, // Store the amount in lamports for consistency
    trans_id: tx.trans_id || tx.tx_hash, // Transaction ID/hash
    token_address: tx.token_address,
    token_decimals: tx.token_decimals,
    flow: tx.flow, // 'in' or 'out'
    time: tx.time,
    // Keep the original data for reference
    _original: tx
  }));

  // Count large transactions using our utility function
  const largeTransactions = useMemo(() => {
    return filterTransactionsByAmount(mappedTransactions, THRESHOLDS.LARGE_SOL_TRANSFER);
  }, [mappedTransactions]);

  // Fetch token holdings using our optimized API utility
  useEffect(() => {
    const fetchTokenHoldings = async () => {
      setLoadingTokens(true);
      try {
        // Use our optimized API utility with caching
        const response = await fetchWalletTokens(walletAddress, {
          pageSize: 10,
          useCache: true,
          cacheMaxAge: 120000 // 2 minutes cache for token data
        });

        if (response.success) {
          const tokenData = response.data || [];
          setTokenHoldings(tokenData);
          setTokenError(null);

          // Fetch metadata for each token - limit concurrent requests
          const fetchMetadataWithDelay = async () => {
            for (const token of tokenData) {
              if (token.token_address) {
                await fetchTokenMetadataForWallet(token.token_address);
                // Small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          };

          fetchMetadataWithDelay();
        } else {
          console.error("API returned error:", response);
          setTokenError("Failed to fetch token holdings");
        }
      } catch (error) {
        console.error("Error fetching token holdings:", error);
        setTokenError(`Error: ${error.message}`);
      } finally {
        setLoadingTokens(false);
      }
    };

    fetchTokenHoldings();
  }, [walletAddress]);

  // Fetch token metadata using our optimized API utility
  const fetchTokenMetadataForWallet = async (tokenAddress) => {
    try {
      // Use our optimized API utility with longer caching for metadata
      const response = await fetchTokenMetadata(tokenAddress, {
        useCache: true,
        cacheMaxAge: 3600000 // 1 hour cache for token metadata
      });

      if (response.success && response.data) {
        setTokenMetadata(prev => ({
          ...prev,
          [tokenAddress]: response.data
        }));
      }
    } catch (error) {
      console.error(`Error fetching metadata for token ${tokenAddress}:`, error);
    }
  };

  return (
    <div className="wallet-profile">
      <h2>Wallet Profile</h2>

      <div className="profile-card">
        <div className="profile-header">
          <h3>
            {knownWalletInfo ? knownWalletInfo.name : `Wallet ${formatAddress(walletAddress)}`}
          </h3>
          {knownWalletInfo && (
            <div className="known-wallet-badge">
              {knownWalletInfo.type.toUpperCase()}
            </div>
          )}
        </div>

        <div className="profile-details">
          <div className="profile-item">
            <span className="label">Address:</span>
            <span className="value address" title={walletAddress}>
              {formatAddress(walletAddress)}
            </span>
          </div>

          {knownWalletInfo && (
            <div className="profile-item">
              <span className="label">Type:</span>
              <span className="value">
                {knownWalletInfo.exchange ? `${knownWalletInfo.type} (${knownWalletInfo.exchange})` :
                 knownWalletInfo.dex ? `${knownWalletInfo.type} (${knownWalletInfo.dex})` :
                 knownWalletInfo.type}
              </span>
            </div>
          )}

          <div className="profile-item">
            <span className="label">Profile:</span>
            <span className="value profile-type">
              {profile.type}
            </span>
          </div>

          <div className="profile-item">
            <span className="label">Description:</span>
            <span className="value">
              {getProfileDescription(profile.type)}
            </span>
          </div>

          <div className="profile-item">
            <span className="label">Activity Score:</span>
            <span className="value score">
              {profile.score}
            </span>
          </div>

          <div className="profile-item">
            <span className="label">Risk Level:</span>
            <span className={`value risk-level ${riskAssessment.level}`}>
              {riskAssessment.level.toUpperCase()}
            </span>
          </div>

          <div className="profile-item">
            <span className="label">Risk Assessment:</span>
            <span className="value">
              {riskAssessment.description}
            </span>
          </div>

          <div className="profile-metrics">
            <div className="metric">
              <div className="metric-value">{profile.tradingFrequency}</div>
              <div className="metric-label">Trades/Day</div>
            </div>

            <div className="metric">
              <div className="metric-value">{profile.holdingPeriod}</div>
              <div className="metric-label">Days Active</div>
            </div>

            <div className="metric">
              <div className="metric-value">{profile.largeTransactions}</div>
              <div className="metric-label">Large Txns</div>
            </div>
          </div>

          <div className="advanced-metrics">
            <h4>Advanced Metrics</h4>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Volatility:</span>
                <span className="metric-value">{profile.volatility}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Avg Transaction:</span>
                <span className="metric-value">{profile.avgTransactionSize} SOL</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Exchange Interactions:</span>
                <span className="metric-value">{profile.exchangeInteractions}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">DEX Interactions:</span>
                <span className="metric-value">{profile.dexInteractions}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Whale Interactions:</span>
                <span className="metric-value">{profile.whaleInteractions}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Pattern Score:</span>
                <span className="metric-value">{profile.patternScore}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="behavior-tags-section">
        <h3>Wallet Behavior Tags</h3>
        <div className="behavior-tags">
          {profile.holdingPeriod > 180 && (
            <div className="behavior-tag hodler" title="Long-term Holder: Holds assets for extended periods">
              <FaSnowflake /> HODLER
            </div>
          )}

          {profile.tradingFrequency > 5 && (
            <div className="behavior-tag flipper" title="Flipper: Frequently trades assets">
              <FaFrog /> FLIPPER
            </div>
          )}

          {(profile.type === WALLET_PROFILES.WHALE_ACCUMULATOR ||
            profile.avgTransactionSize > THRESHOLDS.LARGE_SOL_TRANSFER / 2) && (
            <div className="behavior-tag whale" title="Whale: Moves large amounts of tokens">
              <FaWater /> WHALE
            </div>
          )}

          {(riskAssessment.level === 'high' || profile.volatility > 80) && (
            <div className="behavior-tag suspicious" title="Suspicious: Unusual transaction patterns detected">
              <FaExclamationTriangle /> SUSPICIOUS
            </div>
          )}

          {profile.type === WALLET_PROFILES.EARLY_BUYER && (
            <div className="behavior-tag early" title="Early Adopter: Has been in the ecosystem for a long time">
              <FaHistory /> EARLY ADOPTER
            </div>
          )}
        </div>
      </div>

      <div className="token-holdings">
        <h3><FaCoins /> Token Holdings</h3>
        {loadingTokens ? (
          <div className="loading-tokens">
            <div className="loading-spinner"></div>
            <p>Loading token holdings...</p>
          </div>
        ) : tokenError ? (
          <div className="token-error">
            <p>Token holdings data temporarily unavailable</p>
            <div className="token-error-details">
              <a
                href={`https://solscan.io/account/${walletAddress}#splTransfer`}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View tokens on Solscan
              </a>
            </div>
          </div>
        ) : tokenHoldings.length === 0 ? (
          <div className="no-tokens">
            <p>No token holdings found for this wallet.</p>
            <div className="token-error-details">
              <a
                href={`https://solscan.io/account/${walletAddress}#splTransfer`}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Solscan
              </a>
            </div>
          </div>
        ) : (
          <div className="tokens-grid">
            {tokenHoldings.slice(0, 8).map((token, index) => {
              const tokenAmount = token.amount || 0;
              const tokenDecimals = token.token_decimals || 9;
              const formattedAmount = (tokenAmount / Math.pow(10, tokenDecimals)).toFixed(4);

              return (
                <div key={index} className="token-card">
                  <div className="token-icon">
                    {token.icon ? (
                      <img src={token.icon} alt={token.token_address || 'Token'} />
                    ) : (
                      <div className="token-placeholder">{(token.token_address || '?').substring(0, 1)}</div>
                    )}
                  </div>
                  <div className="token-details">
                    <div className="token-name">
                      {tokenMetadata[token.token_address]?.symbol ||
                       (token.token_address ? token.token_address.substring(0, 6) + '...' : 'Unknown Token')}
                    </div>
                    <div className="token-amount">{formattedAmount}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {largeTransactions.length > 0 && (
        <div className="large-transactions">
          <h3><FaExchangeAlt /> Large Transactions (>{THRESHOLDS.LARGE_SOL_TRANSFER} SOL)</h3>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {largeTransactions.map((tx, index) => {
                // Amount is already used in formatSOL below
                const timestamp = tx.block_time || tx.blockTime;
                const src = tx.src || tx.from_address || '';
                const dst = tx.dst || tx.to_address || '';
                const fromInfo = getKnownWalletInfo(src);
                const toInfo = getKnownWalletInfo(dst);

                return (
                  <tr key={index} className="large-transfer">
                    <td>
                      <div>{formatDate(timestamp)}</div>
                      <div className="time-ago">{timeAgo(timestamp)}</div>
                    </td>
                    <td className="address" title={src}>
                      {fromInfo ?
                        <span className="known-address">{fromInfo.name}</span> :
                        formatAddress(src)
                      }
                    </td>
                    <td className="address" title={dst}>
                      {toInfo ?
                        <span className="known-address">{toInfo.name}</span> :
                        formatAddress(dst)
                      }
                    </td>
                    <td className="amount">{formatSOL(tx.lamport || tx.amount)} SOL</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WalletProfile;

