# SolGuardian - Solscan Monitoring Masters Hackathon Submission

## Project Summary

SolGuardian is a real-time monitoring dashboard for tracking whale activity on the Solana blockchain. It provides comprehensive tools for analyzing wallet behavior, visualizing transaction flows, and detecting significant movements across the network.

## Problem Statement

Monitoring large transactions and whale activity on Solana is challenging due to:
- High transaction volume making it difficult to identify significant movements
- Lack of accessible tools for real-time monitoring of whale activity
- Difficulty in understanding transaction patterns and wallet behaviors

## Our Solution

SolGuardian addresses these challenges by providing:
1. A dedicated Whale Watchlist for tracking known large holders
2. Advanced wallet profiling with behavior tagging
3. Transaction flow visualization showing movement between wallets, exchanges, and DEXs
4. Real-time monitoring of large transactions with configurable thresholds

## Key Features

### Whale Watchlist
- Pre-populated list of known whale wallets
- Custom watchlist management
- Quick access to detailed transaction history

### Wallet Profiling
- Behavior analysis based on transaction patterns
- Metrics including average transfer size and frequency
- Visual indicators of wallet activity type

### Transaction Flow Analysis
- Visualization of token movement
- Categorization by destination type (exchanges, DEXs, whales)
- Percentage breakdown of incoming/outgoing flows

### Live Whale Tracker
- Real-time monitoring of large transactions
- Configurable thresholds and refresh intervals
- Automatic pause on significant activity detection

All these features are demonstrated in the video walkthrough.

## Technical Implementation

SolGuardian leverages Solscan's comprehensive APIs to fetch and analyze on-chain data:

- `/account/transfer` - For wallet transaction history
- `/account/token-accounts` - For token holdings
- `/transaction/last` - For real-time transaction monitoring
- `/token/defi/activities` - For DEX activity monitoring

Our application implements intelligent caching and pagination to minimize API calls while maintaining data freshness, and uses a configurable polling system for real-time updates without overwhelming the API.

## Impact & Relevance

SolGuardian enhances transparency and security in the Solana ecosystem by:

1. Making whale activity visible and trackable
2. Providing insights into transaction patterns and wallet behaviors
3. Enabling users to monitor significant movements that could impact the market
4. Demonstrating the accessibility of Solana's on-chain data through Solscan's APIs

## Demo & Links

- **Video Walkthrough**: A comprehensive demonstration of all features (Primary submission material)
- [Live Demo](https://harpal88.github.io/solguardian): Interactive application deployment
- [GitHub Repository](https://github.com/harpal88/solguardian): Source code and documentation

## Team

- Developer: Harpal Sinh
- Contact: harpalsinh7984@gmail.com

## Acknowledgments

- Solscan for providing the comprehensive APIs that power this application
- Solana Foundation for building an incredible blockchain ecosystem
- Solscan Monitoring Masters hackathon for the opportunity to showcase this project
