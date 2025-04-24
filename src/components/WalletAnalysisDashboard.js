import React, { useState } from 'react';
import EnhancedWalletProfile from './EnhancedWalletProfile';
import TokenFlowVisualization from './TokenFlowVisualization';
import './styles/wallet-analysis-dashboard.css';

/**
 * Wallet Analysis Dashboard Component
 * Combines enhanced wallet profiling and token flow visualization
 */
const WalletAnalysisDashboard = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  
  // Example known wallets for quick selection
  const exampleWallets = [
    { address: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg", label: "Solana Foundation" },
    { address: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG", label: "Binance" },
    { address: "3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5CE8nNELiId", label: "FTX" },
    { address: "J4ywFk5KySg31TjSxQAy7R3KvPg3XhTQZBASMdLJpKqF", label: "Alameda" }
  ];
  
  // Handle wallet search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim().length >= 32) {
      setWalletAddress(searchInput.trim());
    }
  };
  
  // Handle example wallet selection
  const selectExampleWallet = (address) => {
    setSearchInput(address);
    setWalletAddress(address);
  };
  
  return (
    <div className="wallet-analysis-dashboard">
      <div className="dashboard-header">
        <h1>Wallet Analysis Dashboard</h1>
        <p className="dashboard-description">
          Comprehensive analysis of wallet behavior, metrics, and token flow
        </p>
      </div>
      
      <div className="wallet-search-section">
        <form onSubmit={handleSearch} className="wallet-search-form">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter Solana wallet address"
            className="wallet-search-input"
          />
          <button 
            type="submit" 
            className="wallet-search-button"
            disabled={searchInput.trim().length < 32}
          >
            Analyze Wallet
          </button>
        </form>
        
        <div className="example-wallets">
          <div className="example-wallets-label">Or try an example:</div>
          <div className="example-wallet-buttons">
            {exampleWallets.map((wallet, index) => (
              <button
                key={index}
                onClick={() => selectExampleWallet(wallet.address)}
                className="example-wallet-button"
              >
                {wallet.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {walletAddress && (
        <div className="analysis-content">
          <div className="analysis-tabs">
            <button
              className={activeTab === 'profile' ? 'active' : ''}
              onClick={() => setActiveTab('profile')}
            >
              Wallet Profile
            </button>
            <button
              className={activeTab === 'flow' ? 'active' : ''}
              onClick={() => setActiveTab('flow')}
            >
              Token Flow
            </button>
          </div>
          
          <div className="tab-content">
            {activeTab === 'profile' && (
              <EnhancedWalletProfile address={walletAddress} />
            )}
            
            {activeTab === 'flow' && (
              <TokenFlowVisualization address={walletAddress} />
            )}
          </div>
        </div>
      )}
      
      {!walletAddress && (
        <div className="empty-state">
          <div className="empty-state-content">
            <h2>Enter a wallet address to begin analysis</h2>
            <p>
              The enhanced wallet profiling provides detailed metrics and insights about wallet behavior,
              while the token flow visualization shows how tokens move between this wallet and others.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletAnalysisDashboard;
