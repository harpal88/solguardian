import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { formatSOL, formatAddress } from '../utils/formatUtils';
import { getKnownWalletInfo } from '../data/knownWallets';
import { FaExclamationTriangle, FaSearch, FaFilter, FaCalendarAlt } from 'react-icons/fa';
import './styles/token-flow-visualization.css';

// Get API token from environment variables
const API_TOKEN = process.env.REACT_APP_SOLSCAN_API_KEY || "";

/**
 * Token Flow Visualization Component
 * Visualizes token movement between wallets with advanced filtering and analysis
 */
const TokenFlowVisualization = ({ address, timeRange = '7d' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [flowData, setFlowData] = useState(null);
  const [filters, setFilters] = useState({
    minAmount: 100, // Minimum SOL amount to include
    showExchanges: true,
    showDEX: true,
    showUnknown: true,
    timeRange: timeRange // '24h', '7d', '30d', 'all'
  });

  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // Fetch transaction data
  useEffect(() => {
    const fetchTransactionData = async () => {
      if (!address) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch transactions for the address
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
            "token": API_TOKEN
          }
        });

        const txData = txResponse.data.data || [];

        // Filter transactions based on time range
        const filteredTxs = filterTransactionsByTimeRange(txData, filters.timeRange);
        setTransactions(filteredTxs);

        // Process transactions into flow data
        const processedFlowData = processTransactionsIntoFlowData(filteredTxs, address);
        setFlowData(processedFlowData);

      } catch (error) {
        console.error("Error fetching transaction data:", error);
        setError("Failed to load transaction data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionData();
  }, [address, filters.timeRange]);

  // Filter transactions by time range
  const filterTransactionsByTimeRange = (transactions, range) => {
    if (range === 'all') return transactions;

    const now = Math.floor(Date.now() / 1000);
    let cutoffTime;

    switch (range) {
      case '24h':
        cutoffTime = now - (24 * 60 * 60);
        break;
      case '7d':
        cutoffTime = now - (7 * 24 * 60 * 60);
        break;
      case '30d':
        cutoffTime = now - (30 * 24 * 60 * 60);
        break;
      default:
        cutoffTime = now - (7 * 24 * 60 * 60); // Default to 7 days
    }

    return transactions.filter(tx => {
      const txTime = tx.block_time || tx.blockTime;
      return txTime >= cutoffTime;
    });
  };

  // Process transactions into flow data structure
  const processTransactionsIntoFlowData = (transactions, centralAddress) => {
    if (!transactions || transactions.length === 0) return null;

    // Create nodes and links for the flow diagram
    const nodes = new Map();
    const links = [];

    // Add central node (the address we're analyzing)
    const centralNodeInfo = getKnownWalletInfo(centralAddress) || { name: 'This Wallet' };
    nodes.set(centralAddress, {
      id: centralAddress,
      name: centralNodeInfo.name,
      type: 'central',
      value: 0,
      transactions: 0
    });

    // Process each transaction
    transactions.forEach(tx => {
      const amount = (tx.lamport || tx.amount) / 1000000000; // Convert to SOL

      // Skip transactions below minimum amount
      if (amount < filters.minAmount) return;

      const source = tx.src;
      const target = tx.dst;

      // Add source node if it doesn't exist
      if (!nodes.has(source)) {
        const sourceInfo = getKnownWalletInfo(source);
        nodes.set(source, {
          id: source,
          name: sourceInfo ? sourceInfo.name : formatAddress(source),
          type: determineNodeType(source, sourceInfo),
          value: 0,
          transactions: 0
        });
      }

      // Add target node if it doesn't exist
      if (!nodes.has(target)) {
        const targetInfo = getKnownWalletInfo(target);
        nodes.set(target, {
          id: target,
          name: targetInfo ? targetInfo.name : formatAddress(target),
          type: determineNodeType(target, targetInfo),
          value: 0,
          transactions: 0
        });
      }

      // Update node values
      const sourceNode = nodes.get(source);
      const targetNode = nodes.get(target);

      sourceNode.value += amount;
      targetNode.value += amount;
      sourceNode.transactions += 1;
      targetNode.transactions += 1;

      // Add link between nodes
      const existingLinkIndex = links.findIndex(link =>
        link.source === source && link.target === target
      );

      if (existingLinkIndex >= 0) {
        links[existingLinkIndex].value += amount;
        links[existingLinkIndex].transactions += 1;
      } else {
        links.push({
          source,
          target,
          value: amount,
          transactions: 1
        });
      }
    });

    // Apply filters
    const filteredNodes = Array.from(nodes.values()).filter(node => {
      if (node.type === 'central') return true;
      if (node.type === 'exchange' && !filters.showExchanges) return false;
      if (node.type === 'dex' && !filters.showDEX) return false;
      if (node.type === 'unknown' && !filters.showUnknown) return false;
      return true;
    });

    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));

    const filteredLinks = links.filter(link =>
      filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
    );

    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  };

  // Determine node type based on address and known info
  const determineNodeType = (address, knownInfo) => {
    if (!knownInfo) return 'unknown';

    const name = knownInfo.name.toLowerCase();

    if (name.includes('binance') ||
        name.includes('ftx') ||
        name.includes('kraken') ||
        name.includes('exchange')) {
      return 'exchange';
    }

    if (name.includes('raydium') ||
        name.includes('serum') ||
        name.includes('orca') ||
        name.includes('dex')) {
      return 'dex';
    }

    if (name.includes('foundation') ||
        name.includes('treasury')) {
      return 'treasury';
    }

    return 'wallet';
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Draw the flow visualization on canvas
  useEffect(() => {
    if (!flowData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set up simulation (in a real app, you would use D3.js or a similar library)
    // This is a simplified placeholder visualization

    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw central node
    const centralNode = flowData.nodes.find(node => node.type === 'central');
    if (centralNode) {
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fillStyle = '#2196F3';
      ctx.fill();
      ctx.strokeStyle = '#1976D2';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Central', centerX, centerY);

      // Draw other nodes in a circle around the central node
      const otherNodes = flowData.nodes.filter(node => node.type !== 'central');
      const radius = Math.min(width, height) * 0.4;
      const angleStep = (Math.PI * 2) / otherNodes.length;

      otherNodes.forEach((node, index) => {
        const angle = index * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // Store node position for interaction
        node.x = x;
        node.y = y;

        // Determine node color based on type
        let nodeColor;
        switch (node.type) {
          case 'exchange':
            nodeColor = '#FF9800';
            break;
          case 'dex':
            nodeColor = '#9C27B0';
            break;
          case 'treasury':
            nodeColor = '#4CAF50';
            break;
          default:
            nodeColor = '#757575';
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw node label
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name.substring(0, 10), x, y);

        // Draw links
        flowData.links.forEach(link => {
          if (link.source === centralNode.id && link.target === node.id) {
            // Outgoing link
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(244, 67, 54, 0.5)';
            ctx.lineWidth = Math.log(link.value) * 0.5;
            ctx.stroke();

            // Draw arrow
            const angle = Math.atan2(y - centerY, x - centerX);
            const arrowX = x - 15 * Math.cos(angle);
            const arrowY = y - 15 * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
              arrowX - 10 * Math.cos(angle - Math.PI/6),
              arrowY - 10 * Math.sin(angle - Math.PI/6)
            );
            ctx.lineTo(
              arrowX - 10 * Math.cos(angle + Math.PI/6),
              arrowY - 10 * Math.sin(angle + Math.PI/6)
            );
            ctx.closePath();
            ctx.fillStyle = 'rgba(244, 67, 54, 0.7)';
            ctx.fill();
          } else if (link.source === node.id && link.target === centralNode.id) {
            // Incoming link
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(centerX, centerY);
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.5)';
            ctx.lineWidth = Math.log(link.value) * 0.5;
            ctx.stroke();

            // Draw arrow
            const angle = Math.atan2(centerY - y, centerX - x);
            const arrowX = centerX - 15 * Math.cos(angle);
            const arrowY = centerY - 15 * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(
              arrowX - 10 * Math.cos(angle - Math.PI/6),
              arrowY - 10 * Math.sin(angle - Math.PI/6)
            );
            ctx.lineTo(
              arrowX - 10 * Math.cos(angle + Math.PI/6),
              arrowY - 10 * Math.sin(angle + Math.PI/6)
            );
            ctx.closePath();
            ctx.fillStyle = 'rgba(76, 175, 80, 0.7)';
            ctx.fill();
          }
        });
      });
    }

  }, [flowData]);

  // Handle canvas mouse move for node hovering
  const handleCanvasMouseMove = (e) => {
    if (!flowData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if mouse is over any node
    let hoveredNodeFound = null;

    flowData.nodes.forEach(node => {
      if (node.x && node.y) {
        const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
        if (distance <= 20) { // Node radius is 20
          hoveredNodeFound = node;
        }
      }
    });

    setHoveredNode(hoveredNodeFound);
  };

  // Handle canvas click for node selection
  const handleCanvasClick = (e) => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
    } else {
      setSelectedNode(null);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="token-flow-visualization loading-state">
        <div className="loading-spinner"></div>
        <p>Loading token flow data...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="token-flow-visualization error-state">
        <FaExclamationTriangle className="error-icon" />
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Render empty state
  if (!flowData || flowData.nodes.length <= 1) {
    return (
      <div className="token-flow-visualization empty-state">
        <p>No significant token flow data available for this wallet.</p>
        <p>Try adjusting the filters or time range.</p>
      </div>
    );
  }

  return (
    <div className="token-flow-visualization">
      <div className="visualization-header">
        <h2>Token Flow Visualization</h2>
        <p className="visualization-description">
          Visual representation of token movement between this wallet and other addresses
        </p>
      </div>

      <div className="visualization-filters">
        <div className="filter-group">
          <label>Minimum Amount:</label>
          <select
            value={filters.minAmount}
            onChange={(e) => handleFilterChange('minAmount', Number(e.target.value))}
          >
            <option value={10}>10 SOL</option>
            <option value={100}>100 SOL</option>
            <option value={1000}>1,000 SOL</option>
            <option value={10000}>10,000 SOL</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Time Range:</label>
          <div className="time-range-buttons">
            <button
              className={filters.timeRange === '24h' ? 'active' : ''}
              onClick={() => handleFilterChange('timeRange', '24h')}
            >
              24h
            </button>
            <button
              className={filters.timeRange === '7d' ? 'active' : ''}
              onClick={() => handleFilterChange('timeRange', '7d')}
            >
              7d
            </button>
            <button
              className={filters.timeRange === '30d' ? 'active' : ''}
              onClick={() => handleFilterChange('timeRange', '30d')}
            >
              30d
            </button>
            <button
              className={filters.timeRange === 'all' ? 'active' : ''}
              onClick={() => handleFilterChange('timeRange', 'all')}
            >
              All
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Show:</label>
          <div className="entity-filter-buttons">
            <button
              className={filters.showExchanges ? 'active' : ''}
              onClick={() => handleFilterChange('showExchanges', !filters.showExchanges)}
              title="Show/Hide Exchanges"
            >
              Exchanges
            </button>
            <button
              className={filters.showDEX ? 'active' : ''}
              onClick={() => handleFilterChange('showDEX', !filters.showDEX)}
              title="Show/Hide DEXes"
            >
              DEXes
            </button>
            <button
              className={filters.showUnknown ? 'active' : ''}
              onClick={() => handleFilterChange('showUnknown', !filters.showUnknown)}
              title="Show/Hide Unknown Wallets"
            >
              Unknown
            </button>
          </div>
        </div>
      </div>

      <div className="visualization-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
        ></canvas>

        {hoveredNode && (
          <div
            className="node-tooltip"
            style={{
              left: `${hoveredNode.x + 30}px`,
              top: `${hoveredNode.y}px`
            }}
          >
            <div className="tooltip-header">
              <span className={`node-type-indicator ${hoveredNode.type}`}></span>
              <span className="node-name">{hoveredNode.name}</span>
            </div>
            <div className="tooltip-body">
              <div className="tooltip-stat">
                <span className="stat-label">Total Value:</span>
                <span className="stat-value">{formatSOL(hoveredNode.value * 1000000000)} SOL</span>
              </div>
              <div className="tooltip-stat">
                <span className="stat-label">Transactions:</span>
                <span className="stat-value">{hoveredNode.transactions}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="node-details">
          <h3>
            <span className={`node-type-badge ${selectedNode.type}`}>
              {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
            </span>
            {selectedNode.name}
          </h3>

          <div className="node-stats">
            <div className="stat-card">
              <div className="stat-value">{formatSOL(selectedNode.value * 1000000000)}</div>
              <div className="stat-label">Total SOL</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{selectedNode.transactions}</div>
              <div className="stat-label">Transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {formatSOL((selectedNode.value / selectedNode.transactions) * 1000000000)}
              </div>
              <div className="stat-label">Avg. per Tx</div>
            </div>
          </div>

          <div className="node-transactions">
            <h4>Recent Transactions</h4>
            <div className="transactions-list">
              {transactions
                .filter(tx => tx.src === selectedNode.id || tx.dst === selectedNode.id)
                .slice(0, 5)
                .map((tx, index) => {
                  const amount = (tx.lamport || tx.amount) / 1000000000;
                  const isIncoming = tx.dst === address;

                  return (
                    <div key={index} className={`transaction-item ${isIncoming ? 'incoming' : 'outgoing'}`}>
                      <div className="transaction-direction">
                        {isIncoming ? 'Incoming' : 'Outgoing'}
                      </div>
                      <div className="transaction-amount">
                        {formatSOL(tx.lamport || tx.amount)} SOL
                      </div>
                      <a
                        href={`https://solscan.io/tx/${tx.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transaction-link"
                      >
                        View
                      </a>
                    </div>
                  );
                })}
            </div>

            {transactions.filter(tx => tx.src === selectedNode.id || tx.dst === selectedNode.id).length > 5 && (
              <div className="view-more-transactions">
                <a
                  href={`https://solscan.io/account/${selectedNode.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View all transactions on Solscan
                </a>
              </div>
            )}
          </div>

          <button className="close-details" onClick={() => setSelectedNode(null)}>
            Close
          </button>
        </div>
      )}

      <div className="visualization-legend">
        <div className="legend-title">Legend</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color central"></div>
            <div className="legend-label">Central Wallet</div>
          </div>
          <div className="legend-item">
            <div className="legend-color exchange"></div>
            <div className="legend-label">Exchange</div>
          </div>
          <div className="legend-item">
            <div className="legend-color dex"></div>
            <div className="legend-label">DEX</div>
          </div>
          <div className="legend-item">
            <div className="legend-color treasury"></div>
            <div className="legend-label">Treasury</div>
          </div>
          <div className="legend-item">
            <div className="legend-color wallet"></div>
            <div className="legend-label">Other Wallet</div>
          </div>
        </div>
        <div className="flow-legend">
          <div className="flow-item">
            <div className="flow-line outgoing"></div>
            <div className="flow-label">Outgoing</div>
          </div>
          <div className="flow-item">
            <div className="flow-line incoming"></div>
            <div className="flow-label">Incoming</div>
          </div>
        </div>
      </div>

      <div className="visualization-stats">
        <div className="stats-header">Flow Summary</div>
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-title">Total Transactions</div>
            <div className="stat-value">{transactions.length}</div>
          </div>
          <div className="stat-box">
            <div className="stat-title">Total Volume</div>
            <div className="stat-value">
              {formatSOL(transactions.reduce((sum, tx) => sum + (tx.lamport || tx.amount), 0))} SOL
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-title">Unique Addresses</div>
            <div className="stat-value">{flowData.nodes.length}</div>
          </div>
          <div className="stat-box">
            <div className="stat-title">Time Period</div>
            <div className="stat-value">
              {filters.timeRange === '24h' ? 'Last 24 Hours' :
               filters.timeRange === '7d' ? 'Last 7 Days' :
               filters.timeRange === '30d' ? 'Last 30 Days' : 'All Time'}
            </div>
          </div>
        </div>
      </div>

      <div className="visualization-note">
        <p>
          <strong>Note:</strong> This visualization shows token flow between wallets based on transaction history.
          The size of connections represents the volume of tokens transferred.
        </p>
      </div>
    </div>
  );
};

export default TokenFlowVisualization;
