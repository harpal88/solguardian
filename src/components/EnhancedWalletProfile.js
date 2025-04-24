import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatSOL, formatAddress, formatDate, timeAgo } from '../utils/formatUtils';
import { getKnownWalletInfo } from '../data/knownWallets';
import { 
  FaExclamationTriangle, FaArrowRight, FaChartLine, 
  FaExchangeAlt, FaCoins, FaPaintBrush, FaLock
} from 'react-icons/fa';
import './styles/enhanced-wallet-profile.css';

// Protocol icons mapping
const PROTOCOL_ICONS = {
  'dex': <FaExchangeAlt />,
  'nft': <FaPaintBrush />,
  'staking': <FaLock />,
  'token': <FaCoins />,
  'defi': <FaChartLine />
};

/**
 * Enhanced Wallet Profile Component
 * Provides detailed metrics and scoring for a wallet address
 */
const EnhancedWalletProfile = ({ address }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch wallet data and transactions
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!address) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch basic wallet info
        const walletInfoUrl = `https://pro-api.solscan.io/v2.0/account`;
        const walletInfoResponse = await axios.get(walletInfoUrl, {
          params: { address },
          headers: {
            "accept": "application/json",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NDUwNjUxNjg4NjAsImVtYWlsIjoiaGFycGFsc2luaDc5ODRAZ21haWwuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzQ1MDY1MTY4fQ.e-2IFl1ziEjHO4-g6f4PYEdc36aaccDnAPWi_bgOzNc"
          }
        });
        
        // Fetch recent transactions
        const txUrl = `https://pro-api.solscan.io/v2.0/account/transfer`;
        const txResponse = await axios.get(txUrl, {
          params: {
            address,
            page: 1,
            page_size: 100,
            sort_by: "block_time",
            sort_order: "desc"
          },
          headers: {
            "accept": "application/json",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NDUwNjUxNjg4NjAsImVtYWlsIjoiaGFycGFsc2luaDc5ODRAZ21haWwuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzQ1MDY1MTY4fQ.e-2IFl1ziEjHO4-g6f4PYEdc36aaccDnAPWi_bgOzNc"
          }
        });
        
        // Fetch token accounts
        const tokenAccountsUrl = `https://pro-api.solscan.io/v2.0/account/token-accounts`;
        const tokenResponse = await axios.get(tokenAccountsUrl, {
          params: {
            address,
            page: 1,
            page_size: 50
          },
          headers: {
            "accept": "application/json",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NDUwNjUxNjg4NjAsImVtYWlsIjoiaGFycGFsc2luaDc5ODRAZ21haWwuY29tIiwiYWN0aW9uIjoidG9rZW4tYXBpIiwiYXBpVmVyc2lvbiI6InYyIiwiaWF0IjoxNzQ1MDY1MTY4fQ.e-2IFl1ziEjHO4-g6f4PYEdc36aaccDnAPWi_bgOzNc"
          }
        });
        
        // Process wallet data
        const walletInfo = walletInfoResponse.data.data || {};
        const txData = txResponse.data.data || [];
        const tokenAccounts = tokenResponse.data.data || [];
        
        setWalletData({
          ...walletInfo,
          knownInfo: getKnownWalletInfo(address),
          tokenAccounts
        });
        
        setTransactions(txData);
        
        // Calculate metrics
        const calculatedMetrics = calculateWalletMetrics(address, txData, tokenAccounts);
        setMetrics(calculatedMetrics);
        
      } catch (error) {
        console.error("Error fetching wallet data:", error);
        setError("Failed to load wallet data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchWalletData();
  }, [address]);
  
  // Calculate wallet metrics from transaction data
  const calculateWalletMetrics = (address, transactions, tokenAccounts) => {
    if (!transactions || transactions.length === 0) {
      return {
        score: 0,
        avgTransferSize: 0,
        transferCount: 0,
        avgTimeBetweenTransfers: 0,
        tags: ['Inactive'],
        insightLevel: 'Basic',
        protocolInteractions: []
      };
    }
    
    // Calculate average transfer size
    let totalTransferAmount = 0;
    let incomingCount = 0;
    let outgoingCount = 0;
    let largeTransferCount = 0;
    
    // Track timestamps for time between transfers
    const timestamps = [];
    
    transactions.forEach(tx => {
      const amount = (tx.lamport || tx.amount) / 1000000000; // Convert to SOL
      totalTransferAmount += amount;
      
      if (tx.src === address) {
        outgoingCount++;
      } else if (tx.dst === address) {
        incomingCount++;
      }
      
      if (amount >= 1000) { // 1000 SOL threshold for large transfer
        largeTransferCount++;
      }
      
      timestamps.push(tx.block_time || tx.blockTime);
    });
    
    // Sort timestamps and calculate average time between transfers
    timestamps.sort((a, b) => a - b);
    let totalTimeBetween = 0;
    let timeIntervals = 0;
    
    for (let i = 1; i < timestamps.length; i++) {
      const timeDiff = timestamps[i] - timestamps[i-1];
      totalTimeBetween += timeDiff;
      timeIntervals++;
    }
    
    const avgTimeBetweenTransfers = timeIntervals > 0 ? totalTimeBetween / timeIntervals : 0;
    const avgTransferSize = transactions.length > 0 ? totalTransferAmount / transactions.length : 0;
    
    // Determine wallet tags based on metrics
    const tags = [];
    
    if (avgTransferSize > 5000) tags.push('🐋 Whale');
    else if (avgTransferSize > 1000) tags.push('🐬 Dolphin');
    else if (avgTransferSize > 100) tags.push('🐟 Fish');
    
    if (transactions.length > 50) tags.push('🔄 Active Trader');
    if (outgoingCount === 0 && incomingCount > 0) tags.push('💎 Holder');
    if (largeTransferCount > 5) tags.push('💰 High Value');
    if (avgTimeBetweenTransfers < 86400) tags.push('⚡ Frequent');
    
    // Calculate wallet score (0-10)
    let score = 0;
    
    // Factor 1: Transaction volume (0-3 points)
    if (transactions.length > 100) score += 3;
    else if (transactions.length > 50) score += 2;
    else if (transactions.length > 10) score += 1;
    
    // Factor 2: Average transfer size (0-3 points)
    if (avgTransferSize > 5000) score += 3;
    else if (avgTransferSize > 1000) score += 2;
    else if (avgTransferSize > 100) score += 1;
    
    // Factor 3: Activity frequency (0-2 points)
    if (avgTimeBetweenTransfers < 86400) score += 2; // Less than a day
    else if (avgTimeBetweenTransfers < 604800) score += 1; // Less than a week
    
    // Factor 4: Token diversity (0-2 points)
    if (tokenAccounts.length > 20) score += 2;
    else if (tokenAccounts.length > 5) score += 1;
    
    // Determine insight level
    let insightLevel = 'Basic';
    if (score >= 7) insightLevel = 'Advanced';
    else if (score >= 4) insightLevel = 'Intermediate';
    
    // Mock protocol interactions (in a real app, this would be determined from actual transaction data)
    const protocolInteractions = [
      { type: 'dex', name: 'Raydium', count: Math.floor(Math.random() * 20) + 1 },
      { type: 'dex', name: 'Orca', count: Math.floor(Math.random() * 15) },
      { type: 'nft', name: 'Magic Eden', count: Math.floor(Math.random() * 10) },
      { type: 'staking', name: 'Marinade', count: Math.floor(Math.random() * 5) },
      { type: 'defi', name: 'Solend', count: Math.floor(Math.random() * 8) }
    ].filter(p => p.count > 0);
    
    return {
      score: score,
      avgTransferSize,
      transferCount: transactions.length,
      incomingCount,
      outgoingCount,
      avgTimeBetweenTransfers,
      largeTransferCount,
      tags,
      insightLevel,
      protocolInteractions,
      tokenDiversity: tokenAccounts.length
    };
  };
  
  // Generate behavioral insights based on metrics
  const generateInsights = (metrics) => {
    if (!metrics) return [];
    
    const insights = [];
    
    // Transaction pattern insights
    if (metrics.incomingCount > metrics.outgoingCount * 3) {
      insights.push("This wallet primarily accumulates tokens with minimal outgoing transfers.");
    } else if (metrics.outgoingCount > metrics.incomingCount * 3) {
      insights.push("This wallet shows a distribution pattern with many outgoing transfers.");
    }
    
    if (metrics.avgTimeBetweenTransfers < 3600) {
      insights.push("Very active wallet with frequent transactions (multiple per hour).");
    } else if (metrics.avgTimeBetweenTransfers < 86400) {
      insights.push("Active wallet with daily transaction activity.");
    }
    
    if (metrics.largeTransferCount > 10) {
      insights.push("Regularly makes large transfers, indicating significant capital movement.");
    }
    
    if (metrics.tokenDiversity > 20) {
      insights.push("Highly diversified portfolio with many different tokens.");
    } else if (metrics.tokenDiversity < 3) {
      insights.push("Focused portfolio with few token types.");
    }
    
    // Add protocol-specific insights
    if (metrics.protocolInteractions.some(p => p.type === 'dex' && p.count > 10)) {
      insights.push("Frequent DEX user, likely an active trader.");
    }
    
    if (metrics.protocolInteractions.some(p => p.type === 'nft')) {
      insights.push("Participates in NFT markets.");
    }
    
    if (metrics.protocolInteractions.some(p => p.type === 'staking')) {
      insights.push("Engages in staking activities, suggesting longer-term holding strategy.");
    }
    
    return insights;
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="enhanced-wallet-profile loading-state">
        <div className="loading-spinner"></div>
        <p>Loading wallet profile...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="enhanced-wallet-profile error-state">
        <FaExclamationTriangle className="error-icon" />
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  
  // Render empty state
  if (!walletData || !metrics) {
    return (
      <div className="enhanced-wallet-profile empty-state">
        <p>No wallet data available. Please enter a valid Solana address.</p>
      </div>
    );
  }
  
  // Generate insights
  const insights = generateInsights(metrics);
  
  return (
    <div className="enhanced-wallet-profile">
      <div className="wallet-header">
        <div className="wallet-identity">
          <h2>
            {walletData.knownInfo ? walletData.knownInfo.name : 'Unknown Wallet'}
            <span className="wallet-address">{formatAddress(address)}</span>
          </h2>
          <div className="wallet-score-badge" title={`Wallet Score: ${metrics.score}/10`}>
            <span className="score-value">{metrics.score.toFixed(1)}</span>
            <span className="score-label">/10</span>
          </div>
        </div>
        
        <div className="wallet-tags">
          <div className="insight-level" data-level={metrics.insightLevel.toLowerCase()}>
            {metrics.insightLevel} Insight
          </div>
          {metrics.tags.map((tag, index) => (
            <span key={index} className="wallet-tag">{tag}</span>
          ))}
        </div>
      </div>
      
      <div className="tab-navigation">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'metrics' ? 'active' : ''} 
          onClick={() => setActiveTab('metrics')}
        >
          Detailed Metrics
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''} 
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button 
          className={activeTab === 'tokens' ? 'active' : ''} 
          onClick={() => setActiveTab('tokens')}
        >
          Token Holdings
        </button>
      </div>
      
      {activeTab === 'overview' && (
        <div className="wallet-overview">
          <div className="metrics-summary">
            <div className="metric-card">
              <h3>Transaction Activity</h3>
              <div className="metric-value">{metrics.transferCount}</div>
              <div className="metric-label">Total Transfers</div>
              <div className="metric-breakdown">
                <div>
                  <span className="metric-sublabel">Incoming:</span>
                  <span className="metric-subvalue">{metrics.incomingCount}</span>
                </div>
                <div>
                  <span className="metric-sublabel">Outgoing:</span>
                  <span className="metric-subvalue">{metrics.outgoingCount}</span>
                </div>
              </div>
            </div>
            
            <div className="metric-card">
              <h3>Average Transfer</h3>
              <div className="metric-value">{formatSOL(metrics.avgTransferSize * 1000000000)}</div>
              <div className="metric-label">SOL per Transfer</div>
              <div className="metric-breakdown">
                <div>
                  <span className="metric-sublabel">Large Transfers:</span>
                  <span className="metric-subvalue">{metrics.largeTransferCount}</span>
                </div>
              </div>
            </div>
            
            <div className="metric-card">
              <h3>Activity Frequency</h3>
              <div className="metric-value">
                {metrics.avgTimeBetweenTransfers < 3600 
                  ? `${Math.round(metrics.avgTimeBetweenTransfers / 60)} min` 
                  : metrics.avgTimeBetweenTransfers < 86400 
                    ? `${Math.round(metrics.avgTimeBetweenTransfers / 3600)} hrs` 
                    : `${Math.round(metrics.avgTimeBetweenTransfers / 86400)} days`}
              </div>
              <div className="metric-label">Between Transfers</div>
            </div>
            
            <div className="metric-card">
              <h3>Token Diversity</h3>
              <div className="metric-value">{metrics.tokenDiversity}</div>
              <div className="metric-label">Different Tokens</div>
            </div>
          </div>
          
          <div className="wallet-insights">
            <h3>Behavioral Insights</h3>
            {insights.length > 0 ? (
              <ul className="insights-list">
                {insights.map((insight, index) => (
                  <li key={index} className="insight-item">
                    <FaChartLine className="insight-icon" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-insights">Not enough data to generate insights.</p>
            )}
          </div>
          
          <div className="protocol-interactions">
            <h3>Protocol Interactions</h3>
            {metrics.protocolInteractions.length > 0 ? (
              <div className="protocol-list">
                {metrics.protocolInteractions.map((protocol, index) => (
                  <div key={index} className="protocol-item">
                    <div className="protocol-icon" data-type={protocol.type}>
                      {PROTOCOL_ICONS[protocol.type]}
                    </div>
                    <div className="protocol-details">
                      <div className="protocol-name">{protocol.name}</div>
                      <div className="protocol-count">{protocol.count} interactions</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-protocols">No protocol interactions detected.</p>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'metrics' && (
        <div className="detailed-metrics">
          <h3>Advanced Metrics</h3>
          
          <div className="metrics-grid">
            <div className="metric-detail">
              <div className="metric-name">Wallet Score</div>
              <div className="metric-chart">
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${metrics.score * 10}%` }}
                    data-score={metrics.score >= 7 ? 'high' : metrics.score >= 4 ? 'medium' : 'low'}
                  ></div>
                </div>
                <div className="score-value">{metrics.score.toFixed(1)}/10</div>
              </div>
              <div className="metric-explanation">
                Combined score based on transaction volume, size, frequency, and token diversity.
              </div>
            </div>
            
            <div className="metric-detail">
              <div className="metric-name">Transaction Volume</div>
              <div className="metric-value">{metrics.transferCount} transfers</div>
              <div className="metric-explanation">
                Total number of incoming and outgoing transfers for this wallet.
              </div>
            </div>
            
            <div className="metric-detail">
              <div className="metric-name">Average Transfer Size</div>
              <div className="metric-value">{formatSOL(metrics.avgTransferSize * 1000000000)} SOL</div>
              <div className="metric-explanation">
                Average amount of SOL transferred per transaction.
              </div>
            </div>
            
            <div className="metric-detail">
              <div className="metric-name">Transfer Direction Ratio</div>
              <div className="metric-chart">
                <div className="direction-ratio">
                  <div 
                    className="incoming-bar" 
                    style={{ 
                      width: `${metrics.incomingCount / (metrics.incomingCount + metrics.outgoingCount) * 100}%` 
                    }}
                  ></div>
                  <div 
                    className="outgoing-bar" 
                    style={{ 
                      width: `${metrics.outgoingCount / (metrics.incomingCount + metrics.outgoingCount) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="ratio-legend">
                  <div className="legend-item">
                    <div className="legend-color incoming"></div>
                    <div>Incoming ({metrics.incomingCount})</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color outgoing"></div>
                    <div>Outgoing ({metrics.outgoingCount})</div>
                  </div>
                </div>
              </div>
              <div className="metric-explanation">
                Ratio of incoming vs outgoing transfers, indicating accumulation or distribution patterns.
              </div>
            </div>
            
            <div className="metric-detail">
              <div className="metric-name">Activity Frequency</div>
              <div className="metric-value">
                {metrics.avgTimeBetweenTransfers < 3600 
                  ? `${Math.round(metrics.avgTimeBetweenTransfers / 60)} minutes` 
                  : metrics.avgTimeBetweenTransfers < 86400 
                    ? `${Math.round(metrics.avgTimeBetweenTransfers / 3600)} hours` 
                    : `${Math.round(metrics.avgTimeBetweenTransfers / 86400)} days`}
              </div>
              <div className="metric-explanation">
                Average time between consecutive transactions.
              </div>
            </div>
            
            <div className="metric-detail">
              <div className="metric-name">Large Transfers</div>
              <div className="metric-value">
                {metrics.largeTransferCount} transfers
                <span className="metric-percentage">
                  ({Math.round(metrics.largeTransferCount / metrics.transferCount * 100)}% of total)
                </span>
              </div>
              <div className="metric-explanation">
                Number of transfers greater than 1,000 SOL.
              </div>
            </div>
            
            <div className="metric-detail">
              <div className="metric-name">Token Diversity</div>
              <div className="metric-value">{metrics.tokenDiversity} tokens</div>
              <div className="metric-explanation">
                Number of different token types held by this wallet.
              </div>
            </div>
            
            <div className="metric-detail">
              <div className="metric-name">Protocol Engagement</div>
              <div className="metric-value">
                {metrics.protocolInteractions.length} protocols
              </div>
              <div className="metric-explanation">
                Number of different protocols this wallet has interacted with.
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'transactions' && (
        <div className="transactions-tab">
          <h3>Recent Transactions</h3>
          
          {transactions.length > 0 ? (
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((tx, index) => {
                  const timestamp = tx.block_time || tx.blockTime;
                  const amount = (tx.lamport || tx.amount) / 1000000000;
                  const isOutgoing = tx.src === address;
                  
                  return (
                    <tr key={index} className={isOutgoing ? 'outgoing' : 'incoming'}>
                      <td>
                        <div>{formatDate(timestamp)}</div>
                        <div className="time-ago">{timeAgo(timestamp)}</div>
                      </td>
                      <td className="tx-type">
                        {isOutgoing ? 'Outgoing' : 'Incoming'}
                      </td>
                      <td className="address" title={tx.src}>
                        {tx.src === address ? 'This Wallet' : formatAddress(tx.src)}
                      </td>
                      <td className="address" title={tx.dst}>
                        {tx.dst === address ? 'This Wallet' : formatAddress(tx.dst)}
                      </td>
                      <td className={`amount ${amount >= 1000 ? 'large' : ''}`}>
                        {formatSOL(tx.lamport || tx.amount)} SOL
                        {amount >= 1000 && <FaExclamationTriangle className="large-icon" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="no-transactions">
              <p>No transactions found for this wallet.</p>
            </div>
          )}
          
          {transactions.length > 20 && (
            <div className="view-more">
              <a 
                href={`https://solscan.io/account/${address}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View all {transactions.length} transactions on Solscan
              </a>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'tokens' && (
        <div className="tokens-tab">
          <h3>Token Holdings</h3>
          
          {walletData.tokenAccounts && walletData.tokenAccounts.length > 0 ? (
            <div className="token-holdings">
              <table className="tokens-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Balance</th>
                    <th>Value (est.)</th>
                  </tr>
                </thead>
                <tbody>
                  {walletData.tokenAccounts.map((token, index) => {
                    // In a real app, you would calculate the actual token amount based on decimals
                    // and fetch current prices to show USD value
                    const tokenAmount = token.amount || 0;
                    const tokenDecimals = token.decimals || 9;
                    const formattedAmount = (tokenAmount / Math.pow(10, tokenDecimals)).toFixed(4);
                    
                    return (
                      <tr key={index}>
                        <td className="token-name">
                          {token.symbol || 'Unknown Token'}
                          <span className="token-address">{formatAddress(token.mint || '')}</span>
                        </td>
                        <td className="token-balance">
                          {formattedAmount}
                        </td>
                        <td className="token-value">
                          {/* Mock value - in a real app, you would calculate this */}
                          ~${(Math.random() * 1000 * parseFloat(formattedAmount)).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-tokens">
              <p>No token holdings found for this wallet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedWalletProfile;
