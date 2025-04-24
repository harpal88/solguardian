import React, { useState, useEffect } from 'react';
import { WHALES, EXCHANGES, getKnownWalletInfo } from '../data/knownWallets';
import { formatAddress } from '../utils/formatUtils';
import { FaSearch, FaPlus, FaTrash, FaEye, FaStar, FaHistory, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Component for displaying and managing whale wallets to monitor
 */
const WhaleWatchlist = ({ onSelectWallet }) => {
  const [customWhales, setCustomWhales] = useState([]);
  const [newWhaleAddress, setNewWhaleAddress] = useState('');
  const [customName, setCustomName] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'whales', 'custom', 'favorites'
  const [favorites, setFavorites] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [recentlyMonitored, setRecentlyMonitored] = useState([]);
  const [monitoringWallet, setMonitoringWallet] = useState(null);

  // Load saved custom whales, favorites, and recently monitored from localStorage
  useEffect(() => {
    try {
      const savedWhales = localStorage.getItem('customWhales');
      if (savedWhales) {
        setCustomWhales(JSON.parse(savedWhales));
      }

      const savedFavorites = localStorage.getItem('favoriteWallets');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }

      const savedRecent = localStorage.getItem('recentlyMonitored');
      if (savedRecent) {
        setRecentlyMonitored(JSON.parse(savedRecent));
      } else {
        // Set default recently monitored wallets if none exist
        const defaultRecentlyMonitored = [
          "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
          "52C9T2T7JRojtxumYnYZhyUmrN7kqzvCLc4Ksvjk7TxD",
          "8BseXT9EtoEhBTKFFYkwTnjKSUZwhtmdKY2Jrj8j45Rt",
          "GitYucwpNcg6Dx1Y15UQ9TQn8LZMX1uuqQNn8rXxEWNC",
          "9QgXqrgdbVU8KcpfskqJpAXKzbaYQJecgMAruSWoXDkM"
        ];
        setRecentlyMonitored(defaultRecentlyMonitored);
        localStorage.setItem('recentlyMonitored', JSON.stringify(defaultRecentlyMonitored));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  // Save custom whales to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('customWhales', JSON.stringify(customWhales));
    } catch (error) {
      console.error('Error saving custom whales:', error);
    }
  }, [customWhales]);

  // Save favorites to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('favoriteWallets', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, [favorites]);

  // Combine predefined whales with custom added ones
  const allWallets = { ...WHALES, ...EXCHANGES };
  customWhales.forEach(whale => {
    if (!allWallets[whale.address]) {
      allWallets[whale.address] = whale;
    }
  });

  // Add default favorites if none exist
  useEffect(() => {
    if (favorites.length === 0) {
      const defaultFavorites = [
        "MJKqp326RZCHnAAbew9MDdui3iCKWco7fsK9sVuZTX2",
        "52C9T2T7JRojtxumYnYZhyUmrN7kqzvCLc4Ksvjk7TxD",
        "2W1VbazcNPxyMYAVebPac1zk1cvPXkujnPEby9JnC64Z"
      ];
      setFavorites(defaultFavorites);
    }
  }, [favorites.length]);

  // Filter wallets based on search term and filter type
  const filteredWallets = Object.entries(allWallets).filter(([address, wallet]) => {
    // Apply search filter
    const matchesSearch =
      searchTerm === '' ||
      wallet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wallet.notes && wallet.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // Apply type filter
    let matchesType = true;
    if (filterType === 'whales') {
      matchesType = wallet.type === 'whale';
    } else if (filterType === 'custom') {
      matchesType = customWhales.some(w => w.address === address);
    } else if (filterType === 'favorites') {
      matchesType = favorites.includes(address);
    }

    return matchesSearch && matchesType;
  });

  // Sort wallets: favorites first, then by name
  const sortedWallets = filteredWallets.sort((a, b) => {
    const aIsFavorite = favorites.includes(a[0]);
    const bIsFavorite = favorites.includes(b[0]);

    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;

    return a[1].name.localeCompare(b[1].name);
  });

  const handleAddWhale = () => {
    // Basic validation
    if (!newWhaleAddress || newWhaleAddress.trim() === '') {
      setError('Please enter a wallet address');
      return;
    }

    // Check if already in the list
    if (allWallets[newWhaleAddress]) {
      setError('This wallet is already in the watchlist');
      return;
    }

    // Solana address validation (basic)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(newWhaleAddress) || newWhaleAddress.length < 32 || newWhaleAddress.length > 44) {
      setError('Invalid wallet address format');
      return;
    }

    // Add to custom whales
    const newWhale = {
      address: newWhaleAddress,
      name: customName || `Custom Wallet (${formatAddress(newWhaleAddress)})`,
      type: 'whale',
      notes: customNotes || 'Custom added wallet',
      dateAdded: Date.now() / 1000
    };

    setCustomWhales([...customWhales, newWhale]);
    setNewWhaleAddress('');
    setCustomName('');
    setCustomNotes('');
    setError('');
    setShowAddForm(false);
  };

  const handleRemoveWhale = (address) => {
    setCustomWhales(customWhales.filter(whale => whale.address !== address));
    // Also remove from favorites if it was favorited
    if (favorites.includes(address)) {
      setFavorites(favorites.filter(addr => addr !== address));
    }
  };

  const toggleFavorite = (address) => {
    if (favorites.includes(address)) {
      setFavorites(favorites.filter(addr => addr !== address));
    } else {
      setFavorites([...favorites, address]);
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
  };

  // Handle monitoring a wallet
  const handleMonitorWallet = (address) => {
    setMonitoringWallet(address);

    // Add to recently monitored if not already there
    if (!recentlyMonitored.includes(address)) {
      const updatedRecent = [address, ...recentlyMonitored.slice(0, 4)]; // Keep only the 5 most recent
      setRecentlyMonitored(updatedRecent);

      // Save to localStorage
      try {
        localStorage.setItem('recentlyMonitored', JSON.stringify(updatedRecent));
      } catch (error) {
        console.error('Error saving recently monitored wallets:', error);
      }
    }

    // Call the parent component's handler
    onSelectWallet(address);

    // Reset monitoring state after a delay
    setTimeout(() => {
      setMonitoringWallet(null);
    }, 1000);
  };

  // Handle live monitoring of a wallet
  const handleLiveMonitorWallet = (address) => {
    // Add to recently monitored if not already there
    if (!recentlyMonitored.includes(address)) {
      const updatedRecent = [address, ...recentlyMonitored.slice(0, 4)]; // Keep only the 5 most recent
      setRecentlyMonitored(updatedRecent);

      // Save to localStorage
      try {
        localStorage.setItem('recentlyMonitored', JSON.stringify(updatedRecent));
      } catch (error) {
        console.error('Error saving recently monitored wallets:', error);
      }
    }

    // Call the parent component's handler with the address
    onSelectWallet(address);

    // Switch to the live tab (this will be handled in App.js)
    window.dispatchEvent(new CustomEvent('switchToLiveTab', { detail: { address } }));
  };

  return (
    <div className="whale-watchlist">
      <h2>Wallet Watchlist</h2>

      {recentlyMonitored.length > 0 && (
        <div className="recently-monitored">
          <h3><FaHistory /> Recently Monitored</h3>
          <div className="recent-wallets">
            {recentlyMonitored.map(address => {
              const walletInfo = allWallets[address] || { name: formatAddress(address) };
              return (
                <button
                  key={address}
                  className="recent-wallet-button"
                  onClick={() => handleMonitorWallet(address)}
                  title={address}
                >
                  {walletInfo.name}
                  {walletInfo.type && (
                    <span className={`wallet-type-indicator ${walletInfo.type}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="watchlist-controls">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search wallets..."
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button
            className={filterType === 'all' ? 'active' : ''}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button
            className={filterType === 'whales' ? 'active' : ''}
            onClick={() => handleFilterChange('whales')}
          >
            Whales
          </button>

          <button
            className={filterType === 'custom' ? 'active' : ''}
            onClick={() => handleFilterChange('custom')}
          >
            Custom
          </button>
          <button
            className={filterType === 'favorites' ? 'active' : ''}
            onClick={() => handleFilterChange('favorites')}
          >
            Favorites
          </button>
        </div>

        <button
          className="add-wallet-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <FaPlus /> Add Wallet
        </button>
      </div>

      {showAddForm && (
        <div className="add-whale-form">
          <div className="form-row">
            <input
              type="text"
              value={newWhaleAddress}
              onChange={(e) => setNewWhaleAddress(e.target.value)}
              placeholder="Enter wallet address *"
              className="full-width"
            />
          </div>
          <div className="form-row">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Custom name (optional)"
            />
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Notes (optional)"
            />
          </div>
          <div className="form-actions">
            <button onClick={handleAddWhale} className="submit-button">
              <FaPlus /> Add to Watchlist
            </button>
            <button onClick={() => setShowAddForm(false)} className="cancel-button">
              Cancel
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      )}

      <div className="whales-list">
        {sortedWallets.length === 0 ? (
          <div className="no-results">No wallets found matching your criteria</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Address</th>
                <th>Type</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedWallets.map(([address, wallet]) => {
                const isFavorite = favorites.includes(address);
                const isCustom = customWhales.some(w => w.address === address);

                return (
                  <tr key={address} className={isFavorite ? 'favorite-row' : ''}>
                    <td>
                      <button
                        className={`favorite-button ${isFavorite ? 'active' : ''}`}
                        onClick={() => toggleFavorite(address)}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <FaStar />
                      </button>
                    </td>
                    <td>{wallet.name}</td>
                    <td className="address" title={address}>{formatAddress(address)}</td>
                    <td>
                      <span className={`wallet-type ${wallet.type}`}>
                        {wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)}
                        {wallet.exchange && ` (${wallet.exchange})`}
                        {wallet.dex && ` (${wallet.dex})`}
                      </span>
                    </td>
                    <td>{wallet.notes || '-'}</td>
                    <td className="actions-cell">
                      <div className="action-buttons-group">
                        <div className="monitor-buttons">
                          <button
                            className={`action-button monitor ${monitoringWallet === address ? 'monitoring' : ''}`}
                            onClick={() => handleMonitorWallet(address)}
                            title="Monitor this wallet"
                            disabled={monitoringWallet === address}
                          >
                            <FaEye /> {monitoringWallet === address ? 'Monitoring...' : 'Monitor'}
                          </button>
                          <button
                            className="action-button live-monitor"
                            onClick={() => handleLiveMonitorWallet(address)}
                            title="Live monitor this wallet"
                          >
                            <FaEye /> Live
                          </button>
                        </div>
                        {isCustom && (
                          <button
                            className="action-button remove"
                            onClick={() => handleRemoveWhale(address)}
                            title="Remove from watchlist"
                          >
                            <FaTrash />
                          </button>
                        )}
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

export default WhaleWatchlist;
