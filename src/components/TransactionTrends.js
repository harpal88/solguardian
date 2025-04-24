import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { formatSOL } from '../utils/formatUtils';
import { isExchange, isDEX, isWhale } from '../data/knownWallets';

// Helper function to safely check wallet types
const safeIsExchange = (address) => address && isExchange(address);
const safeIsDEX = (address) => address && isDEX(address);
const safeIsWhale = (address) => address && isWhale(address);

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

/**
 * Component for visualizing transaction trends over time
 */
const TransactionTrends = ({ transactions, walletAddress }) => {
  const [volumeData, setVolumeData] = useState(null);
  const [transactionCountData, setTransactionCountData] = useState(null);
  const [interactionData, setInteractionData] = useState(null);
  const [timeframeFilter, setTimeframeFilter] = useState('all'); // 'all', 'month', 'week', 'day'

  useEffect(() => {
    if (!transactions || transactions.length === 0) return;

    // Sort transactions by time
    const sortedTransactions = [...transactions].sort((a, b) =>
      (a.block_time || a.blockTime) - (b.block_time || b.blockTime)
    );

    // Apply timeframe filter
    let filteredTransactions = sortedTransactions;
    const now = Date.now() / 1000; // Current time in seconds

    if (timeframeFilter === 'month') {
      // Last 30 days
      filteredTransactions = sortedTransactions.filter(tx =>
        (tx.block_time || tx.blockTime) > now - (30 * 24 * 60 * 60)
      );
    } else if (timeframeFilter === 'week') {
      // Last 7 days
      filteredTransactions = sortedTransactions.filter(tx =>
        (tx.block_time || tx.blockTime) > now - (7 * 24 * 60 * 60)
      );
    } else if (timeframeFilter === 'day') {
      // Last 24 hours
      filteredTransactions = sortedTransactions.filter(tx =>
        (tx.block_time || tx.blockTime) > now - (24 * 60 * 60)
      );
    }

    // Group transactions by day
    const transactionsByDay = {};
    const volumeByDay = {};
    const exchangeInteractionsByDay = {};
    const dexInteractionsByDay = {};
    const whaleInteractionsByDay = {};

    filteredTransactions.forEach(tx => {
      const timestamp = tx.block_time || tx.blockTime;
      const date = new Date(timestamp * 1000);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Count transactions by day
      if (!transactionsByDay[dateString]) {
        transactionsByDay[dateString] = 0;
      }
      transactionsByDay[dateString]++;

      // Sum volume by day
      const amount = (tx.lamport || tx.amount) / 1000000000; // Convert to SOL
      if (!volumeByDay[dateString]) {
        volumeByDay[dateString] = 0;
      }
      volumeByDay[dateString] += amount;

      // Count interactions by type
      if (!exchangeInteractionsByDay[dateString]) {
        exchangeInteractionsByDay[dateString] = 0;
      }
      if (!dexInteractionsByDay[dateString]) {
        dexInteractionsByDay[dateString] = 0;
      }
      if (!whaleInteractionsByDay[dateString]) {
        whaleInteractionsByDay[dateString] = 0;
      }

      // Check source and destination for wallet types
      if (safeIsExchange(tx.src) || safeIsExchange(tx.dst)) {
        exchangeInteractionsByDay[dateString]++;
      }
      if (safeIsDEX(tx.src) || safeIsDEX(tx.dst)) {
        dexInteractionsByDay[dateString]++;
      }
      if (safeIsWhale(tx.src) || safeIsWhale(tx.dst)) {
        whaleInteractionsByDay[dateString]++;
      }
    });

    // Sort dates for charts
    const sortedDates = Object.keys(transactionsByDay).sort();

    // Prepare data for volume chart
    setVolumeData({
      labels: sortedDates,
      datasets: [
        {
          label: 'Transaction Volume (SOL)',
          data: sortedDates.map(date => volumeByDay[date] || 0),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          fill: true,
          tension: 0.4
        }
      ]
    });

    // Prepare data for transaction count chart
    setTransactionCountData({
      labels: sortedDates,
      datasets: [
        {
          label: 'Transaction Count',
          data: sortedDates.map(date => transactionsByDay[date] || 0),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          fill: true,
          tension: 0.4
        }
      ]
    });

    // Prepare data for interaction types chart
    setInteractionData({
      labels: sortedDates,
      datasets: [
        {
          label: 'Exchange Interactions',
          data: sortedDates.map(date => exchangeInteractionsByDay[date] || 0),
          backgroundColor: 'rgba(33, 150, 243, 0.7)',
        },
        {
          label: 'DEX Interactions',
          data: sortedDates.map(date => dexInteractionsByDay[date] || 0),
          backgroundColor: 'rgba(76, 175, 80, 0.7)',
        },
        {
          label: 'Whale Interactions',
          data: sortedDates.map(date => whaleInteractionsByDay[date] || 0),
          backgroundColor: 'rgba(156, 39, 176, 0.7)',
        }
      ]
    });

  }, [transactions, timeframeFilter, walletAddress]);

  // Chart options
  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.label.includes('Volume')) {
                label += formatSOL(context.parsed.y * 1000000000) + ' SOL';
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Value'
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count'
        },
        stacked: true
      }
    }
  };

  const handleTimeframeChange = (timeframe) => {
    setTimeframeFilter(timeframe);
  };

  return (
    <div className="transaction-trends">
      <h2>Transaction Trends</h2>

      <div className="timeframe-filters">
        <button
          className={timeframeFilter === 'all' ? 'active' : ''}
          onClick={() => handleTimeframeChange('all')}
        >
          All Time
        </button>
        <button
          className={timeframeFilter === 'month' ? 'active' : ''}
          onClick={() => handleTimeframeChange('month')}
        >
          Last 30 Days
        </button>
        <button
          className={timeframeFilter === 'week' ? 'active' : ''}
          onClick={() => handleTimeframeChange('week')}
        >
          Last 7 Days
        </button>
        <button
          className={timeframeFilter === 'day' ? 'active' : ''}
          onClick={() => handleTimeframeChange('day')}
        >
          Last 24 Hours
        </button>
      </div>

      {(!transactions || transactions.length === 0) ? (
        <div className="no-data-message">
          <p>No transaction data available for trend analysis.</p>
        </div>
      ) : (
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>Transaction Volume Over Time</h3>
            {volumeData ? (
              <Line data={volumeData} options={lineChartOptions} />
            ) : (
              <div className="loading-chart">Loading chart data...</div>
            )}
          </div>

          <div className="chart-wrapper">
            <h3>Transaction Count Over Time</h3>
            {transactionCountData ? (
              <Line data={transactionCountData} options={lineChartOptions} />
            ) : (
              <div className="loading-chart">Loading chart data...</div>
            )}
          </div>

          <div className="chart-wrapper">
            <h3>Interaction Types Over Time</h3>
            {interactionData ? (
              <Bar data={interactionData} options={barChartOptions} />
            ) : (
              <div className="loading-chart">Loading chart data...</div>
            )}
          </div>

          <div className="trend-insights">
            <h3>Trend Insights</h3>
            <ul>
              {volumeData && volumeData.datasets[0].data.length > 0 && (
                <li>
                  Total volume: {formatSOL(volumeData.datasets[0].data.reduce((sum, val) => sum + val, 0) * 1000000000)} SOL
                </li>
              )}
              {transactionCountData && transactionCountData.datasets[0].data.length > 0 && (
                <li>
                  Total transactions: {transactionCountData.datasets[0].data.reduce((sum, val) => sum + val, 0)}
                </li>
              )}
              {interactionData && interactionData.datasets[0].data.length > 0 && (
                <>
                  <li>
                    Exchange interactions: {interactionData.datasets[0].data.reduce((sum, val) => sum + val, 0)}
                  </li>
                  <li>
                    DEX interactions: {interactionData.datasets[1].data.reduce((sum, val) => sum + val, 0)}
                  </li>
                  <li>
                    Whale interactions: {interactionData.datasets[2].data.reduce((sum, val) => sum + val, 0)}
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTrends;
