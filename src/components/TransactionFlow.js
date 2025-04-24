import React, { useEffect, useState } from 'react';
import { getKnownWalletInfo, isExchange, isDEX, isWhale } from '../data/knownWallets';
import { isLargeTransaction } from '../utils/walletUtils';
import { formatAddress, formatSOL, formatDate } from '../utils/formatUtils';
import { FaExchangeAlt, FaArrowRight, FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Component for visualizing transaction flows between wallets
 */
const TransactionFlow = ({ transactions, walletAddress }) => {
  const [flowData, setFlowData] = useState({
    incomingTotal: 0,
    outgoingTotal: 0,
    exchangeInflow: 0,
    exchangeOutflow: 0,
    dexInflow: 0,
    dexOutflow: 0,
    whaleInflow: 0,
    whaleOutflow: 0,
    unknownInflow: 0,
    unknownOutflow: 0,
    largeTransactions: 0,
    topSenders: [],
    topReceivers: [],
    recentLargeTransactions: []
  });

  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'month', 'week', 'day'

  useEffect(() => {
    if (!transactions || transactions.length === 0) return;

    // Apply time filter
    let filteredTransactions = [...transactions];
    const now = Date.now() / 1000; // Current time in seconds

    if (timeFilter === 'month') {
      // Last 30 days
      filteredTransactions = transactions.filter(tx => {
        const timestamp = tx.block_time || tx.blockTime;
        return timestamp > now - (30 * 24 * 60 * 60);
      });
    } else if (timeFilter === 'week') {
      // Last 7 days
      filteredTransactions = transactions.filter(tx => {
        const timestamp = tx.block_time || tx.blockTime;
        return timestamp > now - (7 * 24 * 60 * 60);
      });
    } else if (timeFilter === 'day') {
      // Last 24 hours
      filteredTransactions = transactions.filter(tx => {
        const timestamp = tx.block_time || tx.blockTime;
        return timestamp > now - (24 * 60 * 60);
      });
    }

    // Process transactions to calculate flow metrics
    let metrics = {
      incomingTotal: 0,
      outgoingTotal: 0,
      exchangeInflow: 0,
      exchangeOutflow: 0,
      dexInflow: 0,
      dexOutflow: 0,
      whaleInflow: 0,
      whaleOutflow: 0,
      unknownInflow: 0,
      unknownOutflow: 0,
      largeTransactions: 0,
      topSenders: [],
      topReceivers: [],
      recentLargeTransactions: []
    };

    // Track senders and receivers for top analysis
    const senders = {};
    const receivers = {};
    const largeTransactionsArray = [];

    // Helper function to safely check wallet types
    const safeIsExchange = (address) => address && isExchange(address);
    const safeIsDEX = (address) => address && isDEX(address);
    const safeIsWhale = (address) => address && isWhale(address);

    filteredTransactions.forEach(tx => {
      const amount = (tx.lamport || tx.amount) / 1000000000; // Convert to SOL
      const isIncoming = tx.dst === walletAddress;

      // Track total flows
      if (isIncoming) {
        metrics.incomingTotal += amount;

        // Track sender
        if (tx.src && tx.src !== walletAddress) {
          if (!senders[tx.src]) {
            senders[tx.src] = {
              address: tx.src,
              total: 0,
              count: 0,
              info: getKnownWalletInfo(tx.src)
            };
          }
          senders[tx.src].total += amount;
          senders[tx.src].count += 1;
        }

        // Categorize source
        if (safeIsExchange(tx.src)) {
          metrics.exchangeInflow += amount;
        } else if (safeIsDEX(tx.src)) {
          metrics.dexInflow += amount;
        } else if (safeIsWhale(tx.src)) {
          metrics.whaleInflow += amount;
        } else {
          metrics.unknownInflow += amount;
        }
      } else {
        metrics.outgoingTotal += amount;

        // Track receiver
        if (tx.dst && tx.dst !== walletAddress) {
          if (!receivers[tx.dst]) {
            receivers[tx.dst] = {
              address: tx.dst,
              total: 0,
              count: 0,
              info: getKnownWalletInfo(tx.dst)
            };
          }
          receivers[tx.dst].total += amount;
          receivers[tx.dst].count += 1;
        }

        // Categorize destination
        if (safeIsExchange(tx.dst)) {
          metrics.exchangeOutflow += amount;
        } else if (safeIsDEX(tx.dst)) {
          metrics.dexOutflow += amount;
        } else if (safeIsWhale(tx.dst)) {
          metrics.whaleOutflow += amount;
        } else {
          metrics.unknownOutflow += amount;
        }
      }

      // Track large transactions
      if (isLargeTransaction(amount)) {
        metrics.largeTransactions++;
        largeTransactionsArray.push({
          ...tx,
          amount: amount,
          isIncoming
        });
      }
    });

    // Sort and limit top senders/receivers
    metrics.topSenders = Object.values(senders)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    metrics.topReceivers = Object.values(receivers)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Sort large transactions by time (most recent first)
    metrics.recentLargeTransactions = largeTransactionsArray
      .sort((a, b) => (b.block_time || b.blockTime) - (a.block_time || a.blockTime))
      .slice(0, 5);

    setFlowData(metrics);
  }, [transactions, walletAddress, timeFilter]);

  // Calculate percentages for the flow visualization
  const totalVolume = flowData.incomingTotal + flowData.outgoingTotal;
  const getPercentage = (value) => totalVolume > 0 ? (value / totalVolume) * 100 : 0;

  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
  };

  return (
    <div className="transaction-flow">
      <h2>Transaction Flow Analysis</h2>

      <div className="time-filter-controls">
        <button
          className={timeFilter === 'all' ? 'active' : ''}
          onClick={() => handleTimeFilterChange('all')}
        >
          All Time
        </button>
        <button
          className={timeFilter === 'month' ? 'active' : ''}
          onClick={() => handleTimeFilterChange('month')}
        >
          Last 30 Days
        </button>
        <button
          className={timeFilter === 'week' ? 'active' : ''}
          onClick={() => handleTimeFilterChange('week')}
        >
          Last 7 Days
        </button>
        <button
          className={timeFilter === 'day' ? 'active' : ''}
          onClick={() => handleTimeFilterChange('day')}
        >
          Last 24 Hours
        </button>
      </div>

      <div className="flow-summary">
        <div className="flow-metric incoming">
          <div className="metric-icon"><FaArrowRight /></div>
          <div className="metric-value">{formatSOL(flowData.incomingTotal * 1000000000)}</div>
          <div className="metric-label">Total Incoming SOL</div>
        </div>

        <div className="flow-metric outgoing">
          <div className="metric-icon"><FaArrowLeft /></div>
          <div className="metric-value">{formatSOL(flowData.outgoingTotal * 1000000000)}</div>
          <div className="metric-label">Total Outgoing SOL</div>
        </div>

        <div className="flow-metric large">
          <div className="metric-icon"><FaExclamationTriangle /></div>
          <div className="metric-value">{flowData.largeTransactions}</div>
          <div className="metric-label">Large Transactions</div>
        </div>

        <div className="flow-metric net">
          <div className="metric-icon"><FaExchangeAlt /></div>
          <div className="metric-value">{formatSOL((flowData.incomingTotal - flowData.outgoingTotal) * 1000000000)}</div>
          <div className="metric-label">Net Flow</div>
        </div>
      </div>

      <div className="flow-visualization">
        <h3>Flow Distribution</h3>

        <div className="flow-section">
          <h4>Incoming Flows</h4>
          {flowData.incomingTotal > 0 ? (
            <div className="flow-bars">
              <div className="flow-bar">
                <div className="bar-label">From Exchanges</div>
                <div className="bar-container">
                  <div
                    className="bar exchange"
                    style={{ width: `${getPercentage(flowData.exchangeInflow)}%` }}
                  ></div>
                </div>
                <div className="bar-value">{formatSOL(flowData.exchangeInflow * 1000000000)} SOL</div>
              </div>

              <div className="flow-bar">
                <div className="bar-label">From DEXs</div>
                <div className="bar-container">
                  <div
                    className="bar dex"
                    style={{ width: `${getPercentage(flowData.dexInflow)}%` }}
                  ></div>
                </div>
                <div className="bar-value">{formatSOL(flowData.dexInflow * 1000000000)} SOL</div>
              </div>

              <div className="flow-bar">
                <div className="bar-label">From Whales</div>
                <div className="bar-container">
                  <div
                    className="bar whale"
                    style={{ width: `${getPercentage(flowData.whaleInflow)}%` }}
                  ></div>
                </div>
                <div className="bar-value">{formatSOL(flowData.whaleInflow * 1000000000)} SOL</div>
              </div>

              <div className="flow-bar">
                <div className="bar-label">From Others</div>
                <div className="bar-container">
                  <div
                    className="bar unknown"
                    style={{ width: `${getPercentage(flowData.unknownInflow)}%` }}
                  ></div>
                </div>
                <div className="bar-value">{formatSOL(flowData.unknownInflow * 1000000000)} SOL</div>
              </div>
            </div>
          ) : (
            <div className="no-data">No incoming transactions</div>
          )}
        </div>

        <div className="flow-section">
          <h4>Outgoing Flows</h4>
          {flowData.outgoingTotal > 0 ? (
            <div className="flow-bars">
              <div className="flow-bar">
                <div className="bar-label">To Exchanges</div>
                <div className="bar-container">
                  <div
                    className="bar exchange"
                    style={{ width: `${getPercentage(flowData.exchangeOutflow)}%` }}
                  ></div>
                </div>
                <div className="bar-value">{formatSOL(flowData.exchangeOutflow * 1000000000)} SOL</div>
              </div>

              <div className="flow-bar">
                <div className="bar-label">To DEXs</div>
                <div className="bar-container">
                  <div
                    className="bar dex"
                    style={{ width: `${getPercentage(flowData.dexOutflow)}%` }}
                  ></div>
                </div>
                <div className="bar-value">{formatSOL(flowData.dexOutflow * 1000000000)} SOL</div>
              </div>

              <div className="flow-bar">
                <div className="bar-label">To Whales</div>
                <div className="bar-container">
                  <div
                    className="bar whale"
                    style={{ width: `${getPercentage(flowData.whaleOutflow)}%` }}
                  ></div>
                </div>
                <div className="bar-value">{formatSOL(flowData.whaleOutflow * 1000000000)} SOL</div>
              </div>

              <div className="flow-bar">
                <div className="bar-label">To Others</div>
                <div className="bar-container">
                  <div
                    className="bar unknown"
                    style={{ width: `${getPercentage(flowData.unknownOutflow)}%` }}
                  ></div>
                </div>
                <div className="bar-value">{formatSOL(flowData.unknownOutflow * 1000000000)} SOL</div>
              </div>
            </div>
          ) : (
            <div className="no-data">No outgoing transactions</div>
          )}
        </div>
      </div>

      {/* Top Senders and Receivers */}
      <div className="top-entities-container">
        <div className="top-entities">
          <h3>Top Senders</h3>
          {flowData.topSenders.length > 0 ? (
            <table className="top-entities-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {flowData.topSenders.map((sender, index) => (
                  <tr key={index}>
                    <td className="address" title={sender.address}>
                      {sender.info ?
                        <span className="known-address">{sender.info.name}</span> :
                        formatAddress(sender.address)
                      }
                    </td>
                    <td>
                      {sender.info ?
                        <span className={`wallet-type ${sender.info.type}`}>
                          {sender.info.type.charAt(0).toUpperCase() + sender.info.type.slice(1)}
                        </span> :
                        'Unknown'
                      }
                    </td>
                    <td className="amount">{formatSOL(sender.total * 1000000000)} SOL</td>
                    <td>{sender.count} txns</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data">No incoming transactions</div>
          )}
        </div>

        <div className="top-entities">
          <h3>Top Receivers</h3>
          {flowData.topReceivers.length > 0 ? (
            <table className="top-entities-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {flowData.topReceivers.map((receiver, index) => (
                  <tr key={index}>
                    <td className="address" title={receiver.address}>
                      {receiver.info ?
                        <span className="known-address">{receiver.info.name}</span> :
                        formatAddress(receiver.address)
                      }
                    </td>
                    <td>
                      {receiver.info ?
                        <span className={`wallet-type ${receiver.info.type}`}>
                          {receiver.info.type.charAt(0).toUpperCase() + receiver.info.type.slice(1)}
                        </span> :
                        'Unknown'
                      }
                    </td>
                    <td className="amount">{formatSOL(receiver.total * 1000000000)} SOL</td>
                    <td>{receiver.count} txns</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data">No outgoing transactions</div>
          )}
        </div>
      </div>

      {/* Recent Large Transactions */}
      <div className="recent-large-transactions">
        <h3>Recent Large Transactions</h3>
        {flowData.recentLargeTransactions.length > 0 ? (
          <table className="large-transactions-table">
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
              {flowData.recentLargeTransactions.map((tx, index) => {
                const timestamp = tx.block_time || tx.blockTime;
                const fromInfo = getKnownWalletInfo(tx.src);
                const toInfo = getKnownWalletInfo(tx.dst);

                return (
                  <tr key={index} className="large-transfer">
                    <td>
                      <div>{formatDate(timestamp)}</div>
                    </td>
                    <td className="address" title={tx.src}>
                      {fromInfo ?
                        <span className="known-address">{fromInfo.name}</span> :
                        formatAddress(tx.src)
                      }
                    </td>
                    <td className="address" title={tx.dst}>
                      {toInfo ?
                        <span className="known-address">{toInfo.name}</span> :
                        formatAddress(tx.dst)
                      }
                    </td>
                    <td className="amount alert">
                      {formatSOL(tx.amount * 1000000000)} SOL ⚠️
                    </td>
                    <td>
                      {tx.isIncoming ?
                        <span className="incoming">Incoming</span> :
                        <span className="outgoing">Outgoing</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No large transactions found</div>
        )}
      </div>

      <div className="flow-insights">
        <h3>Flow Insights</h3>
        <ul>
          {flowData.exchangeOutflow > flowData.exchangeInflow && (
            <li>More SOL is being sent to exchanges than received from them, possibly indicating selling pressure.</li>
          )}

          {flowData.exchangeInflow > flowData.exchangeOutflow && (
            <li>More SOL is being received from exchanges than sent to them, possibly indicating accumulation.</li>
          )}

          {flowData.dexOutflow > 0 && flowData.dexInflow > 0 && (
            <li>Active trading on decentralized exchanges detected.</li>
          )}

          {flowData.whaleInflow > 0 && (
            <li>Received funds from known whale wallets, indicating possible interest from large holders.</li>
          )}

          {flowData.whaleOutflow > 0 && (
            <li>Sent funds to known whale wallets.</li>
          )}

          {flowData.largeTransactions > 3 && (
            <li>High number of large transactions detected, indicating significant activity.</li>
          )}

          {flowData.incomingTotal > flowData.outgoingTotal && (
            <li>Net positive flow of {formatSOL((flowData.incomingTotal - flowData.outgoingTotal) * 1000000000)} SOL, indicating accumulation.</li>
          )}

          {flowData.outgoingTotal > flowData.incomingTotal && (
            <li>Net negative flow of {formatSOL((flowData.outgoingTotal - flowData.incomingTotal) * 1000000000)} SOL, indicating distribution.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TransactionFlow;
